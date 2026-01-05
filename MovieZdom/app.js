require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

// Models
const User = require('./models/User');
const Lobby = require('./models/Lobby');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Φόρτωση ερωτήσεων
const allQuestions = JSON.parse(fs.readFileSync('./questions.json', 'utf-8'));
let gameStates = {}; 

// --- Σύνδεση στη MongoDB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Επιτυχής σύνδεση στη MongoDB!'))
  .catch(err => console.error('❌ Σφάλμα σύνδεσης στη βάση:', err));

// --- Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware); 

app.use(flash());
app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

const isAuth = (req, res, next) => {
  if (req.session.userId) next();
  else res.redirect('/auth/login');
};

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// --- ROUTES ---
app.get('/', (req, res) => res.redirect('/auth/login'));

app.get('/dashboard', isAuth, async (req, res) => {
  try {
    const lobbies = await Lobby.find({ status: 'waiting' }).populate('creator');
    const user = await User.findById(req.session.userId);
    res.render('dashboard', { user, lobbies });
  } catch (err) { res.redirect('/auth/login'); }
});

app.get('/profile', isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('profile', { user });
  } catch (err) { res.redirect('/dashboard'); }
});

app.get('/leaderboard', isAuth, async (req, res) => {
  try {
    const topUsers = await User.find({ 'stats.wins': { $exists: true } })
      .sort({ 'stats.wins': -1 })
      .limit(10)
      .select('username stats.wins stats.totalGames');
    res.render('leaderboard', { topUsers });
  } catch (err) { res.redirect('/dashboard'); }
});

app.get('/create-game', isAuth, (req, res) => res.render('create-game'));

app.post('/create-lobby', isAuth, async (req, res) => {
  try {
    const { name, password, category, difficulty } = req.body;
    const filtered = allQuestions.filter(q => q.category === category && q.difficulty === difficulty);
    const selected = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);

    const newLobby = new Lobby({
      name, password, category,
      creator: req.session.userId,
      players: [req.session.userId],
      questions: selected,
      status: 'waiting',
      createdAt: new Date()
    });

    await newLobby.save();
    req.session.allowedLobby = newLobby._id.toString(); 
    io.to('dashboard-room').emit('refreshLobbies');
    res.redirect(`/lobby/${newLobby._id}`);
  } catch (err) { res.redirect('/dashboard'); }
});

app.post('/delete-lobby/:id', isAuth, async (req, res) => {
  try {
    const lobby = await Lobby.findById(req.params.id);
    if (lobby && lobby.creator.toString() === req.session.userId) {
      await Lobby.findByIdAndDelete(req.params.id);
      io.to('dashboard-room').emit('refreshLobbies');
    }
    res.redirect('/dashboard');
  } catch (err) { res.redirect('/dashboard'); }
});

app.get('/join-lobby/:id', isAuth, async (req, res) => {
  try {
    const lobby = await Lobby.findById(req.params.id);
    if (!lobby) return res.redirect('/dashboard');

    if (lobby.password && lobby.password !== "" && req.session.allowedLobby !== lobby._id.toString()) {
      req.flash('error', 'Απαιτείται κωδικός.');
      return res.redirect('/dashboard');
    }

    if (!lobby.players.includes(req.session.userId)) {
      if (lobby.players.length >= 2) {
        req.flash('error', 'Το δωμάτιο είναι γεμάτο!');
        return res.redirect('/dashboard');
      }
      lobby.players.push(req.session.userId);
      await lobby.save();
      io.to('dashboard-room').emit('updateLobbyStatus', { id: lobby._id, count: lobby.players.length });
    }
    res.redirect(`/lobby/${lobby._id}`);
  } catch (err) { res.redirect('/dashboard'); }
});

app.post('/join-private', isAuth, async (req, res) => {
  const { lobbyId, password } = req.body;
  const lobby = await Lobby.findById(lobbyId);
  if (lobby && lobby.password === password) {
    req.session.allowedLobby = lobby._id.toString(); 
    res.redirect(`/join-lobby/${lobbyId}`);
  } else {
    req.flash('error', 'Λάθος κωδικός.');
    res.redirect('/dashboard');
  }
});

app.get('/lobby/:id', isAuth, async (req, res) => {
  try {
    const lobby = await Lobby.findById(req.params.id).populate('creator').populate('players');
    if (!lobby) return res.redirect('/dashboard');
    res.render('lobby', { lobby });
  } catch (err) { res.redirect('/dashboard'); }
});

