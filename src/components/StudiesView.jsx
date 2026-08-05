import { useState } from 'react'
import { GraduationCap, Plus, Pencil, Trash2, Star, ChevronRight } from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { Modal, Field, EmptyState } from './ui'

export default function StudiesView() {
  const { data, nav, addYear, updYear, delYear, addSemester, delSemester, setActiveSemester } = useStore()
  const [modal, setModal] = useState(null) // { year? } para criar/editar
  const [num, setNum] = useState('')
  const [cal, setCal] = useState('')

  const years = [...data.years].sort((a, b) => a.number - b.number)

  const openNew = () => { setModal({}); setNum(String(years.length ? years[years.length - 1].number + 1 : 1)); setCal(String(new Date().getFullYear())) }
  const openEdit = y => { setModal({ year: y }); setNum(String(y.number)); setCal(y.calendarYear ? String(y.calendarYear) : '') }

  const save = e => {
    e.preventDefault()
    if (!num) return
    if (modal.year) updYear(modal.year.id, { number: Number(num), calendarYear: cal ? Number(cal) : null })
    else addYear(num, cal)
    setModal(null)
  }

  const semestersOf = y => data.semesters.filter(s => s.yearId === y.id).sort((a, b) => a.number - b.number)
  const classCount = semId => data.classes.filter(c => c.semesterId === semId).length

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Meus Estudos</h1>
          <p className="view-sub">Organize seus anos letivos e semestres — como suas pastas, só que melhor.</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Novo ano</button>
      </header>

      {years.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum ano cadastrado ainda"
          text='Cadastre seu primeiro ano letivo (ex.: "3º Ano — 2026") para começar a organizar semestres e aulas.'
        >
          <button className="btn-primary" onClick={openNew}><Plus size={16} /> Cadastrar ano</button>
        </EmptyState>
      ) : (
        <div className="years-grid">
          {years.map(y => (
            <div key={y.id} className="panel year-card">
              <div className="year-head">
                <div className="year-title">
                  <h2>{y.number}º Ano</h2>
                  {y.calendarYear && <span className="year-badge">{y.calendarYear}</span>}
                </div>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => openEdit(y)} title="Editar ano"><Pencil size={15} /></button>
                  <button
                    className="icon-btn danger"
                    title="Excluir ano"
                    onClick={() => {
                      if (confirm(`Excluir o ${y.number}º Ano e TODO o seu conteúdo (semestres, aulas, anotações, trabalhos e provas)?`))
                        delYear(y.id)
                    }}
                  ><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="sem-list">
                {semestersOf(y).map(s => (
                  <div
                    key={s.id}
                    className={'sem-row' + (data.activeSemesterId === s.id ? ' current' : '')}
                    onClick={() => nav('semester', { semesterId: s.id })}
                  >
                    <div className="sem-row-text">
                      <strong>{s.number}º Semestre</strong>
                      <small>{classCount(s.id)} aula(s)</small>
                    </div>
                    <button
                      className={'icon-btn star' + (data.activeSemesterId === s.id ? ' on' : '')}
                      title={data.activeSemesterId === s.id ? 'Semestre atual' : 'Definir como semestre atual'}
                      onClick={e => { e.stopPropagation(); setActiveSemester(s.id) }}
                    ><Star size={15} /></button>
                    <button
                      className="icon-btn danger"
                      title="Excluir semestre"
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Excluir o ${s.number}º semestre e todas as suas aulas?`)) delSemester(s.id)
                      }}
                    ><Trash2 size={15} /></button>
                    <ChevronRight size={16} className="date-arrow" />
                  </div>
                ))}

                <div className="sem-add-row">
                  {[1, 2].map(n =>
                    semestersOf(y).some(s => s.number === n) ? null : (
                      <button key={n} className="btn-ghost btn-sm" onClick={() => addSemester(y.id, n)}>
                        <Plus size={14} /> {n}º Semestre
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.year ? 'Editar ano' : 'Novo ano letivo'} onClose={() => setModal(null)} width={420}>
          <form onSubmit={save} className="modal-form">
            <Field label="Número do ano (1º, 2º, 3º...)">
              <input type="number" min="1" max="12" value={num} onChange={e => setNum(e.target.value)} autoFocus required />
            </Field>
            <Field label="Ano do calendário" hint="Ex.: 2026 — para acompanhar em que ano ele acontece.">
              <input type="number" min="2000" max="2100" value={cal} onChange={e => setCal(e.target.value)} />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">{modal.year ? 'Salvar' : 'Criar ano'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
