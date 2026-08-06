<div align="center">

# 🎓 Jahint.Studies

**Plataforma completa de organização de estudos** — anos letivos, grade de aulas, anotações estilo Notion, trabalhos com prazos e provas com contagem regressiva, tudo num só lugar.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&labelColor=20232a)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&labelColor=20232a)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white&labelColor=20232a)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white&labelColor=20232a)
![MariaDB](https://img.shields.io/badge/MariaDB-10.5+-003545?logo=mariadb&logoColor=white&labelColor=20232a)
![JWT](https://img.shields.io/badge/Auth-JWT-d63aff?logo=jsonwebtokens&logoColor=white&labelColor=20232a)

</div>

---

## ✨ Funcionalidades

| | |
|---|---|
| 📊 **Dashboard inteligente** | Próximas datas, entregas atrasadas, aulas do dia e alertas de urgência — sempre no contexto do **semestre atual** |
| 🗂️ **Meus Estudos** | Anos letivos e semestres organizados como pastas, com grade semanal de aulas por dia e horário |
| 📝 **Anotações ricas** | Editor estilo Notion (TipTap): títulos, listas de tarefas, tabelas, imagens, cores e marca-texto, com **salvamento automático** |
| 💼 **Trabalhos & Tarefas** | Prazo, forma de entrega, integrantes do grupo, barra de progresso, abas de anotação e **anexos de arquivos** |
| 📄 **Provas** | P1, P2, substitutivas… com data, horário, conteúdo a estudar e contagem regressiva |
| 🔍 **Filtros por período** | Ano letivo **e** semestre em todas as telas — cada coisa no seu lugar |
| 👤 **Multiusuário** | Contas com senha criptografada (bcrypt) e dados isolados por usuário |
| ☁️ **Dados no servidor** | Acesse de qualquer computador — nada fica preso ao navegador |

## 🏗️ Arquitetura

```
jahint-studies/
├── src/                        # Frontend — React 18 + Vite
│   ├── components/             #   Telas e componentes (Dashboard, Trabalhos, Provas…)
│   ├── store/StoreProvider.jsx #   Estado global + sincronização com a API
│   └── lib/api.js              #   Cliente HTTP (JWT em todas as requisições)
│
└── server/                     # Backend — Node.js + Express
    └── src/
        ├── routes/             #   ~35 rotas REST (/api/…)
        ├── controllers/        #   Validação e regras de negócio
        ├── models/             #   SQL (mysql2) + verificação de propriedade
        ├── middleware/         #   Autenticação JWT e tratamento de erros
        ├── config/             #   Pool do banco e uploads (multer)
        └── setup/              #   schema.sql + migração automática
```

**Modelo de dados** — cada recurso pertence a um usuário através da cadeia:

```
users ──< years ──< semesters ──< classes ──< notes / works / exams
                                    │            works ──< members · tabs · attachments
                                    └──< class_slots (dias e horários)
```

Exclusões são em cascata no próprio banco (`ON DELETE CASCADE`): apagar um ano remove semestres, aulas, anotações, trabalhos e provas ligados a ele.

## 🚀 Como rodar

### Pré-requisitos

- **Node.js 18+**
- **MariaDB 10.5+** (ou MySQL 8)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # preencha DB_USER, DB_PASSWORD e gere um JWT_SECRET
npm run db:setup       # cria o banco e as 11 tabelas automaticamente
npm run dev            # API em http://localhost:3001
```

> 💡 Gere um segredo forte para o JWT:
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 2. Frontend

```bash
npm install
npm run dev            # abre em http://localhost:5173
```

Em desenvolvimento o frontend já aponta para `http://localhost:3001`. Para outro endereço, copie `.env.example` para `.env` e ajuste `VITE_API_URL`.

## 🔌 API

Autenticação via **JWT** (`Authorization: Bearer <token>`). Principais rotas:

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/register` · `/api/auth/login` | Criar conta / entrar |
| `GET` | `/api/me/data` | **Bootstrap**: todos os dados do usuário numa chamada |
| `POST/PUT/DELETE` | `/api/years` · `/api/semesters` · `/api/classes` | Estrutura acadêmica |
| `GET/POST/PUT/DELETE` | `/api/notes` · `/api/works` · `/api/exams` | Anotações, trabalhos e provas |
| `POST` | `/api/works/:id/attachments` | Upload de anexos (25 MB) |
| `GET` | `/api/attachments/:id/download` | Download autenticado |
| `GET` | `/api/health` | Health-check |

## 🛡️ Segurança

- Senhas com **bcrypt** — nunca em texto puro
- **Isolamento por usuário**: toda consulta valida a propriedade do recurso (acesso alheio → `404`)
- Anexos servidos apenas por rota autenticada, com nomes de arquivo aleatórios no disco
- Credenciais fora do código — tudo via `.env` (ignorado pelo git)
- CORS restrito à origem do frontend

## 🧰 Stack

**Frontend** · React 18 · Vite 5 · TipTap 2 (editor rico) · lucide-react · CSS puro com estética *Frutiger Aero* (vidro translúcido, gradientes aqua)

**Backend** · Node.js · Express 4 · mysql2 (SQL explícito, sem ORM) · JWT · bcryptjs · multer

## 📦 Deploy (VPS)

1. Ajuste o `server/.env`: credenciais do banco de produção, novo `JWT_SECRET` e `CORS_ORIGIN` com a URL pública do frontend
2. Rode `npm run db:setup` uma vez no servidor
3. Mantenha a API no ar com `pm2` atrás de um proxy reverso (nginx) com HTTPS
4. No frontend, defina `VITE_API_URL` e publique o resultado de `npm run build`
5. Inclua a pasta `server/uploads/` na rotina de backup — é onde vivem avatares e anexos

---

<div align="center">
<sub>Feito com ☕ e organização — <strong>Jahint.Studies</strong></sub>
</div>