// --- ΑΥΤΟΜΑΤΟ ΚΑΘΑΡΙΣΜΑ ΒΑΣΗΣ ---
setInterval(async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  try {
    const lobbiesToDelete = await Lobby.find({
      players: { $size: 0 },
      createdAt: { $lt: thirtyMinutesAgo }
    });
    if (lobbiesToDelete.length > 0) {
      await Lobby.deleteMany({ _id: { $in: lobbiesToDelete.map(l => l._id) } });
      io.to('dashboard-room').emit('refreshLobbies');
    }
  } catch (err) { console.error(err); }
}, 60000);

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
  const session = socket.request.session;

  socket.on('enterDashboard', () => {
    socket.join('dashboard-room');
  });

  socket.on('joinLobby', async (lobbyId) => {
    socket.join(lobbyId);
    socket.lobbyId = lobbyId; 
    socket.userId = session.userId;

    const lobby = await Lobby.findById(lobbyId).populate('players', 'username');
    if (lobby) {
      const playerNames = lobby.players.map(p => p.username);
      io.to(lobbyId).emit('playerJoined', { count: playerNames.length, players: playerNames });
      io.to('dashboard-room').emit('updateLobbyStatus', { id: lobbyId, count: lobby.players.length });

      if (lobby.players.length === 2) {
        io.to(lobbyId).emit('allPlayersReady');
      }
    }
  });

  socket.on('readyForFirstQuestion', (lobbyId) => {
    if (!gameStates[lobbyId]) {
      sendQuestion(lobbyId, 0);
    }
  });

  socket.on('submitAnswer', ({ lobbyId, answer }) => {
    const state = gameStates[lobbyId];
    if (!state || state.answers[socket.id]) return;

    state.answers[socket.id] = answer;
    
    const room = io.sockets.adapter.rooms.get(lobbyId);
    const numInRoom = room ? room.size : 0;

    if (Object.keys(state.answers).length >= numInRoom) {
      if (state.timer) clearTimeout(state.timer);
      setTimeout(() => {
        reveal(lobbyId, state.currentIndex);
      }, 500);
    }
  });

  socket.on('disconnect', async () => {
    if (socket.lobbyId && socket.userId) {
      await Lobby.findByIdAndUpdate(socket.lobbyId, { $pull: { players: socket.userId } });
      const lobby = await Lobby.findById(socket.lobbyId);
      const count = lobby ? lobby.players.length : 0;
      io.to(socket.lobbyId).emit('playerJoined', { 
        count: count, 
        players: lobby ? lobby.players.map(p => p.username) : [] 
      });
      io.to('dashboard-room').emit('updateLobbyStatus', { id: socket.lobbyId, count: count });
    }
  });
});

// --- GAME FUNCTIONS ---
async function sendQuestion(lobbyId, index) {
  const lobby = await Lobby.findById(lobbyId);
  
  if (gameStates[lobbyId] && gameStates[lobbyId].timer) {
    clearTimeout(gameStates[lobbyId].timer);
  }

  if (!lobby || index >= 10) {
    const state = gameStates[lobbyId];
    if (!state) return;

    // Υπολογισμός Νικητή & Ενημέρωση Stats
    const players = Object.keys(state.scores || {});
    const scoreP1 = state.scores[players[0]] || 0;
    const scoreP2 = state.scores[players[1]] || 0;

    const updateStats = async (socketId, outcome) => {
      const s = io.sockets.sockets.get(socketId);
      if (s && s.userId) {
        await User.findByIdAndUpdate(s.userId, {
          $inc: {
            'stats.totalGames': 1,
            'stats.wins': outcome === 'win' ? 1 : 0,
            'stats.losses': outcome === 'loss' ? 1 : 0,
            'stats.draws': outcome === 'draw' ? 1 : 0
          }
        });
      }
    };

    if (scoreP1 === scoreP2) {
      players.forEach(id => updateStats(id, 'draw'));
    } else {
      const winnerId = scoreP1 > scoreP2 ? players[0] : players[1];
      const loserId = scoreP1 > scoreP2 ? players[1] : players[0];
      await updateStats(winnerId, 'win');
      await updateStats(loserId, 'loss');
    }

    io.to(lobbyId).emit('gameOver', { scores: state.scores, draw: scoreP1 === scoreP2 });

    try {
      await Lobby.findByIdAndDelete(lobbyId);
      io.to('dashboard-room').emit('refreshLobbies');
      delete gameStates[lobbyId];
    } catch (err) { console.error(err); }
    return;
  }

  // Αρχικοποίηση scores στην πρώτη ερώτηση
  let currentScores = (index === 0) ? {} : gameStates[lobbyId].scores;

  gameStates[lobbyId] = { 
    answers: {}, 
    scores: currentScores,
    correct: lobby.questions[index].correctAnswer,
    currentIndex: index,
    timer: setTimeout(() => { 
      if (gameStates[lobbyId] && gameStates[lobbyId].currentIndex === index) {
        reveal(lobbyId, index); 
      }
    }, 10500)
  };

  io.to(lobbyId).emit('newQuestion', {
    question: lobby.questions[index].question,
    options: lobby.questions[index].options,
    index: index
  });
}

function reveal(lobbyId, index) {
  const state = gameStates[lobbyId];
  if (!state || state.revealed) return;

  state.revealed = true;
  if (state.timer) clearTimeout(state.timer);

  const clients = io.sockets.adapter.rooms.get(lobbyId);
  if (clients) {
    clients.forEach(socketId => {
      const playerAnswer = state.answers[socketId];
      const isCorrect = playerAnswer === state.correct;
      
      if (isCorrect) {
        state.scores[socketId] = (state.scores[socketId] || 0) + 1;
      }

      io.to(socketId).emit('revealResult', { 
        correctAnswer: state.correct,
        isCorrect: isCorrect 
      });
    });
  }

  setTimeout(() => {
    if (gameStates[lobbyId] && gameStates[lobbyId].currentIndex === index) {
      const nextIndex = index + 1;
      sendQuestion(lobbyId, nextIndex);
    }
  }, 5000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});