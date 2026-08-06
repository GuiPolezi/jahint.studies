import { useState } from 'react'
import { Briefcase, Plus, Users, Paperclip, CheckCircle2 } from 'lucide-react'
import {
  useStore, classInfo, termLabel, ClassSelect, defaultClassId, semestersOfYear,
} from '../store/StoreProvider'
import { Modal, Field, DueChip, EmptyState } from './ui'
import { formatBR, todayISO } from '../lib/utils'

export const DELIVERY_OPTIONS = ['Microsoft Teams', 'Em aula (em mãos)', 'E-mail', 'Outro']

export function WorkFormModal({ onClose, onCreated }) {
  const { data, addWork } = useStore()
  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState(() => defaultClassId(data))
  const [type, setType] = useState('tarefa')
  const [dueDate, setDueDate] = useState(todayISO())
  const [delivery, setDelivery] = useState(DELIVERY_OPTIONS[0])

  const save = async e => {
    e.preventDefault()
    if (!title.trim() || !classId) return
    const w = await addWork({ classId, title: title.trim(), type, dueDate, delivery })
    if (!w) return // erro já avisado pelo store
    onCreated?.(w)
    onClose()
  }

  return (
    <Modal title="Novo trabalho / tarefa" onClose={onClose} width={520}>
      <form onSubmit={save} className="modal-form">
        <Field label="Título *">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Trabalho final — sistema distribuído" autoFocus required />
        </Field>
        <Field label="Matéria vinculada *" hint="A matéria define o ano e o semestre do trabalho.">
          <ClassSelect data={data} value={classId} onChange={e => setClassId(e.target.value)} required />
        </Field>
        <Field label="Tipo">
          <div className="radio-row">
            <label className={'radio-pill' + (type === 'tarefa' ? ' on' : '')}>
              <input type="radio" checked={type === 'tarefa'} onChange={() => setType('tarefa')} />
              Tarefa cotidiana
            </label>
            <label className={'radio-pill' + (type === 'trabalho' ? ' on' : '')}>
              <input type="radio" checked={type === 'trabalho'} onChange={() => setType('trabalho')} />
              Trabalho (entrega final)
            </label>
          </div>
        </Field>
        <div className="form-grid">
          <Field label="Data de entrega">
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
          </Field>
          <Field label="Forma de entrega">
            <select value={delivery} onChange={e => setDelivery(e.target.value)}>
              {DELIVERY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">Criar</button>
        </div>
      </form>
    </Modal>
  )
}

export default function WorksView() {
  const { data, nav, route } = useStore()
  const [modal, setModal] = useState(false)
  const [fType, setFType] = useState('todos')
  const [fClass, setFClass] = useState('todas')
  const [fStatus, setFStatus] = useState('pendentes')
  // Começa no ano/semestre pedido pela navegação (ex.: voltar do detalhe de um trabalho),
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
  const yearOf = classId => classInfo(data, classId).year
  const fYearSafe = data.years.some(y => y.id === fYear) ? fYear : 'todos'

  const years = [...data.years].sort((a, b) => a.number - b.number)
  // O semestre só faz sentido dentro de um ano: com "todos os anos", não filtra semestre
  const semOptions = fYearSafe === 'todos' ? [] : semestersOfYear(data, fYearSafe)
  const fSemSafe = semOptions.some(s => s.id === fSem) ? fSem : 'todos'

  const classOptions = data.classes
    .filter(c => (fYearSafe === 'todos' ? true : yearOf(c.id)?.id === fYearSafe))
    .filter(c => (fSemSafe === 'todos' ? true : c.semesterId === fSemSafe))
  // Matéria de fora do ano/semestre escolhido não pode continuar filtrando
  const fClassSafe = classOptions.some(c => c.id === fClass) ? fClass : 'todas'

  const works = data.works
    .filter(w => (fYearSafe === 'todos' ? true : yearOf(w.classId)?.id === fYearSafe))
    .filter(w => (fSemSafe === 'todos' ? true : cls(w.classId)?.semesterId === fSemSafe))
    .filter(w => (fType === 'todos' ? true : w.type === fType))
    .filter(w => (fClassSafe === 'todas' ? true : w.classId === fClassSafe))
    .filter(w => {
      const done = (w.progress ?? 0) >= 100
      return fStatus === 'todos' ? true : fStatus === 'pendentes' ? !done : done
    })
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Trabalhos & Tarefas</h1>
          <p className="view-sub">Tudo o que precisa ser entregue, com prazo, grupo, progresso e arquivos.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (data.classes.length === 0) return alert('Cadastre pelo menos uma aula antes de criar trabalhos (em Meus Estudos).')
            setModal(true)
          }}
        ><Plus size={16} /> Novo trabalho</button>
      </header>

      <div className="filter-bar">
        {years.length > 0 && (
          <select
            value={fYearSafe}
            onChange={e => { setFYear(e.target.value); setFSem('todos'); setFClass('todas') }}
            title="Filtrar pelo ano letivo"
          >
            <option value="todos">Todos os anos</option>
            {years.map(y => (
              <option key={y.id} value={y.id}>
                {y.number}º Ano{y.calendarYear ? ` (${y.calendarYear})` : ''}
              </option>
            ))}
          </select>
        )}
        {semOptions.length > 0 && (
          <select
            value={fSemSafe}
            onChange={e => { setFSem(e.target.value); setFClass('todas') }}
            title="Filtrar pelo semestre"
          >
            <option value="todos">Todos os semestres</option>
            {semOptions.map(s => (
              <option key={s.id} value={s.id}>{s.number}º Semestre</option>
            ))}
          </select>
        )}
        <select value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="pendentes">Pendentes</option>
          <option value="concluidos">Concluídos</option>
          <option value="todos">Todos</option>
        </select>
        <select value={fType} onChange={e => setFType(e.target.value)}>
          <option value="todos">Tarefas e trabalhos</option>
          <option value="tarefa">Só tarefas</option>
          <option value="trabalho">Só trabalhos</option>
        </select>
        <select value={fClassSafe} onChange={e => setFClass(e.target.value)}>
          <option value="todas">Todas as matérias</option>
          {classOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {works.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={data.works.length === 0 ? 'Nenhum trabalho registrado' : 'Nada encontrado com esses filtros'}
          text={data.works.length === 0 ? 'Registre trabalhos e tarefas para nunca perder um prazo de entrega.' : undefined}
        >
          {data.works.length === 0 && data.classes.length > 0 && (
            <button className="btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Registrar trabalho</button>
          )}
        </EmptyState>
      ) : (
        <div className="works-grid">
          {works.map(w => {
            const c = cls(w.classId)
            const { sem, year } = classInfo(data, w.classId)
            const done = (w.progress ?? 0) >= 100
            return (
              <div key={w.id} className="panel work-card" onClick={() => nav('work', { workId: w.id })}>
                <div className="work-card-top">
                  <span className={'type-badge ' + w.type}>{w.type === 'trabalho' ? 'Trabalho' : 'Tarefa'}</span>
                  {done
                    ? <span className="due-chip due-done"><CheckCircle2 size={13} /> Concluído</span>
                    : <DueChip date={w.dueDate} />}
                </div>
                <h3>{w.title}</h3>
                <div className="work-card-meta">
                  {c && <span className="class-chip" style={{ '--cls-color': c.color }}>{c.name}</span>}
                  {year && <span className="term-chip">{termLabel(sem, year)}</span>}
                </div>
                <div className="work-card-info">
                  <span>📅 {formatBR(w.dueDate)}</span>
                  <span>📤 {w.delivery}</span>
                  {w.members.length > 0 && <span><Users size={13} /> {w.members.length}</span>}
                  {w.attachments.length > 0 && <span><Paperclip size={13} /> {w.attachments.length}</span>}
                </div>
                <div className="progress-track">
                  <div className={'progress-fill' + (done ? ' done' : '')} style={{ width: `${w.progress ?? 0}%` }} />
                </div>
                <small className="progress-label">{w.progress ?? 0}% concluído</small>
              </div>
            )
          })}
        </div>
      )}

      {modal && <WorkFormModal onClose={() => setModal(false)} onCreated={w => nav('work', { workId: w.id })} />}
    </div>
  )
}
