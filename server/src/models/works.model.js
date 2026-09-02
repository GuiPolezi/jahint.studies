// Trabalhos/tarefas com integrantes, abas de anotação e anexos.
import { q, pool } from '../config/db.js'
import { uid } from '../lib/ids.js'

export const DEFAULT_WORK_TABS = ['Descrição', 'Rascunho', 'Desenvolvimento']

const workDTO = r => ({
  id: r.id, classId: r.classId, title: r.title, type: r.type,
  dueDate: r.dueDate, delivery: r.delivery, progress: r.progress,
  createdAt: r.createdAt,
  // Painel de Foco: trilha, ritmo e último salvamento de conteúdo das abas
  focus: r.focus ?? null,
  focusNote: r.focusNote ?? null,
  lastNoteAt: r.lastNoteAt ?? null,
})

// Colunas do trabalho nas consultas — sempre com o alias `w`, porque a
// subquery de lastNoteAt é correlacionada (MAX(updated_at) das abas dele)
const WORK_COLS = `
  w.id, w.class_id AS classId, w.title, w.type, w.due_date AS dueDate,
  w.delivery, w.progress, UNIX_TIMESTAMP(w.created_at) * 1000 AS createdAt,
  w.focus_lane AS focus, w.focus_note AS focusNote,
  (SELECT UNIX_TIMESTAMP(MAX(t.updated_at)) * 1000
     FROM work_tabs t WHERE t.work_id = w.id) AS lastNoteAt`

async function attachChildren(works) {
  if (!works.length) return works
  const ids = works.map(w => w.id)
  const [members, tabs, attachments] = await Promise.all([
    q('SELECT id, work_id AS workId, name FROM work_members WHERE work_id IN (?) ORDER BY id', [ids]),
    q('SELECT id, work_id AS workId, title, position FROM work_tabs WHERE work_id IN (?) ORDER BY position, id', [ids]),
    q(`SELECT id, work_id AS workId, file_name AS name, size_bytes AS size, mime_type AS type
       FROM work_attachments WHERE work_id IN (?)`, [ids]),
  ])
  const group = rows => {
    const m = new Map(ids.map(id => [id, []]))
    for (const r of rows) m.get(r.workId)?.push(r)
    return m
  }
  const mM = group(members), mT = group(tabs), mA = group(attachments)
  return works.map(w => ({
    ...w,
    members: (mM.get(w.id) || []).map(m => ({ id: m.id, name: m.name })),
    tabs: (mT.get(w.id) || []).map(t => ({ id: t.id, title: t.title })),
    attachments: (mA.get(w.id) || []).map(a => ({ id: a.id, name: a.name, size: a.size, type: a.type })),
  }))
}

export async function listByUser(userId) {
  const works = await q(
    `SELECT ${WORK_COLS}
     FROM works w
     JOIN classes c ON c.id = w.class_id
     JOIN semesters s ON s.id = c.semester_id
     JOIN years y ON y.id = s.year_id
     WHERE y.user_id = ?`, [userId])
  return attachChildren(works.map(workDTO))
}

export async function getWork(id) {
  const rows = await q(`SELECT ${WORK_COLS} FROM works w WHERE w.id = ?`, [id])
  if (!rows.length) return null
  return (await attachChildren([workDTO(rows[0])]))[0]
}

export async function createWork({ classId, title, type, dueDate, delivery }) {
  const id = uid()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      `INSERT INTO works (id, class_id, title, type, due_date, delivery)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, classId, title, type, dueDate, delivery])
    // Abas padrão, como no frontend
    for (let i = 0; i < DEFAULT_WORK_TABS.length; i++)
      await conn.query('INSERT INTO work_tabs (id, work_id, title, position) VALUES (?, ?, ?, ?)',
        [uid(), id, DEFAULT_WORK_TABS[i], i])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  return getWork(id)
}

export async function updateWork(id, fields) {
  const map = {
    title: 'title', type: 'type', dueDate: 'due_date', delivery: 'delivery', progress: 'progress',
    classId: 'class_id', focus: 'focus_lane', focusNote: 'focus_note',
  }
  const cols = Object.keys(fields).filter(k => map[k])
  if (!cols.length) return getWork(id)
  const sets = cols.map(k => `${map[k]} = ?`).join(', ')
  await q(`UPDATE works SET ${sets} WHERE id = ?`, [...cols.map(k => fields[k]), id])
  return getWork(id)
}

export const deleteWork = id => q('DELETE FROM works WHERE id = ?', [id])

// ---------- integrantes ----------
export async function addMember(workId, name) {
  const [res] = await pool.query('INSERT INTO work_members (work_id, name) VALUES (?, ?)', [workId, name])
  return { id: res.insertId, name }
}

export const deleteMember = (workId, memberId) =>
  q('DELETE FROM work_members WHERE id = ? AND work_id = ?', [memberId, workId])

// ---------- abas ----------
export async function addTab(workId, title) {
  const id = uid()
  const rows = await q('SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM work_tabs WHERE work_id = ?', [workId])
  await q('INSERT INTO work_tabs (id, work_id, title, position) VALUES (?, ?, ?, ?)',
    [id, workId, title, rows[0].pos])
  return { id, title }
}

export async function getTabContent(tabId) {
  const rows = await q('SELECT content FROM work_tabs WHERE id = ?', [tabId])
  return rows.length && rows[0].content ? JSON.parse(rows[0].content) : null
}

export async function updateTab(tabId, fields) {
  const map = { title: 'title', content: 'content' }
  const cols = Object.keys(fields).filter(k => map[k])
  if (!cols.length) return
  // Só o conteúdo carimba updated_at: é o "última anotação" do Painel de Foco
  const sets = cols.map(k => `${map[k]} = ?`).join(', ') +
    ('content' in fields ? ', updated_at = NOW()' : '')
  await q(`UPDATE work_tabs SET ${sets} WHERE id = ?`, [...cols.map(k => fields[k]), tabId])
}

export const deleteTab = tabId => q('DELETE FROM work_tabs WHERE id = ?', [tabId])

// ---------- anexos ----------
export const listAttachmentPaths = workId =>
  q('SELECT file_path AS filePath FROM work_attachments WHERE work_id = ?', [workId])
    .then(rows => rows.map(r => r.filePath))

export async function addAttachment(workId, { fileName, filePath, size, mime }) {
  const id = uid()
  await q(
    `INSERT INTO work_attachments (id, work_id, file_name, file_path, size_bytes, mime_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, workId, fileName, filePath, size, mime])
  return { id, name: fileName, size, type: mime }
}

export const deleteAttachment = id => q('DELETE FROM work_attachments WHERE id = ?', [id])
