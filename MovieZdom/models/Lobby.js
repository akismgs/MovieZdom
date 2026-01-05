const mongoose = require('mongoose');

const LobbySchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, default: "" }, // Προαιρετικό
    category: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    questions: Array, // Εδώ θα αποθηκεύσουμε τις 10 τυχαίες ερωτήσεις
    status: { type: String, default: "waiting" }, // waiting, playing, finished
    createdAt: { type: Date, default: Date.now, expires: 3600 } // Σβήνεται μετά από 1 ώρα
});

module.exports = mongoose.model('Lobby', LobbySchema);