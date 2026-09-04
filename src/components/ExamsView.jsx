import { useState } from 'react'
import { FileText, Plus, Pencil, Trash2, Clock, Check, History } from 'lucide-react'
import {
  useStore, classInfo, termLabel, ClassSelect, defaultClassId, semestersOfYear,
} from '../store/StoreProvider'
import { Modal, Field, DueChip, EmptyState } from './ui'
import { formatBR, todayISO, daysUntil } from '../lib/utils'

const LABELS = ['P1', 'P2', 'P3', 'Substitutiva', 'Exame final', 'Outro']
const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const weekday = iso => {
  const [y, m, d] = iso.split('-').map(Number)
  return WEEKDAY[new Date(y, m - 1, d).getDay()]
}

function ExamFormModal({ initial, presetClassId, onClose, onSaved }) {
  const { data, addExam, updExam } = useStore()
  const isCustom = initial && !LABELS.includes(initial.label)
  // presetClassId: o "+" do card de uma matéria já abre o formulário nela
  const [classId, setClassId] = useState(() => initial?.classId || presetClassId || defaultClassId(data))
  const [label, setLabel] = useState(isCustom ? 'Outro' : initial?.label || 'P1')
  const [customLabel, setCustomLabel] = useState(isCustom ? initial.label : '')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [time, setTime] = useState(initial?.time || '')
  const [topics, setTopics] = useState(initial?.topics || '')

  const save = async e => {
    e.preventDefault()
    const finalLabel = label === 'Outro' ? (customLabel.trim() || 'Prova') : label
    const payload = { classId, label: finalLabel, date, time, topics }
    if (initial) await updExam(initial.id, payload)
    else if (!(await addExam(payload))) return // erro já avisado pelo store
    onSaved?.(classId)
    onClose()
  }

  return (
    <Modal title={initial ? 'Editar prova' : 'Nova prova'} onClose={onClose} width={500}>
      <form onSubmit={save} className="modal-form">
        <Field label="Matéria *" hint="A matéria define o ano e o semestre da prova.">
          <ClassSelect data={data} value={classId} onChange={e => setClassId(e.target.value)} required />
        </Field>
        <div className="form-grid">
          <Field label="Tipo de prova">
            <select value={label} onChange={e => setLabel(e.target.value)}>
              {LABELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>
          {label === 'Outro' && (
            <Field label="Nome personalizado">
              <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="Ex.: Simulado" autoFocus />
            </Field>
          )}
          <Field label="Data *">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </Field>
          <Field label="Horário">
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Conteúdo para estudar" hint="Liste os tópicos que cairão na prova.">
          <textarea rows={4} value={topics} onChange={e => setTopics(e.target.value)} placeholder="Ex.: Padrões de projeto, SOLID, arquitetura em camadas…" />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">{initial ? 'Salvar' : 'Agendar prova'}</button>
        </div>
      </form>
    </Modal>
  )
}

// Uma prova dentro do card da matéria: etiqueta, dia/data/hora, prazo e ações.
// O conteúdo fica em uma linha e expande no clique — a data é o que precisa
// saltar aos olhos.
function ExamRow({ exam, past, next, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={'exam-row' + (past ? ' past' : '') + (next ? ' next' : '')}>
      <span className="exam-row-label">{exam.label}</span>
      <div className="exam-row-main">
        <div className="exam-row-when">
          <strong><small>{weekday(exam.date)}</small> {formatBR(exam.date)}</strong>
          {exam.time && <span><Clock size={12} /> {exam.time}</span>}
        </div>
        {exam.topics && (
          <p
            className={'exam-row-topics' + (open ? ' open' : '')}
            onClick={() => setOpen(o => !o)}
            title={open ? 'Recolher' : 'Ver todo o conteúdo'}
          >📚 {exam.topics}</p>
        )}
      </div>
      {past
        ? <span className="exam-row-done"><Check size={13} /> feita</span>
        : <DueChip date={exam.date} />}
      <div className="exam-row-actions">
        <button className="icon-btn" title="Editar" onClick={onEdit}><Pencil size={14} /></button>
        <button className="icon-btn danger" title="Excluir" onClick={onDelete}><Trash2 size={14} /></button>
      </div>
    </li>
  )
}

export default function ExamsView() {
  const { data, delExam, route } = useStore()
  const [modal, setModal] = useState(null) // {} novo | { initial } edição | { presetClassId } novo já na matéria
  const [showPast, setShowPast] = useState(false)
  // Começa no ano/semestre pedido pela navegação (ex.: clique no dashboard),
  // senão no semestre atual — "o semestre em que estou"
  const routeSem = route.semesterId ? data.semesters.find(s => s.id === route.semesterId) : null
  const [fYear, setFYear] = useState(
    () => routeSem?.yearId || route.yearId ||
      data.semesters.find(s => s.id === data.activeSemesterId)?.yearId || 'todos'
  )
  const [fSem, setFSem] = useState(
    () => route.semesterId || (route.yearId ? 'todos' : data.activeSemesterId) || 'todos'
  )

  const cls = id => data.classes.find(c => c.id === id)
  const fYearSafe = data.years.some(y => y.id === fYear) ? fYear : 'todos'
  const years = [...data.years].sort((a, b) => a.number - b.number)
  // O semestre só faz sentido dentro de um ano: com "todos os anos", não filtra semestre
  const semOptions = fYearSafe === 'todos' ? [] : semestersOfYear(data, fYearSafe)
  const fSemSafe = semOptions.some(s => s.id === fSem) ? fSem : 'todos'

  const sorted = data.exams
    .filter(e => (fYearSafe === 'todos' ? true : classInfo(data, e.classId).year?.id === fYearSafe))
    .filter(e => (fSemSafe === 'todos' ? true : cls(e.classId)?.semesterId === fSemSafe))
    .sort((a, b) => a.date.localeCompare(b.date))
  const pastTotal = sorted.filter(e => daysUntil(e.date) < 0).length

  // Um card por matéria, com as provas dela dentro. Só entra matéria que tem
  // pelo menos uma prova cadastrada — sem prova, sem card.
  const groups = new Map()
  for (const e of sorted) {
    if (!groups.has(e.classId)) groups.set(e.classId, [])
    groups.get(e.classId).push(e)
  }
  const subjects = [...groups].map(([classId, exams]) => {
    const future = exams.filter(e => daysUntil(e.date) >= 0)
    const past = exams.filter(e => daysUntil(e.date) < 0).reverse() // a mais recente primeiro
    return { classId, cls: cls(classId), exams, future, past, next: future[0] || null }
  })
  // Ordem = urgência: a matéria com a próxima prova mais perto vem primeiro;
  // as que só têm provas feitas vão para o fim, da mais recente para a mais antiga
  subjects.sort((a, b) => {
    if (a.next && b.next) return a.next.date.localeCompare(b.next.date)
    if (a.next || b.next) return a.next ? -1 : 1
    return b.past[0].date.localeCompare(a.past[0].date)
  })
  // Matéria só com provas feitas aparece quando "Provas passadas" está ligado
  const visible = subjects.filter(s => s.future.length > 0 || (showPast && s.past.length > 0))

  const removeExam = (exam, c) => {
    if (confirm(`Excluir a ${exam.label} de ${c?.name || 'matéria removida'}?`)) delExam(exam.id)
  }

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Provas</h1>
          <p className="view-sub">P1, P2, substitutivas… todas as datas num só lugar, com contagem regressiva.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (data.classes.length === 0) return alert('Cadastre pelo menos uma aula antes de agendar provas (em Meus Estudos).')
            setModal({})
          }}
        ><Plus size={16} /> Nova prova</button>
      </header>

      {data.exams.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma prova agendada"
          text="Cadastre as datas de P1, P2 e substitutivas de cada matéria — o dashboard te avisa conforme elas se aproximarem."
        >
          {data.classes.length > 0 && (
            <button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Agendar prova</button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="filter-bar">
            <select
              value={fYearSafe}
              onChange={e => { setFYear(e.target.value); setFSem('todos') }}
              title="Filtrar pelo ano letivo"
            >
              <option value="todos">Todos os anos</option>
              {years.map(y => (
                <option key={y.id} value={y.id}>
                  {y.number}º Ano{y.calendarYear ? ` (${y.calendarYear})` : ''}
                </option>
              ))}
            </select>
            {semOptions.length > 0 && (
              <select value={fSemSafe} onChange={e => setFSem(e.target.value)} title="Filtrar pelo semestre">
                <option value="todos">Todos os semestres</option>
                {semOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.number}º Semestre</option>
                ))}
              </select>
            )}
            {pastTotal > 0 && (
              <button
                className={'btn-ghost btn-sm past-toggle' + (showPast ? ' on' : '')}
                onClick={() => setShowPast(s => !s)}
                aria-pressed={showPast}
                title={showPast ? 'Esconder as provas que já passaram' : 'Mostrar as provas que já passaram dentro de cada matéria'}
              >
                <History size={14} /> Provas passadas ({pastTotal})
              </button>
            )}
          </div>

          {visible.length === 0 && (
            <p className="panel-empty">
              {sorted.length === 0
                ? (fSemSafe === 'todos' ? 'Nenhuma prova neste ano letivo.' : 'Nenhuma prova neste semestre.')
                : 'Nenhuma prova futura. 🎉'}
            </p>
          )}

          <div className="exam-grid">
            {visible.map((s, i) => {
              const { sem, year } = classInfo(data, s.classId)
              const term = year ? termLabel(sem, year) : ''
              const n = s.exams.length
              const done = s.past.length
              return (
                <article
                  key={s.classId}
                  className="exam-subject"
                  style={{ '--cls-color': s.cls?.color || '#94a3b8', '--i': i }}
                >
                  <header className="exam-subject-head">
                    <div className="exam-subject-title">
                      <h3>{s.cls?.name || 'Matéria removida'}</h3>
                      <div className="exam-subject-meta">
                        {term && <span className="term-chip">{term}</span>}
                        <span>
                          {`${n} prova${n === 1 ? '' : 's'}`}
                          {done > 0 && !showPast ? ` · ${done} feita${done === 1 ? '' : 's'}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="exam-subject-side">
                      {!s.next && (
                        <span className="exam-subject-none"><Check size={12} /> Todas feitas</span>
                      )}
                      {s.cls && (
                        <button
                          className="icon-btn exam-subject-add"
                          title={`Agendar prova de ${s.cls.name}`}
                          onClick={() => setModal({ presetClassId: s.classId })}
                        ><Plus size={15} /></button>
                      )}
                    </div>
                  </header>

                  <ul className="exam-rows">
                    {s.future.map((e, j) => (
                      <ExamRow
                        key={e.id}
                        exam={e}
                        next={j === 0}
                        onEdit={() => setModal({ initial: e })}
                        onDelete={() => removeExam(e, s.cls)}
                      />
                    ))}
                    {showPast && done > 0 && (
                      <>
                        {s.future.length > 0 && <li className="exam-rows-sep">Passadas</li>}
                        {s.past.map(e => (
                          <ExamRow
                            key={e.id}
                            exam={e}
                            past
                            onEdit={() => setModal({ initial: e })}
                            onDelete={() => removeExam(e, s.cls)}
                          />
                        ))}
                      </>
                    )}
                  </ul>
                </article>
              )
            })}
          </div>
        </>
      )}

      {modal && (
        <ExamFormModal
          initial={modal.initial}
          presetClassId={modal.presetClassId}
          onClose={() => setModal(null)}
          onSaved={classId => {
            // A prova salva não pode sumir atrás do filtro:
            // se for de outro ano/semestre, os filtros seguem para ela
            const { sem, year } = classInfo(data, classId)
            if (year?.id && fYearSafe !== 'todos' && year.id !== fYearSafe) {
              setFYear(year.id)
              setFSem(sem?.id || 'todos')
            } else if (sem?.id && fSemSafe !== 'todos' && sem.id !== fSemSafe) {
              setFSem(sem.id)
            }
          }}
        />
      )}
    </div>
  )
}
