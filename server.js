'use strict';

// 1. Configurações iniciais e Variáveis de Ambiente
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 2. Importação do Modelo
// Se o seu arquivo se chama Streamer.js e está na mesma pasta:
const Streamer = require('./Streamer'); 

const app = express();

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Conexão com o MongoDB
// Certifique-se de que cadastrou MONGODB_URI no painel do Render!
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('ERRO: A variável MONGODB_URI não foi definida nas configurações do Render!');
}

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
  .catch(err => {
    console.error('❌ Erro de conexão com o banco de dados:');
    console.error(err);
  });

// 5. Rota de teste
app.get('/', (req, res) => {
  res.status(200).json({ mensagem: 'API Comunidade Viewrs online!' });
});

// 6. Inicialização do Servidor (Configuração específica para Deploy)
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
