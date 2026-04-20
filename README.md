# 🚀 Comunidade Viewrs — Backend API

Backend seguro em **Node.js + Express + MongoDB** para a plataforma Comunidade Viewrs.

---

## 📁 Estrutura do Projeto

```
comunidade-viewrs-backend/
├── src/
│   ├── server.js          # Entry point — boot e graceful shutdown
│   ├── app.js             # Express + todos os middlewares de segurança
│   ├── config/
│   │   └── database.js    # Conexão MongoDB com connection pooling
│   ├── models/
│   │   ├── User.js        # Schema com hash de senha, lockout, sanitização
│   │   └── Streamer.js    # Schema de perfil de streamer
│   ├── controllers/
│   │   ├── auth.controller.js      # Register, Login, Refresh, Logout, Reset senha
│   │   ├── user.controller.js      # Perfil, atualização, troca de senha, delete
│   │   ├── token.controller.js     # Ganhar/gastar tokens (sistema de pontos)
│   │   ├── streamer.controller.js  # Go live / offline, listagem
│   │   └── ranking.controller.js  # Ranking paginado
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── token.routes.js
│   │   ├── streamer.routes.js
│   │   └── ranking.routes.js
│   ├── middleware/
│   │   ├── auth.js          # JWT authenticate + authorize por role
│   │   ├── validate.js      # express-validator (todas as regras)
│   │   ├── errorHandler.js  # Handler global de erros
│   │   └── notFound.js      # 404 handler
│   └── utils/
│       ├── jwt.js           # generateAccessToken, generateRefreshToken, verify
│       ├── logger.js        # Winston (console + arquivo)
│       └── AppError.js      # Classe de erro operacional
├── tests/
│   └── auth.test.js        # Testes de integração (Jest + Supertest)
├── .env.example
├── .gitignore
├── jest.config.js
└── package.json
```

---

## 🛡️ Camadas de Segurança Implementadas

| Camada | Tecnologia | O que protege |
|---|---|---|
| HTTP Headers | `helmet` | XSS, Clickjacking, MIME sniffing, CSP |
| CORS | `cors` | Origens não autorizadas |
| Rate Limiting | `express-rate-limit` | Brute force, DDoS |
| NoSQL Injection | `express-mongo-sanitize` | `$` e `.` em inputs |
| HTTP Param Pollution | `hpp` | Parâmetros duplicados na query |
| Autenticação | `jsonwebtoken` (RS256) | Access + Refresh token strategy |
| Senha | `bcryptjs` (12 rounds) | Rainbow tables, força bruta |
| Account Lockout | Model `User` | 5 tentativas → 30 min bloqueado |
| Input Validation | `express-validator` | SQL/NoSQL injection via formulários |
| Body Size Limit | `express.json({ limit: '10kb' })` | Payload bombing |
| Logs de Auditoria | `winston` | Rastreio de logins, erros, ações |
| Soft Delete | `isActive: false` | Preserva dados para auditoria |
| Graceful Shutdown | `SIGTERM/SIGINT` | Evita corrupção de dados |

---

## 🔑 Endpoints da API

### Auth — `/api/v1/auth`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/register` | ❌ | Cria conta (retorna tokens) |
| POST | `/login` | ❌ | Login (access + refresh cookie) |
| POST | `/refresh` | ❌ | Renova access token via cookie |
| POST | `/logout` | ✅ | Invalida cookie de refresh |
| POST | `/forgot-password` | ❌ | Solicita reset de senha |
| POST | `/reset-password/:token` | ❌ | Redefine senha |

### Usuários — `/api/v1/users`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/me` | ✅ | Retorna perfil do usuário logado |
| PATCH | `/me` | ✅ | Atualiza nickname/platform/url |
| PATCH | `/me/password` | ✅ | Troca senha |
| DELETE | `/me` | ✅ | Soft delete da conta |
| GET | `/:id` | ✅ Admin | Busca usuário por ID |

### Tokens — `/api/v1/tokens`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/balance` | ✅ | Saldo atual de tokens |
| POST | `/earn` | ✅ | Ganha tokens por assistir |
| POST | `/spend` | ✅ | Gasta 10 tokens para boostar |

### Streamers — `/api/v1/streamers`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | ❌ | Lista streamers ao vivo |
| PATCH | `/me/go-live` | ✅ | Marca como ao vivo |
| PATCH | `/me/go-offline` | ✅ | Encerra stream |

### Ranking — `/api/v1/ranking`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | ❌ | Top streamers por tokens |

---

## ⚙️ Setup e execução

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite o .env com seus valores reais
```

### 3. Gerar segredos JWT seguros
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Execute duas vezes — um para `JWT_SECRET`, outro para `JWT_REFRESH_SECRET`.

### 4. Executar
```bash
# Desenvolvimento (hot reload)
npm run dev

# Produção
npm start
```

### 5. Testes
```bash
npm test
```

---

## 🔒 Boas práticas de deploy

- Nunca commite o arquivo `.env`
- Use variáveis de ambiente do servidor (Railway, Render, AWS, etc.)
- Habilite `NODE_ENV=production`
- Use HTTPS em produção (Nginx + Let's Encrypt ou Cloudflare)
- Configure MongoDB Atlas com IP Whitelist
- Ative logs de auditoria em produção
- Configure alertas para tentativas de brute force nos logs

---

## 📦 Dependências principais

| Pacote | Versão | Função |
|---|---|---|
| express | ^4.19 | Framework web |
| mongoose | ^8.4 | ODM MongoDB |
| jsonwebtoken | ^9.0 | Autenticação JWT |
| bcryptjs | ^2.4 | Hash de senhas |
| helmet | ^7.1 | Segurança HTTP headers |
| express-rate-limit | ^7.3 | Rate limiting |
| express-mongo-sanitize | ^2.2 | Proteção NoSQL injection |
| express-validator | ^7.1 | Validação de inputs |
| hpp | ^0.2 | HTTP Parameter Pollution |
| winston | ^3.13 | Logging estruturado |
| cors | ^2.8 | CORS configurável |
