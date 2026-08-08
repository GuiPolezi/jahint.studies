// Anotações de aula (metadados + conteúdo TipTap + anexos).
import fs from 'node:fs'
import path from 'node:path'
import { bad, reqString, optDate, optJsonContent } from '../lib/validate.js'
import * as Notes from '../models/notes.model.js'
import { decodeFileName } from '../config/uploads.js'
import { assertClass, assertNote, getNoteAttachment } from '../models/ownership.js'

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
  // Apaga os arquivos do disco antes do CASCADE limpar as linhas
  for (const p of await Notes.listAttachmentPaths(req.params.id))
    fs.promises.unlink(p).catch(() => {})
  await Notes.deleteNote(req.params.id)
  res.json({ ok: true })
}

// ---------- anexos ----------
export async function addAttachment(req, res) {
  // O multer grava o arquivo no disco ANTES deste handler rodar. Sem o unlink
  // abaixo, um upload numa anotação inexistente ou de outro usuário devolvia
  // 404 e deixava o arquivo órfão no servidor para sempre.
  try {
    await assertNote(req.userId, req.params.id)
  } catch (err) {
    if (req.file) fs.promises.unlink(req.file.path).catch(() => {})
    throw err
  }
  if (!req.file) bad('Envie um arquivo no campo "file".')
  const attachment = await Notes.addAttachment(req.params.id, {
    fileName: decodeFileName(req.file.originalname),
    filePath: req.file.path,
    size: req.file.size,
    mime: req.file.mimetype || 'application/octet-stream',
  })
  res.status(201).json({ attachment })
}

export async function downloadAttachment(req, res) {
  const att = await getNoteAttachment(req.userId, req.params.id)
  res.download(path.resolve(att.file_path), att.file_name)
}

export async function removeAttachment(req, res) {
  const att = await getNoteAttachment(req.userId, req.params.id)
  fs.promises.unlink(att.file_path).catch(() => {})
  await Notes.deleteAttachment(att.id)
  res.json({ ok: true })
}
