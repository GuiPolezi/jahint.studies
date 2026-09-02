import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronDown, Settings2, Trash2, Plus, X } from 'lucide-react'
import { useStore, classInfo, termLabel, ClassSelect } from '../store/StoreProvider'
import { DueChip, CollapsibleFiles } from './ui'
import RichEditor, { useAutosaveContent, SaveStatus } from './RichEditor'
import { formatBR } from '../lib/utils'
import { DELIVERY_OPTIONS } from './WorksView'

function TabEditor({ tab, workId }) {
  const { touchWorkNote } = useStore()
  // Cada gravação vira "anotado hoje" no Painel de Foco
  const { initial, status, onChange } = useAutosaveContent('tab', tab.id, {
    onSaved: () => touchWorkNote(workId),
  })
  return (
    <div className="tab-editor">
      <div className="tab-editor-status"><SaveStatus status={status} /></div>
      {initial === undefined
        ? <div className="editor-loading">Carregando…</div>
        : <RichEditor initial={initial} onChange={onChange} placeholder={`Anotações de "${tab.title}"…`} />}
    </div>
  )
}

export default function WorkDetail({ workId }) {
  const {
    data, nav, updWork, delWork, addWorkTab, delWorkTab,
    addWorkMember, delWorkMember,
    uploadAttachment, delAttachment, downloadAttachment,
  } = useStore()
  const [tabId, setTabId] = useState(null)
  const [memberName, setMemberName] = useState('')
  // Detalhes (matéria/tipo/data/forma/progresso/integrantes) recolhidos por
  // padrão: a anotação é a protagonista da tela.
  const [detailsOpen, setDetailsOpen] = useState(false)

  const work = data.works.find(w => w.id === workId)

  useEffect(() => {
    if (work && !work.tabs.find(t => t.id === tabId)) setTabId(work.tabs[0]?.id ?? null)
  }, [work, tabId])

  if (!work) {
    return (
      <div className="view">
        <button className="btn-ghost" onClick={() => nav('works')}><ChevronLeft size={16} /> Voltar</button>
        <p className="panel-empty">Trabalho não encontrado.</p>
      </div>
    )
  }

  const cls = data.classes.find(c => c.id === work.classId)
  const { sem, year } = classInfo(data, work.classId)
  const activeTab = work.tabs.find(t => t.id === tabId)
  const done = (work.progress ?? 0) >= 100

  const addMember = e => {
    e.preventDefault()
    const name = memberName.trim()
    if (!name) return
    addWorkMember(work.id, name)
    setMemberName('')
  }

  const addTab = async () => {
    const title = window.prompt('Nome da nova aba de anotações:', 'Nova anotação')
    if (!title?.trim()) return
    const t = await addWorkTab(work.id, title.trim())
    if (t) setTabId(t.id)
  }

  // Resumo da barra de Detalhes — deriva do work a cada render (updWork é
  // otimista, então acompanha a edição dos campos ao vivo)
  const summary = [
    cls ? cls.name : 'Sem matéria',
    work.dueDate ? `entrega ${formatBR(work.dueDate)}` : 'sem data',
    `${work.progress ?? 0}%`,
    `${work.members.length} integrante${work.members.length === 1 ? '' : 's'}`,
  ].join(' · ')

  return (
    <div className="view view-wide work-view">
      <header className="view-head work-head">
        <button className="btn-back" onClick={() => nav('works', { yearId: year?.id, semesterId: sem?.id })}><ChevronLeft size={15} /> Trabalhos</button>
        <input
          className="note-title-input work-title"
          value={work.title}
          onChange={e => updWork(work.id, { title: e.target.value })}
        />
        <p className="view-sub">
          {cls && <span className="class-chip" style={{ '--cls-color': cls.color }}>{cls.name}</span>}
          {year && <span className="term-chip">{termLabel(sem, year)}</span>}
          {' '}<span className={'type-badge ' + work.type}>{work.type === 'trabalho' ? 'Trabalho (final)' : 'Tarefa'}</span>
          {' '}{done ? <span className="due-chip due-done">Concluído 🎉</span> : <DueChip date={work.dueDate} />}
        </p>
      </header>

      {/* Detalhes recolhidos por padrão. A exclusão do trabalho mora aqui
          dentro: continua longe de um toque acidental — antes ficava no fim
          da página, agora fica atrás do clique que abre esta seção. */}
      <section className="panel work-details">
        <button className="work-details-toggle" aria-expanded={detailsOpen} onClick={() => setDetailsOpen(o => !o)}>
          <Settings2 size={14} />
          <strong>Detalhes</strong>
          <span className="work-details-summary">{summary}</span>
          <ChevronDown size={14} style={{ transform: detailsOpen ? 'rotate(180deg)' : 'none' }} />
        </button>
        {detailsOpen && (
          <div className="work-details-body">
            <div className="work-info-grid">
              <label className="field">
                <span className="field-label">Matéria</span>
                <ClassSelect data={data} value={work.classId} onChange={e => updWork(work.id, { classId: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Tipo</span>
                <select value={work.type} onChange={e => updWork(work.id, { type: e.target.value })}>
                  <option value="tarefa">Tarefa cotidiana</option>
                  <option value="trabalho">Trabalho (entrega final)</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Data de entrega</span>
                <input type="date" value={work.dueDate || ''} onChange={e => updWork(work.id, { dueDate: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Forma de entrega</span>
                <select value={work.delivery} onChange={e => updWork(work.id, { delivery: e.target.value })}>
                  {DELIVERY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  {!DELIVERY_OPTIONS.includes(work.delivery) && <option>{work.delivery}</option>}
                </select>
              </label>
            </div>

            <div className="progress-row">
              <span className="field-label">Progresso: <strong>{work.progress ?? 0}%</strong></span>
              <input
                type="range" min="0" max="100" step="5"
                value={work.progress ?? 0}
                onChange={e => updWork(work.id, { progress: Number(e.target.value) })}
              />
              <div className="progress-track big">
                <div className={'progress-fill' + (done ? ' done' : '')} style={{ width: `${work.progress ?? 0}%` }} />
              </div>
            </div>

            <div className="members-row">
              <span className="field-label">Integrantes do grupo ({work.members.length})</span>
              <div className="members-chips">
                {work.members.map(m => (
                  <span key={m.id} className="member-chip">
                    {m.name}
                    <button
                      className="chip-x"
                      onClick={() => delWorkMember(work.id, m.id)}
                    ><X size={12} /></button>
                  </span>
                ))}
                <form onSubmit={addMember} className="member-add">
                  <input
                    value={memberName}
                    onChange={e => setMemberName(e.target.value)}
                    placeholder="Nome do integrante…"
                  />
                  <button type="submit" className="btn-ghost btn-sm"><Plus size={14} /> Adicionar</button>
                </form>
              </div>
            </div>

            <div className="work-details-danger">
              <div className="work-details-danger-text">
                <strong>Excluir este trabalho</strong>
                <small>Remove também as anotações das abas e os arquivos anexados. Não há como desfazer.</small>
              </div>
              <button
                className="btn-danger"
                onClick={() => { if (confirm(`Excluir "${work.title}" e todas as suas anotações e arquivos?`)) { delWork(work.id); nav('works', { yearId: year?.id, semesterId: sem?.id }) } }}
              ><Trash2 size={15} /> Excluir</button>
            </div>
          </div>
        )}
      </section>

      <section className="panel work-notes-panel">
        <div className="work-tabs">
          {work.tabs.map(t => (
            <button
              key={t.id}
              className={'work-tab' + (t.id === tabId ? ' active' : '')}
              onClick={() => setTabId(t.id)}
            >
              {t.title}
              {work.tabs.length > 1 && t.id === tabId && (
                <span
                  className="chip-x"
                  title="Excluir aba"
                  onClick={e => {
                    e.stopPropagation()
                    if (confirm(`Excluir a aba "${t.title}" e seu conteúdo?`)) delWorkTab(work.id, t.id)
                  }}
                ><X size={12} /></span>
              )}
            </button>
          ))}
          <button className="work-tab add" onClick={addTab} title="Nova aba de anotações"><Plus size={14} /></button>
        </div>
        {activeTab && <TabEditor key={activeTab.id} tab={activeTab} workId={work.id} />}

        <CollapsibleFiles
          key={work.id} /* reseta a barra ao navegar entre trabalhos, como na aula */
          files={work.attachments}
          label="Arquivos do trabalho"
          hint="Anexe PDFs de requisitos, códigos, ZIPs — qualquer arquivo. Tudo fica salvo na sua conta, no servidor."
          onUpload={f => uploadAttachment(work.id, f)}
          onDelete={attId => delAttachment(work.id, attId)}
          onDownload={downloadAttachment}
        />
      </section>
    </div>
  )
}
