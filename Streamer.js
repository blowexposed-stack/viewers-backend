const mongoose = require('mongoose');

// Definindo a estrutura dos dados que serão salvos no banco
const streamerSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        trim: true
    },
    plataforma: {
        type: String,
        required: true,
        default: 'Twitch'
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    online: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Exportando o modelo para ser usado no server.js
module.exports = mongoose.model('Streamer', streamerSchema);