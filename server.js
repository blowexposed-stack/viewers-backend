'use strict';

// 1. Configurações iniciais e Variáveis de Ambiente
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 2. Importação do Modelo 
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

// Rota de Teste
app.get('/', (req, res) => {
  res.status(200).json({ mensagem: 'API Comunidade Viewers online!' });
});

// ROTA DE CADASTRO (Corrigida para bater com o index.html)
app.post('/auth/register', async (req, res) => {
  try {
    const { nickname, email, password, platform } = req.body;

    // Criando o registro baseado no que o front envia
    const novoStreamer = new Streamer({
      nome: nickname,
      url: email, // ou o campo que você definiu para a URL da live
      plataforma: platform || 'Twitch',
      // password: password // Se for salvar senha, lembre-se de usar bcrypt depois!
    });

    await novoStreamer.save();

    // O Frontend espera esse formato de resposta para logar o usuário
    res.status(201).json({ 
      success: true, 
      message: 'Cadastro realizado com sucesso!',
      token: 'token_gerado_pelo_backend', // O front precisa de um token para a sessão
      user: {
        nickname: nickname,
        tokens: 0
      }
    });
  } catch (err) {
    console.error('Erro ao cadastrar:', err);
    res.status(400).json({ 
      success: false, 
      message: 'Erro ao cadastrar. Verifique se os dados já existem.' 
    });
  }
});

// 6. Inicialização do Servidor
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
