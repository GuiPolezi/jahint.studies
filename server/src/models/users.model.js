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
    avatar: row.avatar_path ? `/${row.avatar_path.replace(/\\/g, '/')}` : null,
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

export async function updateUser(id, fields) {
  // fields já validados: pares coluna → valor
  const cols = Object.keys(fields)
  if (!cols.length) return findById(id)
  const sets = cols.map(c => `${c} = ?`).join(', ')
  await q(`UPDATE users SET ${sets} WHERE id = ?`, [...cols.map(c => fields[c]), id])
  return findById(id)
}
