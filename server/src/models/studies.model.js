// Anos letivos, semestres, aulas e horários.
import { q, pool } from '../config/db.js'
import { uid } from '../lib/ids.js'

const hhmm = t => (t ? String(t).slice(0, 5) : t)

// ---------- anos ----------
export const listYears = userId =>
  q('SELECT id, number, calendar_year AS calendarYear FROM years WHERE user_id = ? ORDER BY number', [userId])

export async function createYear(userId, { number, calendarYear }) {
  const id = uid()
  await q('INSERT INTO years (id, user_id, number, calendar_year) VALUES (?, ?, ?, ?)',
    [id, userId, number, calendarYear])
  return { id, number, calendarYear }
}

export const updateYear = (id, { number, calendarYear }) =>
  q('UPDATE years SET number = ?, calendar_year = ? WHERE id = ?', [number, calendarYear, id])

export const deleteYear = id => q('DELETE FROM years WHERE id = ?', [id])

// ---------- semestres ----------
export const listSemesters = userId =>
  q(`SELECT s.id, s.year_id AS yearId, s.number
     FROM semesters s JOIN years y ON y.id = s.year_id
     WHERE y.user_id = ? ORDER BY y.number, s.number`, [userId])

export async function createSemester(yearId, number) {
  const id = uid()
  await q('INSERT INTO semesters (id, year_id, number) VALUES (?, ?, ?)', [id, yearId, number])
  return { id, yearId, number }
}

export const deleteSemester = id => q('DELETE FROM semesters WHERE id = ?', [id])

// ---------- aulas ----------
export async function listClasses(userId) {
  const classes = await q(
    `SELECT c.id, c.semester_id AS semesterId, c.name, c.professor, c.color
     FROM classes c
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE y.user_id = ?`, [userId])
  if (!classes.length) return []
  const slots = await q(
    `SELECT sl.class_id AS classId, sl.day, sl.start_time AS start, sl.end_time AS end
     FROM class_slots sl WHERE sl.class_id IN (?) ORDER BY sl.day, sl.start_time`,
    [classes.map(c => c.id)])
  const byClass = new Map(classes.map(c => [c.id, []]))
  for (const s of slots) byClass.get(s.classId)?.push({ day: s.day, start: hhmm(s.start), end: hhmm(s.end) })
  return classes.map(c => ({ ...c, slots: byClass.get(c.id) || [] }))
}

export async function getClass(classId) {
  const rows = await q(
    'SELECT id, semester_id AS semesterId, name, professor, color FROM classes WHERE id = ?', [classId])
  if (!rows.length) return null
  const slots = await q(
    `SELECT day, start_time AS start, end_time AS end FROM class_slots
     WHERE class_id = ? ORDER BY day, start_time`, [classId])
  return { ...rows[0], slots: slots.map(s => ({ day: s.day, start: hhmm(s.start), end: hhmm(s.end) })) }
}

export async function createClass(semesterId, { name, professor, color, slots }) {
  const id = uid()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      'INSERT INTO classes (id, semester_id, name, professor, color) VALUES (?, ?, ?, ?, ?)',
      [id, semesterId, name, professor, color])
    for (const s of slots)
      await conn.query(
        'INSERT INTO class_slots (class_id, day, start_time, end_time) VALUES (?, ?, ?, ?)',
        [id, s.day, s.start, s.end])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  return getClass(id)
}

export async function updateClass(classId, { name, professor, color, slots }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('UPDATE classes SET name = ?, professor = ?, color = ? WHERE id = ?',
      [name, professor, color, classId])
    // Horários são substituídos por completo (mesmo comportamento do frontend)
    await conn.query('DELETE FROM class_slots WHERE class_id = ?', [classId])
    for (const s of slots)
      await conn.query(
        'INSERT INTO class_slots (class_id, day, start_time, end_time) VALUES (?, ?, ?, ?)',
        [classId, s.day, s.start, s.end])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  return getClass(classId)
}

export const deleteClass = id => q('DELETE FROM classes WHERE id = ?', [id])
