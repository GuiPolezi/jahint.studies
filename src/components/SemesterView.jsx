import { useState } from 'react'
import { ChevronLeft, Plus, Pencil, Trash2, Star, Clock, FileText } from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { Modal, Field, ColorPicker } from './ui'
import { DAYS, DAYS_SHORT, CLASS_COLORS } from '../lib/utils'

const emptySlot = day => ({ day, start: '19:00', end: '20:40' })

function ClassFormModal({ semesterId, initial, presetDay, onClose }) {
  const { data, addClass, updClass } = useStore()
  const [name, setName] = useState(initial?.name || '')
  const [professor, setProfessor] = useState(initial?.professor || '')
  const [color, setColor] = useState(initial?.color || CLASS_COLORS[0])
  const [slots, setSlots] = useState(initial?.slots?.length ? initial.slots.map(s => ({ ...s })) : [emptySlot(presetDay ?? 1)])

  const setSlot = (i, k, v) => setSlots(ss => ss.map((s, j) => (j === i ? { ...s, [k]: k === 'day' ? Number(v) : v } : s)))

  const save = e => {
    e.preventDefault()
    if (!name.trim() || slots.length === 0) return
    // Matéria repetida no mesmo semestre gera confusão em todo o app (selects
    // com opções idênticas, livros que parecem duplicados em Trabalhos) —
    // só segue com a confirmação explícita do usuário.
    const duplicada = data.classes.some(c =>
      c.semesterId === semesterId && c.id !== initial?.id &&
      c.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (duplicada && !confirm(`Já existe a matéria "${name.trim()}" neste semestre. Cadastrar mesmo assim?`)) return
    const payload = { name: name.trim(), professor: professor.trim(), color, slots }
    if (initial) updClass(initial.id, payload)
    else addClass(semesterId, payload)
    onClose()
  }

  return (
    <Modal title={initial ? 'Editar aula' : 'Nova aula'} onClose={onClose} width={560}>
      <form onSubmit={save} className="modal-form">
        <Field label="Nome da matéria *">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Arquitetura de Software" autoFocus required />
        </Field>
        <Field label="Professor(a)">
          <input value={professor} onChange={e => setProfessor(e.target.value)} placeholder="Nome do professor (opcional)" />
        </Field>
        <Field label="Cor da matéria">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        <Field label="Horários" hint="Uma matéria pode ter aula em mais de um dia — adicione quantos horários precisar.">
          <div className="slots-editor">
            {slots.map((s, i) => (
              <div key={i} className="slot-row">
                <select value={s.day} onChange={e => setSlot(i, 'day', e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 0].map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
                </select>
                <input type="time" value={s.start} onChange={e => setSlot(i, 'start', e.target.value)} required />
                <span className="slot-sep">até</span>
                <input type="time" value={s.end} onChange={e => setSlot(i, 'end', e.target.value)} required />
                {slots.length > 1 && (
                  <button type="button" className="icon-btn danger" onClick={() => setSlots(ss => ss.filter((_, j) => j !== i))}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-ghost btn-sm" onClick={() => setSlots(ss => [...ss, emptySlot(1)])}>
              <Plus size={14} /> Adicionar horário
            </button>
          </div>
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">{initial ? 'Salvar alterações' : 'Criar aula'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function SemesterView({ semesterId }) {
  const { data, nav, delClass, setActiveSemester } = useStore()
  const [modal, setModal] = useState(null) // { initial?, presetDay? }

  const sem = data.semesters.find(s => s.id === semesterId)
  const year = sem && data.years.find(y => y.id === sem.yearId)
  if (!sem || !year) {
    return (
      <div className="view">
        <button className="btn-ghost" onClick={() => nav('studies')}><ChevronLeft size={16} /> Voltar</button>
        <p className="panel-empty">Semestre não encontrado.</p>
      </div>
    )
  }

  const classes = data.classes.filter(c => c.semesterId === semesterId)
  const noteCount = clsId => data.notes.filter(n => n.classId === clsId).length
  const isCurrent = data.activeSemesterId === semesterId

  const dayOrder = [1, 2, 3, 4, 5, 6, 0]
  const visibleDays = dayOrder.filter(d =>
    d !== 0 ? true : classes.some(c => (c.slots || []).some(s => s.day === 0))
  )

  const classesOfDay = d =>
    classes
      .flatMap(c => (c.slots || []).filter(s => s.day === d).map(s => ({ cls: c, slot: s })))
      .sort((a, b) => a.slot.start.localeCompare(b.slot.start))

  return (
    <div className="view view-wide">
      <header className="view-head">
        <div>
          <button className="btn-back" onClick={() => nav('studies')}><ChevronLeft size={16} /> Meus Estudos</button>
          <h1>{year.number}º Ano · {sem.number}º Semestre {year.calendarYear ? `(${year.calendarYear})` : ''}</h1>
          <p className="view-sub">Sua semana de aulas — clique numa matéria para abrir as anotações.</p>
        </div>
        <div className="head-actions">
          <button
            className={'btn-ghost' + (isCurrent ? ' star-on' : '')}
            onClick={() => setActiveSemester(semesterId)}
          >
            <Star size={15} /> {isCurrent ? 'Semestre atual' : 'Definir como atual'}
          </button>
          <button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Nova aula</button>
        </div>
      </header>

      <div className="week-grid">
        {visibleDays.map(d => (
          <div key={d} className="day-col">
            <div className="day-col-head">
              <strong>{DAYS_SHORT[d]}</strong>
              <span>{DAYS[d]}</span>
              <button className="icon-btn" title={`Nova aula na ${DAYS[d]}`} onClick={() => setModal({ presetDay: d })}>
                <Plus size={14} />
              </button>
            </div>
            <div className="day-col-body">
              {classesOfDay(d).length === 0 && <div className="day-empty">Sem aulas</div>}
              {classesOfDay(d).map(({ cls, slot }, i) => (
                <div
                  key={cls.id + i}
                  className="class-card"
                  style={{ '--cls-color': cls.color }}
                  onClick={() => nav('class', { classId: cls.id })}
                >
                  <div className="class-card-name">{cls.name}</div>
                  <div className="class-card-meta">
                    <span><Clock size={12} /> {slot.start} – {slot.end}</span>
                    {cls.professor && <span>Prof. {cls.professor}</span>}
                    <span><FileText size={12} /> {noteCount(cls.id)} anotação(ões)</span>
                  </div>
                  <div className="class-card-actions">
                    <button
                      className="icon-btn"
                      title="Editar aula"
                      onClick={e => { e.stopPropagation(); setModal({ initial: cls }) }}
                    ><Pencil size={13} /></button>
                    <button
                      className="icon-btn danger"
                      title="Excluir aula"
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Excluir a aula "${cls.name}" e todas as suas anotações, trabalhos e provas?`)) delClass(cls.id)
                      }}
                    ><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ClassFormModal
          semesterId={semesterId}
          initial={modal.initial}
          presetDay={modal.presetDay}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
