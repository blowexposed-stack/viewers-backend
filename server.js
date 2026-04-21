'use strict';

// 1. Carrega as variáveis de ambiente do arquivo .env ou do painel do Render
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Importa o modelo que criamos (ajuste o caminho se o seu arquivo tiver outro nome)
const Streamer = require('./models/Streamer'); 

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições

// --- CONEXÃO COM O BANCO DE DADOS ---
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conexão com MongoDB estabelecida com sucesso!'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// --- ROTAS (Exemplo básico) ---
app.get('/', (req, res) => {
  res.send('API da Comunidade Viewrs está online!');
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
// O Render exige que você use process.env.PORT e o host '0.0.0.0'
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
