// Painel de Foco — lógica pura (sem React): trilhas, números, faixa dos
// próximos dias e o briefing em frases. Tudo deriva do store; nada aqui grava.
import { DAYS_SHORT, toISO, daysUntil, daysSince, urgency, formatBR, agoLabel } from './utils'

// As trilhas que o usuário atribui a cada trabalho pendente (null = sem trilha)
export const FOCUS_LANES = [
  { id: 'now', emoji: '🎯', label: 'Foco agora', hint: 'O que você está fazendo neste momento' },
  { id: 'next', emoji: '⏭️', label: 'Em seguida', hint: 'O próximo da fila' },
  { id: 'steady', emoji: '🗓️', label: 'Aos poucos', hint: 'Um pouco por semana, no ritmo que você anotar' },
  { id: 'hold', emoji: '💤', label: 'Em espera', hint: 'Parado por enquanto' },
]
export const laneInfo = id => FOCUS_LANES.find(l => l.id === id) || null

export const isPending = w => (w.progress ?? 0) < 100
// Entregas ordenadas pela data (sem data vai para o fim)
export const byDue = (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')

// Pendentes de qualquer semestre — sem filtro escondido: o que não interessa
// mais vai para "Em espera" ou se conclui. Já com matéria, dias e urgência.
export function pendingWorks(data) {
  return data.works
    .filter(isPending)
    .map(w => {
      const days = daysUntil(w.dueDate)
      return {
        ...w,
        progress: w.progress ?? 0,
        cls: data.classes.find(c => c.id === w.classId) || null,
        days,
        urgency: urgency(days),
      }
    })
    .sort(byDue)
}

export function groupByLane(works) {
  const g = { now: [], next: [], steady: [], hold: [], none: [] }
  for (const w of works) (g[w.focus] || g.none).push(w)
  return g
}

export function stats(works) {
  return {
    pending: works.length,
    thisWeek: works.filter(w => w.days != null && w.days >= 0 && w.days <= 7).length,
    late: works.filter(w => w.days != null && w.days < 0).length,
  }
}

// Hoje + os próximos n-1 dias, cada um com as entregas que caem nele
export function nextDays(works, n = 14) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out = []
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = toISO(d)
    const dow = d.getDay()
    out.push({
      iso,
      dayNum: d.getDate(),
      dow: DAYS_SHORT[dow],
      isToday: i === 0,
      isWeekend: dow === 0 || dow === 6,
      works: works.filter(w => w.dueDate === iso),
    })
  }
  return out
}

// Prazo em tom de frase (minúsculas, para o meio do texto)
export function dueText(w) {
  const d = w.days
  if (d == null) return 'sem data de entrega'
  if (d < 0) return `atrasado há ${-d} ${-d === 1 ? 'dia' : 'dias'}`
  if (d === 0) return 'entrega hoje'
  if (d === 1) return 'entrega amanhã'
  return `faltam ${d} dias`
}

// Referência clicável a um trabalho dentro de uma frase
const ref = w => ({ workId: w.id, title: w.title, color: w.cls?.color || null })

// "A", "A e B", "A, B e C"
function listRefs(ws) {
  const parts = []
  ws.forEach((w, i) => {
    if (i > 0) parts.push(i === ws.length - 1 ? ' e ' : ', ')
    parts.push(ref(w))
  })
  return parts
}

const shortDate = ts => formatBR(toISO(new Date(ts))).slice(0, 5) // dd/mm

// O briefing: frases curtas na ordem foco → fila → aos poucos → espera →
// alertas → anotações. Cada linha é { icon, parts, alert?, muted? }, com
// parts = [texto | { workId, title, color }] para o componente renderizar os
// nomes como botões que abrem o trabalho.
export function buildBriefing(data) {
  const works = pendingWorks(data)
  const lines = []
  if (!works.length) {
    lines.push({ icon: '🎉', parts: ['Nada pendente — bom momento para planejar o próximo passo.'] })
    return lines
  }
  const g = groupByLane(works)

  // 1. foco agora
  if (g.now.length === 1) {
    const w = g.now[0]
    lines.push({ icon: '🎯', parts: ['Seu foco agora é ', ref(w), ` — ${dueText(w)}, ${w.progress}% feito.`] })
  } else if (g.now.length > 1) {
    lines.push({ icon: '🎯', parts: ['Seu foco agora: ', ...listRefs(g.now), '.'] })
  } else {
    lines.push({ icon: '🎯', muted: true, parts: ['Você ainda não escolheu um foco. Marque um trabalho como Foco agora.'] })
  }

  // 2. em seguida
  if (g.next.length) lines.push({ icon: '⏭️', parts: ['Depois, ', ...listRefs(g.next), '.'] })

  // 3. aos poucos — cada um com o ritmo anotado
  if (g.steady.length) {
    const parts = ['Aos poucos: ']
    g.steady.forEach((w, i) => {
      if (i > 0) parts.push(i === g.steady.length - 1 ? ' e ' : ', ')
      parts.push(ref(w), ` (${w.focusNote || 'um pouco por semana'})`)
    })
    parts.push('.')
    lines.push({ icon: '🗓️', parts })
  }

  // 4. em espera
  if (g.hold.length) lines.push({ icon: '💤', muted: true, parts: ['Em espera: ', ...listRefs(g.hold), '.'] })

  // 5. alertas automáticos — independem de trilha; no máximo dois
  const alerts = []
  for (const w of works) {
    if (w.days == null) continue
    if (w.days < 0) {
      alerts.push({ icon: '⚠️', alert: true, parts: [ref(w), ` está ${dueText(w)}.`] })
    } else if (w.days <= 3 && w.progress < 50 && w.focus !== 'now') {
      const when = w.days === 0 ? 'é hoje' : w.days === 1 ? 'é amanhã' : `é em ${w.days} dias`
      alerts.push({
        icon: '⏰', alert: true,
        parts: [ref(w), `: a entrega ${when} e está em ${w.progress}% — talvez mereça o foco.`],
      })
    }
  }
  lines.push(...alerts.slice(0, 2))

  // 6. anotações: a mais recente entre os pendentes, e o foco parado
  const noted = works.filter(w => w.lastNoteAt).sort((a, b) => b.lastNoteAt - a.lastNoteAt)
  if (noted.length) {
    const w = noted[0]
    lines.push({
      icon: '✍️',
      parts: ['Sua última anotação foi em ', ref(w), `, ${agoLabel(w.lastNoteAt)} (${shortDate(w.lastNoteAt)}).`],
    })
  }
  const focus = g.now[0]
  if (focus) {
    const since = daysSince(focus.lastNoteAt)
    if (since == null) {
      lines.push({ icon: '📝', muted: true, parts: [ref(focus), ' ainda não tem anotações.'] })
    } else if (since > 7) {
      lines.push({ icon: '📝', muted: true, parts: ['Você não anota em ', ref(focus), ` há ${since} dias.`] })
    }
  }

  return lines
}
