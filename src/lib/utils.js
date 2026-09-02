// Utilidades gerais: ids, datas, formatação e imagens

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const DAYS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]
export const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const pad = n => String(n).padStart(2, '0')

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO() {
  return toISO(new Date())
}

export function isoPlusDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export function formatBR(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function daysUntil(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}

// Nível de urgência conforme a data se aproxima
export function urgency(days) {
  if (days == null) return 'ok'
  if (days < 0) return 'late'
  if (days === 0) return 'today'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'warn'
  if (days <= 14) return 'soon'
  return 'ok'
}

export function urgencyLabel(days) {
  if (days == null) return ''
  if (days < 0) return `Atrasado há ${-days} ${-days === 1 ? 'dia' : 'dias'}`
  if (days === 0) return 'É HOJE!'
  if (days === 1) return 'Amanhã'
  return `Faltam ${days} dias`
}

// Dias passados desde um carimbo (ms) — 0 = hoje
export function daysSince(ts) {
  if (!ts) return null
  return -daysUntil(toISO(new Date(ts)))
}

// "hoje" / "ontem" / "há N dias" — para carimbos no passado (última anotação…)
export function agoLabel(ts) {
  const days = daysSince(ts)
  if (days == null) return ''
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  return `há ${days} dias`
}

export function formatBytes(n) {
  if (n == null) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

// Lê uma imagem e devolve dataURL redimensionada (evita estourar armazenamento)
export function readImageResized(file, maxW = 1400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const keepPng = file.type === 'image/png' && file.size < 300 * 1024
        resolve(canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', quality))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Paleta de cores para as aulas (tons Frutiger Aero)
export const CLASS_COLORS = [
  '#0a84ff', '#00b8d9', '#34c759', '#ff9f0a', '#ff375f',
  '#bf5af2', '#5e5ce6', '#ffd60a', '#64d2ff', '#ff6b35',
]
