// Provas.
import { reqString, optString, reqDate, optTime } from '../lib/validate.js'
import * as Exams from '../models/exams.model.js'
import { assertClass, assertExam } from '../models/ownership.js'

const payload = async (req) => {
  const classId = reqString(req.body.classId, 'matéria', { max: 24 })
  await assertClass(req.userId, classId)
  return {
    classId,
    label: reqString(req.body.label, 'tipo de prova', { max: 60 }),
    date: reqDate(req.body.date, 'data'),
    time: optTime(req.body.time, 'horário'),
    topics: optString(req.body.topics, 'conteúdo', { max: 65000 }),
  }
}

export async function list(req, res) {
  res.json({ exams: await Exams.listByUser(req.userId) })
}

export async function create(req, res) {
  const exam = await Exams.createExam(await payload(req))
  res.status(201).json({ exam })
}

export async function update(req, res) {
  await assertExam(req.userId, req.params.id)
  const exam = await Exams.updateExam(req.params.id, await payload(req))
  res.json({ exam })
}

export async function remove(req, res) {
  await assertExam(req.userId, req.params.id)
  await Exams.deleteExam(req.params.id)
  res.json({ ok: true })
}
