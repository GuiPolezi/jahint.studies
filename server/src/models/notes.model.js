// Anotações de aula. O conteúdo (JSON do TipTap) só é carregado no GET
// individual — as listagens trazem apenas os metadados, como o frontend faz.
import { q } from '../config/db.js'
import { uid } from '../lib/ids.js'

const metaDTO = r => ({
  id: r.id, classId: r.classId, title: r.title, date: r.date, updatedAt: r.updatedAt,
})

export const listByUser = userId =>
  q(`SELECT n.id, n.class_id AS classId, n.title, n.note_date AS date,
            UNIX_TIMESTAMP(n.updated_at) * 1000 AS updatedAt
     FROM notes n
     JOIN classes c ON c.id = n.class_id
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE y.user_id = ?`, [userId]).then(rows => rows.map(metaDTO))

export const listByClass = classId =>
  q(`SELECT id, class_id AS classId, title, note_date AS date,
            UNIX_TIMESTAMP(updated_at) * 1000 AS updatedAt
     FROM notes WHERE class_id = ?
     ORDER BY note_date DESC, updated_at DESC`, [classId]).then(rows => rows.map(metaDTO))

export async function getNote(id) {
  const rows = await q(
    `SELECT id, class_id AS classId, title, note_date AS date, content,
            UNIX_TIMESTAMP(updated_at) * 1000 AS updatedAt
     FROM notes WHERE id = ?`, [id])
  if (!rows.length) return null
  const n = rows[0]
  return { ...metaDTO(n), content: n.content ? JSON.parse(n.content) : null }
}

export async function createNote(classId, { title, date }) {
  const id = uid()
  await q('INSERT INTO notes (id, class_id, title, note_date) VALUES (?, ?, ?, ?)',
    [id, classId, title, date])
  return getNote(id)
}

export async function updateNote(id, fields) {
  const map = { title: 'title', date: 'note_date', content: 'content' }
  const cols = Object.keys(fields).filter(k => map[k])
  if (!cols.length) return getNote(id)
  const sets = cols.map(k => `${map[k]} = ?`).join(', ')
  await q(`UPDATE notes SET ${sets} WHERE id = ?`, [...cols.map(k => fields[k]), id])
  return getNote(id)
}

export const deleteNote = id => q('DELETE FROM notes WHERE id = ?', [id])
