// Painel de Foco: o rascunho permanente de organização (um por usuário) e a
// preferência "abrir ao entrar". A linha só nasce no primeiro salvamento —
// até lá o usuário recebe os valores padrão (rascunho vazio, abrir ligado).
import { q } from '../config/db.js'

const DEFAULTS = { draft: '', autoOpen: true, updatedAt: null }

export async function getByUser(userId) {
  const rows = await q(
    `SELECT draft, auto_open AS autoOpen, UNIX_TIMESTAMP(updated_at) * 1000 AS updatedAt
     FROM focus_boards WHERE user_id = ?`, [userId])
  if (!rows.length) return { ...DEFAULTS }
  const r = rows[0]
  return { draft: r.draft ?? '', autoOpen: !!r.autoOpen, updatedAt: r.updatedAt ?? null }
}

// fields: { draft?, autoOpen? } já validados pelo controller.
// updated_at só muda junto com o draft: mexer no interruptor não é "editar o
// rascunho", e é essa data que aparece como "Editado em" no painel.
export async function update(userId, fields) {
  const map = { draft: 'draft', autoOpen: 'auto_open' }
  const cols = Object.keys(fields).filter(k => map[k])
  if (!cols.length) return getByUser(userId)
  // Garante a linha antes do UPDATE (INSERT IGNORE: já existe → não faz nada)
  await q('INSERT IGNORE INTO focus_boards (user_id) VALUES (?)', [userId])
  const sets = cols.map(k => `${map[k]} = ?`).join(', ') +
    ('draft' in fields ? ', updated_at = NOW()' : '')
  await q(`UPDATE focus_boards SET ${sets} WHERE user_id = ?`, [...cols.map(k => fields[k]), userId])
  return getByUser(userId)
}
