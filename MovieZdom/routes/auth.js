// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Lobby = require('../models/Lobby');
const nodemailer = require('nodemailer');

// Ρύθμιση του Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Έλεγχος σύνδεσης Email στην εκκίνηση
transporter.verify((error) => {
  if (error) console.log('❌ Email Error:', error.message);
  else console.log('📧 Email Server is ready');
});

// GET: Σελίδα Εγγραφής
router.get('/register', (req, res) => {
  res.render('register');
});

// POST: Διαδικασία Εγγραφής
// POST: Διαδικασία Εγγραφής
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, repeatPassword } = req.body;

    if (password !== repeatPassword) {
      req.flash('error', 'Οι κωδικοί δεν ταιριάζουν.');
      return res.redirect('/auth/register');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      req.flash('error', 'Το email χρησιμοποιείται ήδη.');
      return res.redirect('/auth/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verificationToken: token,
      isVerified: false,
      createdAt: new Date()
    });

    await newUser.save();

    // ΕΔΩ Η ΑΛΛΑΓΗ: Βγάζουμε το await και το URL το παίρνουμε δυναμικά
    const verificationUrl = `${req.protocol}://${req.get('host')}/auth/verify/${token}`; 
      
    transporter.sendMail({
      to: email,
      subject: 'Επιβεβαίωση Λογαριασμού',
      html: `<h3>Καλώς ήρθες!</h3>
             <p>Έχεις 15 λεπτά για να ενεργοποιήσεις το λογαριασμό σου:</p>
             <a href="${verificationUrl}">Πατήστε εδώ για ενεργοποίηση</a>`
    }).then(() => {
      console.log('📧 Email sent to:', email);
    }).catch(err => {
      console.log('❌ Mail failed but user was saved:', err.message);
    });

    // Ο χρήστης φεύγει αμέσως από τη σελίδα εγγραφής
    req.flash('success', 'Η εγγραφή έγινε! Ελέγξτε το email σας.');
    res.redirect('/auth/login');

  } catch (error) {
    console.error("Registration Error:", error);
    req.flash('error', 'Κάτι πήγε στραβά.');
    res.redirect('/auth/register');
  }
});

// GET: Επιβεβαίωση Email
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) {
      req.flash('error', 'Το link έληξε ή ο χρήστης διαγράφηκε.');
      return res.redirect('/auth/login');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.createdAt = undefined; // Σταματάει την αυτόματη διαγραφή (TTL)
    
    await user.save();

    req.flash('success', 'Ο λογαριασμός ενεργοποιήθηκε! Μπορείτε να συνδεθείτε.');
    res.redirect('/auth/login');
  } catch (error) {
    res.redirect('/auth/login');
  }
});

// GET: Σελίδα Login
router.get('/login', (req, res) => {
  if (req.query.deleted === 'success') {
    req.flash('success', 'Ο λογαριασμός σας διαγράφηκε επιτυχώς.');
  }
  res.render('login');
});

// POST: Διαδικασία Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'Λάθος στοιχεία σύνδεσης.');
      return res.redirect('/auth/login');
    }

    if (!user.isVerified) {
      req.flash('error', 'Ο λογαριασμός δεν έχει επιβεβαιωθεί.');
      return res.redirect('/auth/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Λάθος στοιχεία σύνδεσης.');
      return res.redirect('/auth/login');
    }

    req.session.userId = user._id;
    res.redirect('/dashboard');
  } catch (error) {
    req.flash('error', 'Σφάλμα διακομιστή.');
    res.redirect('/auth/login');
  }
});

// GET: Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/auth/login');
  });
});

// POST: Διαγραφή Λογαριασμού
router.post('/delete-account', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      req.flash('error', 'Δεν είστε συνδεδεμένος.');
      return res.redirect('/auth/login');
    }

    // Διαγραφή όλων των lobbies που έχει δημιουργήσει ο χρήστης
    await Lobby.deleteMany({ creator: userId });

    // Διαγραφή του χρήστη από όλα τα lobbies όπου είναι παίκτης
    await Lobby.updateMany(
      { players: userId },
      { $pull: { players: userId } }
    );

    // Διαγραφή του χρήστη
    await User.findByIdAndDelete(userId);

    // Καταστροφή session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/auth/login?deleted=success');
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    req.flash('error', 'Σφάλμα κατά τη διαγραφή του λογαριασμού.');
    res.redirect('/profile');
  }
});

module.exports = router;