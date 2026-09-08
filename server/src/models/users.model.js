import path from 'node:path'
import { q } from '../config/db.js'
import { uid } from '../lib/ids.js'

// Converte a linha do banco para o formato camelCase que o frontend usa
export function toUserDTO(row) {
  if (!row) return null
  return {
    id: row.id,
    fullName: row.full_name,
    nickname: row.nickname,
    email: row.email,
    age: row.age,
    institution: row.institution,
    course: row.course,
    // URL pública do avatar: só o nome do arquivo — o caminho em disco
    // (UPLOAD_DIR pode ser absoluto) nunca sai do servidor
    avatar: row.avatar_path ? `/uploads/avatars/${path.basename(row.avatar_path)}` : null,
    activeSemesterId: row.active_semester_id,
    createdAt: row.created_at,
  }
}

export const findByEmail = async email =>
  (await q('SELECT * FROM users WHERE email = ?', [email]))[0] || null

export const findById = async id =>
  (await q('SELECT * FROM users WHERE id = ?', [id]))[0] || null

export async function createUser({ fullName, nickname, email, passwordHash, age, institution, course }) {
  const id = uid()
  await q(
    `INSERT INTO users (id, full_name, nickname, email, password_hash, age, institution, course)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, fullName, nickname, email, passwordHash, age, institution, course]
  )
  return findById(id)
}

// Colunas que o updateUser aceita — defesa extra contra nomes de coluna
// vindos de fora (os controllers já usam chaves fixas)
const USER_COLS = new Set([
  'full_name', 'nickname', 'email', 'password_hash', 'age', 'institution',
  'course', 'avatar_path', 'active_semester_id', 'token_version',
])

export async function updateUser(id, fields) {
  // fields já validados: pares coluna → valor
  const cols = Object.keys(fields).filter(c => USER_COLS.has(c))
  if (!cols.length) return findById(id)
  const sets = cols.map(c => `${c} = ?`).join(', ')
  await q(`UPDATE users SET ${sets} WHERE id = ?`, [...cols.map(c => fields[c]), id])
  return findById(id)
}
