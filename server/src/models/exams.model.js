// Provas.
import { q } from '../config/db.js'
import { uid } from '../lib/ids.js'

const hhmm = t => (t ? String(t).slice(0, 5) : null)

const dto = r => ({
  id: r.id, classId: r.classId, label: r.label,
  date: r.date, time: hhmm(r.time), topics: r.topics,
  doneAt: r.doneAt ?? null,
})

export const listByUser = userId =>
  q(`SELECT e.id, e.class_id AS classId, e.label, e.exam_date AS date,
            e.exam_time AS time, e.topics,
            UNIX_TIMESTAMP(e.done_at) * 1000 AS doneAt
     FROM exams e
     JOIN classes c ON c.id = e.class_id
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE y.user_id = ?
     ORDER BY e.exam_date`, [userId]).then(rows => rows.map(dto))

export async function getExam(id) {
  const rows = await q(
    `SELECT id, class_id AS classId, label, exam_date AS date, exam_time AS time, topics,
            UNIX_TIMESTAMP(done_at) * 1000 AS doneAt
     FROM exams WHERE id = ?`, [id])
  return rows.length ? dto(rows[0]) : null
}

export async function createExam({ classId, label, date, time, topics }) {
  const id = uid()
  await q(
    'INSERT INTO exams (id, class_id, label, exam_date, exam_time, topics) VALUES (?, ?, ?, ?, ?, ?)',
    [id, classId, label, date, time, topics])
  return getExam(id)
}

export async function updateExam(id, { classId, label, date, time, topics }) {
  await q(
    `UPDATE exams SET class_id = ?, label = ?, exam_date = ?, exam_time = ?, topics = ?
     WHERE id = ?`,
    [classId, label, date, time, topics, id])
  return getExam(id)
}

// Marcar/desmarcar como realizada. O COALESCE preserva o carimbo original em
// cliques repetidos — a ação é idempotente.
export async function setExamDone(id, done) {
  await q(done
    ? 'UPDATE exams SET done_at = COALESCE(done_at, NOW()) WHERE id = ?'
    : 'UPDATE exams SET done_at = NULL WHERE id = ?', [id])
  return getExam(id)
}

export const deleteExam = id => q('DELETE FROM exams WHERE id = ?', [id])
