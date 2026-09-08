// Validação básica de entrada. Lança HttpError(400) com mensagem amigável.
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const bad = msg => { throw new HttpError(400, msg) }
export const notFound = (msg = 'Recurso não encontrado.') => { throw new HttpError(404, msg) }

export function reqString(value, field, { max = 255, min = 1 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min)
    bad(`Campo obrigatório: ${field}.`)
  const v = value.trim()
  if (v.length > max) bad(`${field} deve ter no máximo ${max} caracteres.`)
  return v
}

export function optString(value, field, { max = 255 } = {}) {
  if (value == null || value === '') return null
  if (typeof value !== 'string') bad(`${field} inválido.`)
  const v = value.trim()
  if (v.length > max) bad(`${field} deve ter no máximo ${max} caracteres.`)
  return v || null
}

export function optInt(value, field, { min = -32768, max = 32767 } = {}) {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) bad(`${field} inválido.`)
  return n
}

export function reqInt(value, field, opts) {
  const n = optInt(value, field, opts)
  if (n == null) bad(`Campo obrigatório: ${field}.`)
  return n
}

// 'YYYY-MM-DD'
export function optDate(value, field) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) bad(`${field} deve estar no formato AAAA-MM-DD.`)
  return value
}

export function reqDate(value, field) {
  const v = optDate(value, field)
  if (!v) bad(`Campo obrigatório: ${field}.`)
  return v
}

// 'HH:MM' ou 'HH:MM:SS'
export function optTime(value, field) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) bad(`${field} deve estar no formato HH:MM.`)
  return value.length === 5 ? `${value}:00` : value
}

export function reqEmail(value) {
  const v = reqString(value, 'e-mail', { max: 160 })
  if (!/.+@.+\..+/.test(v)) bad('Informe um e-mail válido.')
  return v.toLowerCase()
}

// Senha: 8 a 128 caracteres (o bcrypt só considera os primeiros 72 bytes;
// o teto evita gastar hash em textos enormes)
export function validPassword(value) {
  if (typeof value !== 'string' || value.length < 8) bad('A senha deve ter pelo menos 8 caracteres.')
  if (value.length > 128) bad('A senha deve ter no máximo 128 caracteres.')
  return value
}

// Chaves que, dentro do JSON do editor, viram atributos executáveis no DOM
// pelo mergeAttributes do TipTap (GHSA-cp6q-959q-f8rh) ou poluem protótipos
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
function hasDangerousKeys(value, depth = 0) {
  if (depth > 500) return true // aninhamento absurdo: rejeita
  if (Array.isArray(value)) return value.some(v => hasDangerousKeys(v, depth + 1))
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value))
      if (DANGEROUS_KEYS.has(key) || hasDangerousKeys(value[key], depth + 1)) return true
  }
  return false
}

// Conteúdo TipTap: aceita objeto (serializa) ou string JSON válida
export function optJsonContent(value, field = 'conteúdo') {
  if (value == null) return null
  let parsed = value
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value) } catch { bad(`${field} não é um JSON válido.`) }
  }
  if (!parsed || typeof parsed !== 'object') bad(`${field} inválido.`)
  if (hasDangerousKeys(parsed)) bad(`${field} contém chaves não permitidas.`)
  return typeof value === 'string' ? value : JSON.stringify(value)
}
