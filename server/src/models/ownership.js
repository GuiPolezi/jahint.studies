// Verificações de propriedade: garante que o recurso pertence ao usuário
// logado antes de qualquer leitura/escrita. A posse vem sempre da cadeia
// class → semester → year → user.
import { q } from '../config/db.js'
import { notFound } from '../lib/validate.js'

async function exists(sql, params) {
  const rows = await q(sql, params)
  return rows.length > 0
}

export async function assertYear(userId, yearId) {
  if (!(await exists('SELECT 1 FROM years WHERE id = ? AND user_id = ?', [yearId, userId])))
    notFound('Ano letivo não encontrado.')
}

export async function assertSemester(userId, semesterId) {
  if (!(await exists(
    `SELECT 1 FROM semesters s JOIN years y ON y.id = s.year_id
     WHERE s.id = ? AND y.user_id = ?`, [semesterId, userId])))
    notFound('Semestre não encontrado.')
}

export async function assertClass(userId, classId) {
  if (!(await exists(
    `SELECT 1 FROM classes c
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE c.id = ? AND y.user_id = ?`, [classId, userId])))
    notFound('Aula não encontrada.')
}

export async function assertNote(userId, noteId) {
  if (!(await exists(
    `SELECT 1 FROM notes n
     JOIN classes c ON c.id = n.class_id
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE n.id = ? AND y.user_id = ?`, [noteId, userId])))
    notFound('Anotação não encontrada.')
}

export async function assertWork(userId, workId) {
  if (!(await exists(
    `SELECT 1 FROM works w
     JOIN classes c ON c.id = w.class_id
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE w.id = ? AND y.user_id = ?`, [workId, userId])))
    notFound('Trabalho não encontrado.')
}

export async function assertExam(userId, examId) {
  if (!(await exists(
    `SELECT 1 FROM exams e
     JOIN classes c ON c.id = e.class_id
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE e.id = ? AND y.user_id = ?`, [examId, userId])))
    notFound('Prova não encontrada.')
}

export async function assertWorkTab(userId, tabId) {
  const rows = await q(
    `SELECT t.work_id FROM work_tabs t
     JOIN works w ON w.id = t.work_id
     JOIN classes c ON c.id = w.class_id
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE t.id = ? AND y.user_id = ?`, [tabId, userId])
  if (!rows.length) notFound('Aba não encontrada.')
  return rows[0].work_id
}

export async function getNoteAttachment(userId, attId) {
  const rows = await q(
    `SELECT a.* FROM note_attachments a
     JOIN notes n ON n.id = a.note_id
     JOIN classes c ON c.id = n.class_id
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE a.id = ? AND y.user_id = ?`, [attId, userId])
  if (!rows.length) notFound('Anexo não encontrado.')
  return rows[0]
}

export async function getAttachment(userId, attId) {
  const rows = await q(
    `SELECT a.* FROM work_attachments a
     JOIN works w ON w.id = a.work_id
     JOIN classes c ON c.id = w.class_id
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE a.id = ? AND y.user_id = ?`, [attId, userId])
  if (!rows.length) notFound('Anexo não encontrado.')
  return rows[0]
}
