// Limites do corpo JSON por rota. O padrão é pequeno (login, cadastro,
// metadados); só o documento do editor TipTap — que pode trazer imagens em
// base64 — e o rascunho do Painel de Foco precisam de corpo grande.
// Antes, o limite de 20 MB valia para todas as rotas, inclusive /auth/login.
import express from 'express'

const small = express.json({ limit: '100kb' })
const draft = express.json({ limit: '1mb' })      // focus_boards.draft: até 200 mil caracteres
const editor = express.json({ limit: '10mb' })    // notes.content / work_tabs.content

export function jsonBody(req, res, next) {
  if (req.method === 'PUT') {
    if (/^\/api\/(notes|work-tabs)\/[^/]+$/.test(req.path)) return editor(req, res, next)
    if (req.path === '/api/me/focus-board') return draft(req, res, next)
  }
  return small(req, res, next)
}
