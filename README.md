# MC Finance

Calculadora de despesas mensais com autenticação e persistência no banco de dados.

## Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Banco de Dados**: PostgreSQL (Neon via Vercel)
- **Sessão**: iron-session (cookie encriptado)
- **Auth**: bcryptjs (hash de senhas)

## Estrutura

```
├── public/              # Frontend (arquivos estáticos)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── api/                 # Backend (serverless functions)
│   ├── auth/
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── logout.js
│   │   └── me.js
│   ├── despesas.js
│   ├── settings.js
│   └── setup.js
├── lib/                 # Utilitários compartilhados
│   ├── db.js
│   └── session.js
├── .env.example
├── package.json
└── vercel.json
```

## Setup

1. Clone o repositório
2. Crie um projeto na [Vercel](https://vercel.com)
3. Adicione um banco **Postgres (Neon)** em Storage
4. Conecte o banco ao projeto
5. Adicione as variáveis de ambiente (ver `.env.example`)
6. Faça deploy
7. Crie as tabelas: `POST /api/setup` com `{"token": "SEU_SETUP_TOKEN"}`

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Fazer login |
| POST | `/api/auth/logout` | Encerrar sessão |
| GET | `/api/auth/me` | Verificar sessão |
| GET | `/api/despesas` | Listar despesas |
| POST | `/api/despesas` | Adicionar despesa |
| PUT | `/api/despesas` | Editar despesa |
| DELETE | `/api/despesas` | Remover despesa |
| GET | `/api/settings` | Obter configurações |
| PUT | `/api/settings` | Atualizar configurações |
| POST | `/api/setup` | Criar tabelas (uma vez) |
