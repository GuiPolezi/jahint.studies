import {
  CalendarClock, Briefcase, FileText, BookOpen, AlertTriangle,
  Sparkles, ChevronRight, Clock,
} from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { daysUntil, urgency, urgencyLabel, formatBR, DAYS } from '../lib/utils'
import { DueChip, EmptyState } from './ui'

export default function Dashboard() {
  const { data, nav, user, seedExample } = useStore()

  const className = id => data.classes.find(c => c.id === id)?.name || 'Aula removida'
  const classColor = id => data.classes.find(c => c.id === id)?.color || '#94a3b8'

  // Junta provas + trabalhos pendentes numa única linha do tempo
  const items = [
    ...data.exams.map(e => ({
      id: e.id, kind: 'prova', date: e.date,
      title: `${e.label} · ${className(e.classId)}`,
      color: classColor(e.classId),
      go: () => nav('exams'),
    })),
    ...data.works
      .filter(w => (w.progress ?? 0) < 100 && w.dueDate)
      .map(w => ({
        id: w.id, kind: w.type === 'trabalho' ? 'trabalho' : 'tarefa', date: w.dueDate,
        title: `${w.title} · ${className(w.classId)}`,
        color: classColor(w.classId),
        go: () => nav('work', { workId: w.id }),
      })),
  ].filter(i => i.date)

  const upcoming = items
    .filter(i => daysUntil(i.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  const overdue = items
    .filter(i => i.kind !== 'prova' && daysUntil(i.date) < 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  const next = upcoming[0]
  const nextDays = next ? daysUntil(next.date) : null

  const pendingWorks = data.works.filter(w => (w.progress ?? 0) < 100).length
  const futureExams = data.exams.filter(e => daysUntil(e.date) >= 0).length
  const activeClasses = data.classes.filter(c => c.semesterId === data.activeSemesterId)

  // Aulas de hoje (do semestre ativo)
  const todayDow = new Date().getDay()
  const todayClasses = activeClasses
    .flatMap(c => (c.slots || []).filter(s => s.day === todayDow).map(s => ({ ...c, slot: s })))
    .sort((a, b) => a.slot.start.localeCompare(b.slot.start))

  const isEmpty = data.years.length === 0 && data.classes.length === 0

  const kindIcon = k => (k === 'prova' ? <FileText size={16} /> : <Briefcase size={16} />)
  const kindLabel = k => (k === 'prova' ? 'Prova' : k === 'trabalho' ? 'Trabalho' : 'Tarefa')

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Olá, {user.nickname}! 👋</h1>
          <p className="view-sub">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </header>

      {isEmpty ? (
        <EmptyState
          icon={Sparkles}
          title="Bem-vindo(a) ao Jahint.Studies!"
          text="Comece cadastrando seu ano letivo e suas aulas — ou carregue um exemplo pronto para explorar o sistema."
        >
          <button className="btn-primary" onClick={() => nav('studies')}>Cadastrar meu ano letivo</button>
          <button className="btn-ghost" onClick={seedExample}>Carregar dados de exemplo</button>
        </EmptyState>
      ) : (
        <>
          {(overdue.length > 0 || (next && nextDays <= 3)) && (
            <div className="alert-banner">
              <AlertTriangle size={20} />
              <div>
                {overdue.length > 0 && (
                  <strong>
                    {overdue.length === 1
                      ? `1 entrega atrasada: ${overdue[0].title}. `
                      : `${overdue.length} entregas atrasadas! `}
                  </strong>
                )}
                {next && nextDays <= 3 && (
                  <span>
                    <strong>{kindLabel(next.kind)} {next.title}</strong>{' '}
                    — {urgencyLabel(nextDays).toLowerCase() === 'é hoje!' ? 'é HOJE!' : urgencyLabel(nextDays).toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="big-numbers">
            <div className={'big-card highlight-card' + (next ? ` glow-${urgency(nextDays)}` : '')}>
              <div className="big-icon"><CalendarClock size={20} /></div>
              <div className="big-label">Próxima data</div>
              {next ? (
                <>
                  <div className="big-value">{nextDays === 0 ? 'HOJE' : nextDays === 1 ? 'Amanhã' : `${nextDays} dias`}</div>
                  <div className="big-detail">{kindLabel(next.kind)}: {next.title}</div>
                  <div className="big-detail-date">{formatBR(next.date)}</div>
                </>
              ) : (
                <div className="big-value big-value-calm">Tudo em dia ✨</div>
              )}
            </div>

            <div className="big-card" onClick={() => nav('works')} role="button">
              <div className="big-icon"><Briefcase size={20} /></div>
              <div className="big-label">Trabalhos pendentes</div>
              <div className="big-value">{pendingWorks}</div>
              <div className="big-detail">{overdue.length > 0 ? `${overdue.length} atrasado(s)` : 'nenhum atrasado'}</div>
            </div>

            <div className="big-card" onClick={() => nav('exams')} role="button">
              <div className="big-icon"><FileText size={20} /></div>
              <div className="big-label">Provas agendadas</div>
              <div className="big-value">{futureExams}</div>
              <div className="big-detail">datas futuras</div>
            </div>

            <div className="big-card" onClick={() => nav('studies')} role="button">
              <div className="big-icon"><BookOpen size={20} /></div>
              <div className="big-label">Aulas no semestre</div>
              <div className="big-value">{activeClasses.length}</div>
              <div className="big-detail">{data.activeSemesterId ? 'semestre atual' : 'defina um semestre atual'}</div>
            </div>
          </div>

          <div className="dash-columns">
            <section className="panel">
              <div className="panel-head">
                <h2>📅 Próximas datas</h2>
              </div>
              {upcoming.length === 0 && overdue.length === 0 ? (
                <p className="panel-empty">Nenhuma data futura registrada. Cadastre provas e trabalhos para acompanhar aqui.</p>
              ) : (
                <ul className="date-list">
                  {[...overdue, ...upcoming].slice(0, 10).map(item => (
                    <li key={item.kind + item.id} className={`date-item du-${urgency(daysUntil(item.date))}`} onClick={item.go}>
                      <span className="date-dot" style={{ background: item.color }} />
                      <span className="date-kind">{kindIcon(item.kind)}</span>
                      <div className="date-text">
                        <strong>{item.title}</strong>
                        <small>{kindLabel(item.kind)} · {formatBR(item.date)}</small>
                      </div>
                      <DueChip date={item.date} />
                      <ChevronRight size={16} className="date-arrow" />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>🕐 Aulas de hoje</h2>
                <small className="panel-sub">{DAYS[todayDow]}</small>
              </div>
              {!data.activeSemesterId ? (
                <p className="panel-empty">Defina um "semestre atual" em Meus Estudos para ver suas aulas do dia.</p>
              ) : todayClasses.length === 0 ? (
                <p className="panel-empty">Sem aulas hoje. Aproveite para revisar conteúdos! 🌿</p>
              ) : (
                <ul className="today-list">
                  {todayClasses.map((c, i) => (
                    <li key={c.id + i} onClick={() => nav('class', { classId: c.id })}>
                      <span className="date-dot" style={{ background: c.color }} />
                      <div className="date-text">
                        <strong>{c.name}</strong>
                        <small>
                          <Clock size={12} /> {c.slot.start} – {c.slot.end}
                          {c.professor ? ` · Prof. ${c.professor}` : ''}
                        </small>
                      </div>
                      <ChevronRight size={16} className="date-arrow" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
