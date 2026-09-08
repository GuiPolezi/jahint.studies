// Autenticação JWT: extrai o token do header "Authorization: Bearer <token>"
// e disponibiliza req.userId / req.user para as rotas protegidas.
import jwt from 'jsonwebtoken'
import * as Users from '../models/users.model.js'

const SECRET = process.env.JWT_SECRET
// Segredo curto ou igual ao do .env.example = qualquer um forja tokens
if (!SECRET || SECRET.length < 32 || /troque-este-valor/i.test(SECRET)) {
  console.error('ERRO: JWT_SECRET ausente, curto (mínimo 32 caracteres) ou igual ao do .env.example.')
  console.error('Gere um novo: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"')
  process.exit(1)
}

// O token carrega a versão da sessão (tv): trocar a senha incrementa
// users.token_version e invalida todos os tokens emitidos antes.
export function signToken(user) {
  return jwt.sign({ sub: user.id, tv: user.token_version ?? 0 }, SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES || '7d',
  })
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Não autenticado.' })

  let payload
  try {
    payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] })
  } catch {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Entre novamente.' })
  }

  try {
    // Conta apagada ou senha trocada depois da emissão → token não vale mais
    const user = await Users.findById(payload.sub)
    if (!user || (user.token_version ?? 0) !== (payload.tv ?? 0))
      return res.status(401).json({ error: 'Sessão inválida. Entre novamente.' })
    req.userId = user.id
    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}
