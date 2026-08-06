import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft, Trash2, Plus, X, Upload, Download,
  File, FileText, FileArchive, FileCode, FileImage,
} from 'lucide-react'
import { useStore, classInfo, termLabel, ClassSelect } from '../store/StoreProvider'
import { DueChip } from './ui'
import RichEditor, { useAutosaveContent, SaveStatus } from './RichEditor'
import { formatBytes } from '../lib/utils'
import { DELIVERY_OPTIONS } from './WorksView'

function fileIcon(att) {
  const ext = (att.name.split('.').pop() || '').toLowerCase()
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return <FileText size={18} />
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive size={18} />
  if (['js', 'jsx', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'sql'].includes(ext)) return <FileCode size={18} />
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage size={18} />
  return <File size={18} />
}

function TabEditor({ tab }) {
  const { initial, status, onChange } = useAutosaveContent('tab', tab.id)
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
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef(null)

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

  const onFiles = async e => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    for (const f of files) await uploadAttachment(work.id, f) // sobe para o servidor
    setUploading(false)
  }

  const addTab = async () => {
    const title = window.prompt('Nome da nova aba de anotações:', 'Nova anotação')
    if (!title?.trim()) return
    const t = await addWorkTab(work.id, title.trim())
    if (t) setTabId(t.id)
  }

  return (
    <div className="view view-wide">
      <header className="view-head">
        <div>
          <button className="btn-back" onClick={() => nav('works', { yearId: year?.id, semesterId: sem?.id })}><ChevronLeft size={16} /> Trabalhos</button>
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
        </div>
        <button
          className="btn-danger"
          onClick={() => { if (confirm(`Excluir "${work.title}" e todas as suas anotações e arquivos?`)) { delWork(work.id); nav('works', { yearId: year?.id, semesterId: sem?.id }) } }}
        ><Trash2 size={15} /> Excluir</button>
      </header>

      <div className="work-info panel">
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
      </div>

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
        {activeTab && <TabEditor key={activeTab.id} tab={activeTab} />}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>📎 Arquivos ({work.attachments.length})</h2>
          <button className="btn-ghost btn-sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
            <Upload size={14} /> {uploading ? 'Salvando…' : 'Anexar arquivos'}
          </button>
          <input ref={fileInput} type="file" multiple hidden onChange={onFiles} />
        </div>
        {work.attachments.length === 0 ? (
          <p className="panel-empty">Anexe PDFs de requisitos, códigos, ZIPs — qualquer arquivo. Tudo fica salvo na sua conta, no servidor.</p>
        ) : (
          <ul className="file-list">
            {work.attachments.map(att => (
              <li key={att.id}>
                <span className="file-icon">{fileIcon(att)}</span>
                <div className="file-text">
                  <strong>{att.name}</strong>
                  <small>{formatBytes(att.size)}</small>
                </div>
                <button className="icon-btn" title="Baixar" onClick={() => downloadAttachment(att)}><Download size={16} /></button>
                <button
                  className="icon-btn danger"
                  title="Excluir arquivo"
                  onClick={() => { if (confirm(`Excluir o arquivo "${att.name}"?`)) delAttachment(work.id, att.id) }}
                ><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
