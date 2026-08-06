// Autenticação JWT: extrai o token do header "Authorization: Bearer <token>"
// e disponibiliza req.userId para as rotas protegidas.
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET
if (!SECRET) {
  console.error('ERRO: defina JWT_SECRET no arquivo .env')
  process.exit(1)
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' })
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })
  try {
    const payload = jwt.verify(token, SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Entre novamente.' })
  }
}
