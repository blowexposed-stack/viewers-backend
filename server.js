'use strict';

// 1. Configurações iniciais e Variáveis de Ambiente
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 2. Importação do Modelo 
// IMPORTANTE: O arquivo na sua pasta deve se chamar exatamente "Streamer.js"
const Streamer = require('./Streamer.js'); 

const app = express();

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Conexão com o MongoDB
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('ERRO: A variável MONGODB_URI não está definida no painel do Render!');
}

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
  .catch(err => {
    console.error('❌ Erro de conexão com o banco de dados:', err.message);
  });

// 5. Rotas
app.get('/', (req, res) => {
  res.status(200).json({ mensagem: 'API Comunidade Viewers online!' });
});

// 6. Inicialização do Servidor
// O Render exige a porta via variável de ambiente PORT
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
