// Anotações de aula (metadados + conteúdo TipTap).
import { reqString, optDate, optJsonContent } from '../lib/validate.js'
import * as Notes from '../models/notes.model.js'
import { assertClass, assertNote } from '../models/ownership.js'

export async function listByClass(req, res) {
  await assertClass(req.userId, req.params.classId)
  res.json({ notes: await Notes.listByClass(req.params.classId) })
}

export async function create(req, res) {
  await assertClass(req.userId, req.params.classId)
  const note = await Notes.createNote(req.params.classId, {
    title: reqString(req.body.title, 'título', { max: 200 }),
    date: optDate(req.body.date, 'data'),
  })
  res.status(201).json({ note })
}

export async function getOne(req, res) {
  await assertNote(req.userId, req.params.id)
  res.json({ note: await Notes.getNote(req.params.id) })
}

export async function update(req, res) {
  await assertNote(req.userId, req.params.id)
  const fields = {}
  if (req.body.title !== undefined) fields.title = reqString(req.body.title, 'título', { max: 200 })
  if (req.body.date !== undefined) fields.date = optDate(req.body.date, 'data')
  if (req.body.content !== undefined) fields.content = optJsonContent(req.body.content)
  const note = await Notes.updateNote(req.params.id, fields)
  res.json({ note })
}

export async function remove(req, res) {
  await assertNote(req.userId, req.params.id)
  await Notes.deleteNote(req.params.id)
  res.json({ ok: true })
}
