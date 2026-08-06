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

// Conteúdo TipTap: aceita objeto (serializa) ou string JSON válida
export function optJsonContent(value, field = 'conteúdo') {
  if (value == null) return null
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'string') {
    try { JSON.parse(value); return value } catch { bad(`${field} não é um JSON válido.`) }
  }
  bad(`${field} inválido.`)
}
