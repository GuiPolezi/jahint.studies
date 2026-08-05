import { useState } from 'react'
import { FileText, Plus, Pencil, Trash2, Clock, ChevronDown } from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { Modal, Field, DueChip, EmptyState } from './ui'
import { formatBR, todayISO, daysUntil } from '../lib/utils'

const LABELS = ['P1', 'P2', 'P3', 'Substitutiva', 'Exame final', 'Outro']

function ExamFormModal({ initial, onClose }) {
  const { data, addExam, updExam } = useStore()
  const isCustom = initial && !LABELS.includes(initial.label)
  const [classId, setClassId] = useState(initial?.classId || data.classes[0]?.id || '')
  const [label, setLabel] = useState(isCustom ? 'Outro' : initial?.label || 'P1')
  const [customLabel, setCustomLabel] = useState(isCustom ? initial.label : '')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [time, setTime] = useState(initial?.time || '')
  const [topics, setTopics] = useState(initial?.topics || '')

  const save = e => {
    e.preventDefault()
    const finalLabel = label === 'Outro' ? (customLabel.trim() || 'Prova') : label
    const payload = { classId, label: finalLabel, date, time, topics }
    if (initial) updExam(initial.id, payload)
    else addExam(payload)
    onClose()
  }

  return (
    <Modal title={initial ? 'Editar prova' : 'Nova prova'} onClose={onClose} width={500}>
      <form onSubmit={save} className="modal-form">
        <Field label="Matéria *">
          <select value={classId} onChange={e => setClassId(e.target.value)} required>
            <option value="" disabled>Selecione a matéria…</option>
            {data.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
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

export default function ExamsView() {
  const { data, delExam } = useStore()
  const [modal, setModal] = useState(null) // {} novo | { initial } edição
  const [showPast, setShowPast] = useState(false)

  const cls = id => data.classes.find(c => c.id === id)

  const sorted = [...data.exams].sort((a, b) => a.date.localeCompare(b.date))
  const future = sorted.filter(e => daysUntil(e.date) >= 0)
  const past = sorted.filter(e => daysUntil(e.date) < 0).reverse()

  const ExamCard = ({ exam, faded }) => {
    const c = cls(exam.classId)
    return (
      <div className={'panel exam-card' + (faded ? ' faded' : '')}>
        <div className="exam-card-left" style={{ '--cls-color': c?.color || '#94a3b8' }}>
          <span className="exam-label">{exam.label}</span>
        </div>
        <div className="exam-card-body">
          <h3>{c?.name || 'Matéria removida'}</h3>
          <div className="exam-meta">
            <span>📅 {formatBR(exam.date)}</span>
            {exam.time && <span><Clock size={13} /> {exam.time}</span>}
            {!faded && <DueChip date={exam.date} />}
          </div>
          {exam.topics && <p className="exam-topics">📚 {exam.topics}</p>}
        </div>
        <div className="row-actions">
          <button className="icon-btn" title="Editar" onClick={() => setModal({ initial: exam })}><Pencil size={15} /></button>
          <button
            className="icon-btn danger"
            title="Excluir"
            onClick={() => { if (confirm(`Excluir a ${exam.label} de ${c?.name || 'matéria removida'}?`)) delExam(exam.id) }}
          ><Trash2 size={15} /></button>
        </div>
      </div>
    )
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
          <div className="exams-list">
            {future.length === 0 && <p className="panel-empty">Nenhuma prova futura. 🎉</p>}
            {future.map(e => <ExamCard key={e.id} exam={e} />)}
          </div>

          {past.length > 0 && (
            <div className="past-section">
              <button className="btn-ghost btn-sm" onClick={() => setShowPast(s => !s)}>
                <ChevronDown size={14} style={{ transform: showPast ? 'rotate(180deg)' : 'none' }} />
                Provas passadas ({past.length})
              </button>
              {showPast && (
                <div className="exams-list">
                  {past.map(e => <ExamCard key={e.id} exam={e} faded />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {modal && <ExamFormModal initial={modal.initial} onClose={() => setModal(null)} />}
    </div>
  )
}
