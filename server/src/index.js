// Jahint.Studies API — Express + MariaDB/MySQL
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { requireAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/error.js'
import { UPLOAD_DIR } from './config/uploads.js'
import { pool } from './config/db.js'
import authRoutes from './routes/auth.routes.js'
import studiesRoutes from './routes/studies.routes.js'
import notesRoutes from './routes/notes.routes.js'
import worksRoutes from './routes/works.routes.js'
import examsRoutes from './routes/exams.routes.js'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
// Limite alto porque o conteúdo TipTap pode conter imagens base64
app.use(express.json({ limit: '20mb' }))

// Avatares são públicos (aparecem via <img src>); anexos de trabalhos NÃO —
// eles saem apenas pela rota autenticada /api/attachments/:id/download.
app.use('/uploads/avatars', express.static(path.join(UPLOAD_DIR, 'avatars')))

// Raiz e health-check: úteis para conferir no navegador se a API está no ar
app.get('/', (req, res) =>
  res.json({ app: 'Jahint.Studies API', status: 'online', health: '/api/health' }))
app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api', authRoutes)                    // register/login públicos, resto autenticado
app.use('/api', requireAuth, studiesRoutes)
app.use('/api', requireAuth, notesRoutes)
app.use('/api', requireAuth, worksRoutes)
app.use('/api', requireAuth, examsRoutes)

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }))
app.use(errorHandler)

const PORT = Number(process.env.PORT || 3001)

// Confere a conexão com o banco antes de aceitar requisições
pool.query('SELECT 1')
  .then(() => {
    app.listen(PORT, () => console.log(`✓ API rodando em http://localhost:${PORT}`))
  })
  .catch(err => {
    console.error('Não foi possível conectar ao banco de dados:', err.message)
    console.error('Confira as variáveis DB_* no arquivo .env e rode "npm run db:setup".')
    process.exit(1)
  })
