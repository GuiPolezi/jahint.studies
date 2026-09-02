// Cadastro, login, perfil e o "bootstrap" (todos os dados do usuário
// no mesmo formato do store do frontend).
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import { signToken } from '../middleware/auth.js'
import { HttpError, bad, reqString, optString, optInt, reqEmail } from '../lib/validate.js'
import * as Users from '../models/users.model.js'
import * as Studies from '../models/studies.model.js'
import * as Notes from '../models/notes.model.js'
import * as Works from '../models/works.model.js'
import * as Exams from '../models/exams.model.js'
import * as FocusBoards from '../models/focusboard.model.js'
import { assertSemester } from '../models/ownership.js'

export async function register(req, res) {
  const fullName = reqString(req.body.fullName, 'nome completo', { max: 120 })
  const email = reqEmail(req.body.email)
  const password = req.body.password
  if (typeof password !== 'string' || password.length < 4)
    bad('A senha deve ter pelo menos 4 caracteres.')

  if (await Users.findByEmail(email))
    throw new HttpError(409, 'Já existe uma conta com esse e-mail.')

  const user = await Users.createUser({
    fullName,
    nickname: optString(req.body.nickname, 'apelido', { max: 60 }) || fullName.split(' ')[0],
    email,
    passwordHash: await bcrypt.hash(password, 10),
    age: optInt(req.body.age, 'idade', { min: 1, max: 120 }),
    institution: optString(req.body.institution, 'instituição', { max: 120 }),
    course: optString(req.body.course, 'curso', { max: 120 }),
  })

  res.status(201).json({ token: signToken(user.id), user: Users.toUserDTO(user) })
}

export async function login(req, res) {
  const email = reqEmail(req.body.email)
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  const user = await Users.findByEmail(email)
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    throw new HttpError(401, 'E-mail ou senha incorretos.')
  res.json({ token: signToken(user.id), user: Users.toUserDTO(user) })
}

export async function me(req, res) {
  const user = await Users.findById(req.userId)
  if (!user) throw new HttpError(401, 'Conta não encontrada.')
  res.json({ user: Users.toUserDTO(user) })
}

export async function updateMe(req, res) {
  const b = req.body
  const fields = {}
  if (b.fullName !== undefined) fields.full_name = reqString(b.fullName, 'nome completo', { max: 120 })
  if (b.nickname !== undefined) fields.nickname = optString(b.nickname, 'apelido', { max: 60 })
  if (b.email !== undefined) {
    const email = reqEmail(b.email)
    const existing = await Users.findByEmail(email)
    if (existing && existing.id !== req.userId)
      throw new HttpError(409, 'Já existe uma conta com esse e-mail.')
    fields.email = email
  }
  if (b.age !== undefined) fields.age = optInt(b.age, 'idade', { min: 1, max: 120 })
  if (b.institution !== undefined) fields.institution = optString(b.institution, 'instituição', { max: 120 })
  if (b.course !== undefined) fields.course = optString(b.course, 'curso', { max: 120 })
  if (b.password !== undefined && b.password !== '') {
    if (typeof b.password !== 'string' || b.password.length < 4)
      bad('A senha deve ter pelo menos 4 caracteres.')
    fields.password_hash = await bcrypt.hash(b.password, 10)
  }
  const user = await Users.updateUser(req.userId, fields)
  res.json({ user: Users.toUserDTO(user) })
}

export async function updateAvatar(req, res) {
  if (!req.file) bad('Envie uma imagem no campo "avatar".')
  const user = await Users.findById(req.userId)
  // Remove o avatar anterior do disco (se existir)
  if (user?.avatar_path) fs.promises.unlink(user.avatar_path).catch(() => {})
  const updated = await Users.updateUser(req.userId, { avatar_path: req.file.path })
  res.json({ user: Users.toUserDTO(updated) })
}

export async function setActiveSemester(req, res) {
  const semesterId = req.body.semesterId ?? null
  if (semesterId !== null) await assertSemester(req.userId, semesterId)
  await Users.updateUser(req.userId, { active_semester_id: semesterId })
  res.json({ activeSemesterId: semesterId })
}

// PUT /api/me/focus-board — rascunho do Painel de Foco e/ou "abrir ao entrar".
// Aceita um campo ou os dois; responde o painel inteiro atualizado.
export async function updateFocusBoard(req, res) {
  const b = req.body
  const fields = {}
  if (b.draft !== undefined) {
    if (typeof b.draft !== 'string') bad('Rascunho inválido.')
    if (b.draft.length > 200_000) bad('O rascunho deve ter no máximo 200 mil caracteres.')
    fields.draft = b.draft
  }
  if (b.autoOpen !== undefined) {
    if (typeof b.autoOpen !== 'boolean') bad('"Abrir ao entrar" deve ser verdadeiro ou falso.')
    fields.autoOpen = b.autoOpen ? 1 : 0
  }
  res.json({ focusBoard: await FocusBoards.update(req.userId, fields) })
}

// GET /api/me/data — árvore completa no formato do store do frontend
export async function bootstrap(req, res) {
  const [user, years, semesters, classes, notes, works, exams, focusBoard] = await Promise.all([
    Users.findById(req.userId),
    Studies.listYears(req.userId),
    Studies.listSemesters(req.userId),
    Studies.listClasses(req.userId),
    Notes.listByUser(req.userId),
    Works.listByUser(req.userId),
    Exams.listByUser(req.userId),
    FocusBoards.getByUser(req.userId),
  ])
  res.json({
    user: Users.toUserDTO(user),
    data: {
      years, semesters, classes, notes, works, exams, focusBoard,
      activeSemesterId: user?.active_semester_id ?? null,
    },
  })
}
