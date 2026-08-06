// Anos, semestres, aulas e horários.
import { bad, reqString, optString, reqInt, optInt } from '../lib/validate.js'
import * as Studies from '../models/studies.model.js'
import { assertYear, assertSemester, assertClass } from '../models/ownership.js'

// ---------- anos ----------
export async function listYears(req, res) {
  res.json({ years: await Studies.listYears(req.userId) })
}

export async function createYear(req, res) {
  const year = await Studies.createYear(req.userId, {
    number: reqInt(req.body.number, 'número do ano', { min: 1, max: 12 }),
    calendarYear: optInt(req.body.calendarYear, 'ano do calendário', { min: 2000, max: 2100 }),
  })
  res.status(201).json({ year })
}

export async function updateYear(req, res) {
  await assertYear(req.userId, req.params.id)
  await Studies.updateYear(req.params.id, {
    number: reqInt(req.body.number, 'número do ano', { min: 1, max: 12 }),
    calendarYear: optInt(req.body.calendarYear, 'ano do calendário', { min: 2000, max: 2100 }),
  })
  res.json({ ok: true })
}

export async function deleteYear(req, res) {
  await assertYear(req.userId, req.params.id)
  await Studies.deleteYear(req.params.id) // cascata remove semestres/aulas/etc.
  res.json({ ok: true })
}

// ---------- semestres ----------
export async function createSemester(req, res) {
  await assertYear(req.userId, req.params.yearId)
  const number = reqInt(req.body.number, 'número do semestre', { min: 1, max: 2 })
  const semester = await Studies.createSemester(req.params.yearId, number)
  res.status(201).json({ semester })
}

export async function deleteSemester(req, res) {
  await assertSemester(req.userId, req.params.id)
  await Studies.deleteSemester(req.params.id)
  res.json({ ok: true })
}

// ---------- aulas ----------
function validSlots(raw) {
  if (!Array.isArray(raw) || raw.length === 0) bad('Informe pelo menos um horário.')
  return raw.map(s => {
    const day = reqInt(s?.day, 'dia da semana', { min: 0, max: 6 })
    const start = reqString(s?.start, 'horário de início', { max: 8 })
    const end = reqString(s?.end, 'horário de término', { max: 8 })
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(start) || !/^\d{2}:\d{2}(:\d{2})?$/.test(end))
      bad('Horários devem estar no formato HH:MM.')
    return { day, start, end }
  })
}

const classPayload = body => ({
  name: reqString(body.name, 'nome da matéria', { max: 160 }),
  professor: optString(body.professor, 'professor', { max: 120 }),
  color: optString(body.color, 'cor', { max: 7 }),
  slots: validSlots(body.slots),
})

export async function createClass(req, res) {
  await assertSemester(req.userId, req.params.semesterId)
  const cls = await Studies.createClass(req.params.semesterId, classPayload(req.body))
  res.status(201).json({ class: cls })
}

export async function updateClass(req, res) {
  await assertClass(req.userId, req.params.id)
  const cls = await Studies.updateClass(req.params.id, classPayload(req.body))
  res.json({ class: cls })
}

export async function deleteClass(req, res) {
  await assertClass(req.userId, req.params.id)
  await Studies.deleteClass(req.params.id)
  res.json({ ok: true })
}
