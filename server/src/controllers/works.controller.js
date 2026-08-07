// Trabalhos/tarefas + integrantes, abas e anexos.
import fs from 'node:fs'
import path from 'node:path'
import { bad, reqString, optString, optDate, reqInt, optJsonContent } from '../lib/validate.js'
import * as Works from '../models/works.model.js'
import { decodeFileName } from '../config/uploads.js'
import { assertClass, assertWork, assertWorkTab, getAttachment } from '../models/ownership.js'

const WORK_TYPES = ['tarefa', 'trabalho']

export async function list(req, res) {
  res.json({ works: await Works.listByUser(req.userId) })
}

export async function getOne(req, res) {
  await assertWork(req.userId, req.params.id)
  res.json({ work: await Works.getWork(req.params.id) })
}

export async function create(req, res) {
  const classId = reqString(req.body.classId, 'matéria', { max: 24 })
  await assertClass(req.userId, classId)
  const type = req.body.type ?? 'tarefa'
  if (!WORK_TYPES.includes(type)) bad('Tipo deve ser "tarefa" ou "trabalho".')
  const work = await Works.createWork({
    classId,
    title: reqString(req.body.title, 'título', { max: 200 }),
    type,
    dueDate: optDate(req.body.dueDate, 'data de entrega'),
    delivery: optString(req.body.delivery, 'forma de entrega', { max: 80 }),
  })
  res.status(201).json({ work })
}

export async function update(req, res) {
  await assertWork(req.userId, req.params.id)
  const b = req.body
  const fields = {}
  if (b.title !== undefined) fields.title = reqString(b.title, 'título', { max: 200 })
  if (b.type !== undefined) {
    if (!WORK_TYPES.includes(b.type)) bad('Tipo deve ser "tarefa" ou "trabalho".')
    fields.type = b.type
  }
  if (b.dueDate !== undefined) fields.dueDate = optDate(b.dueDate, 'data de entrega')
  if (b.delivery !== undefined) fields.delivery = optString(b.delivery, 'forma de entrega', { max: 80 })
  if (b.progress !== undefined) fields.progress = reqInt(b.progress, 'progresso', { min: 0, max: 100 })
  if (b.classId !== undefined) {
    await assertClass(req.userId, b.classId)
    fields.classId = b.classId
  }
  res.json({ work: await Works.updateWork(req.params.id, fields) })
}

export async function remove(req, res) {
  await assertWork(req.userId, req.params.id)
  // Apaga os arquivos anexados do disco antes do CASCADE limpar as linhas
  for (const p of await Works.listAttachmentPaths(req.params.id))
    fs.promises.unlink(p).catch(() => {})
  await Works.deleteWork(req.params.id)
  res.json({ ok: true })
}

// ---------- integrantes ----------
export async function addMember(req, res) {
  await assertWork(req.userId, req.params.id)
  const member = await Works.addMember(req.params.id, reqString(req.body.name, 'nome', { max: 120 }))
  res.status(201).json({ member })
}

export async function removeMember(req, res) {
  await assertWork(req.userId, req.params.id)
  await Works.deleteMember(req.params.id, Number(req.params.memberId))
  res.json({ ok: true })
}

// ---------- abas ----------
export async function addTab(req, res) {
  await assertWork(req.userId, req.params.id)
  const tab = await Works.addTab(req.params.id, reqString(req.body.title, 'título da aba', { max: 120 }))
  res.status(201).json({ tab })
}

export async function getTabContent(req, res) {
  await assertWorkTab(req.userId, req.params.id)
  res.json({ content: await Works.getTabContent(req.params.id) })
}

export async function updateTab(req, res) {
  await assertWorkTab(req.userId, req.params.id)
  const fields = {}
  if (req.body.title !== undefined) fields.title = reqString(req.body.title, 'título da aba', { max: 120 })
  if (req.body.content !== undefined) fields.content = optJsonContent(req.body.content)
  await Works.updateTab(req.params.id, fields)
  res.json({ ok: true })
}

export async function removeTab(req, res) {
  await assertWorkTab(req.userId, req.params.id)
  await Works.deleteTab(req.params.id)
  res.json({ ok: true })
}

// ---------- anexos ----------
export async function addAttachment(req, res) {
  await assertWork(req.userId, req.params.id)
  if (!req.file) bad('Envie um arquivo no campo "file".')
  const attachment = await Works.addAttachment(req.params.id, {
    fileName: decodeFileName(req.file.originalname),
    filePath: req.file.path,
    size: req.file.size,
    mime: req.file.mimetype || 'application/octet-stream',
  })
  res.status(201).json({ attachment })
}

export async function downloadAttachment(req, res) {
  const att = await getAttachment(req.userId, req.params.id)
  res.download(path.resolve(att.file_path), att.file_name)
}

export async function removeAttachment(req, res) {
  const att = await getAttachment(req.userId, req.params.id)
  fs.promises.unlink(att.file_path).catch(() => {})
  await Works.deleteAttachment(att.id)
  res.json({ ok: true })
}
