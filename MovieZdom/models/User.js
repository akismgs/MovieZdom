const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Το όνομα χρήστη είναι υποχρεωτικό'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Το email είναι υποχρεωτικό'],
        unique: true, 
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Ο κωδικός είναι υποχρεωτικός']
    },
    isVerified: {
        type: Boolean,
        default: false 
    },
    verificationToken: {
        type: String 
    },
    createdAt: {
        type: Date,
        default: Date.now,
        // Η MongoDB θα διαγράψει το έγγραφο 30 δευτερόλεπτα μετά το createdAt
        expires: 900 
    },
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        totalGames: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model('User', UserSchema);