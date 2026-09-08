// Jahint.Studies API — Express + MariaDB/MySQL
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { requireAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/error.js'
import { jsonBody } from './middleware/body.js'
import { UPLOAD_DIR } from './config/uploads.js'
import { pool } from './config/db.js'
import authRoutes from './routes/auth.routes.js'
import studiesRoutes from './routes/studies.routes.js'
import notesRoutes from './routes/notes.routes.js'
import worksRoutes from './routes/works.routes.js'
import examsRoutes from './routes/exams.routes.js'

const app = express()

// Atrás do nginx (proxy reverso) req.ip passa a ser o IP real do cliente —
// é a chave do rate limit. Sem proxy na frente, defina TRUST_PROXY=0 para
// que um header X-Forwarded-For forjado não conte como outro cliente.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))
app.disable('x-powered-by')

// Headers de segurança. A CSP aqui vale só para o que a API serve (JSON e
// avatares); a CSP da SPA fica no nginx. CORP cross-origin: os avatares são
// carregados por <img> a partir da origem do frontend.
app.use(helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'none'"], imgSrc: ["'self'"], frameAncestors: ["'none'"] },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))

// Rate limit: login/cadastro bem apertado (força bruta e spam de contas);
// o resto folgado, só para conter abuso automatizado.
const limiterDefaults = { standardHeaders: 'draft-7', legacyHeaders: false }
app.use('/api/auth', rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
}))
app.use('/api', rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 1000,
  limit: 300,
  message: { error: 'Muitas requisições. Aguarde um instante.' },
}))

// Corpo JSON: limite pequeno por padrão, grande só nas rotas do editor
app.use(jsonBody)

// Avatares são públicos (aparecem via <img src>); anexos de trabalhos NÃO —
// eles saem apenas pela rota autenticada /api/attachments/:id/download.
// nosniff + CSP sandbox: mesmo que um arquivo que não fosse imagem chegasse
// aqui, o navegador não o executaria como página na origem da API.
app.use('/uploads/avatars', express.static(path.join(UPLOAD_DIR, 'avatars'), {
  index: false,
  dotfiles: 'deny',
  setHeaders: res => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    res.setHeader('Cache-Control', 'public, max-age=86400')
  },
}))

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
