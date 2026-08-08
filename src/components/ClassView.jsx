import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Plus, Trash2, FileText, Clock, Upload, Download, Paperclip } from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { Modal, Field, EmptyState, fileIcon } from './ui'
import RichEditor, { useAutosaveContent, SaveStatus } from './RichEditor'
import { formatBR, todayISO, DAYS, formatBytes } from '../lib/utils'

// Arquivos da anotação: slides do professor, PDFs de exercício, códigos da
// aula. Mesma mecânica dos anexos de trabalho — o arquivo vai para o disco do
// servidor e a anotação guarda só a referência.
function NoteFiles({ note }) {
  const { uploadNoteAttachment, delNoteAttachment, downloadNoteAttachment } = useStore()
  const [uploading, setUploading] = useState(false)
  const input = useRef(null)
  const files = note.attachments || []

  const onFiles = async e => {
    const picked = [...(e.target.files || [])]
    e.target.value = ''
    if (!picked.length) return
    setUploading(true)
    // Sequencial de propósito: o upload paralelo de vários arquivos grandes
    // estourava o limite do proxy e a barra de progresso ficava sem sentido.
    for (const f of picked) await uploadNoteAttachment(note.id, f)
    setUploading(false)
  }

  return (
    <div className="note-files">
      <div className="note-files-head">
        <h3><Paperclip size={14} /> Arquivos da aula ({files.length})</h3>
        <button
          className="btn-ghost btn-sm"
          onClick={() => input.current?.click()}
          disabled={uploading}
        >
          <Upload size={14} /> {uploading ? 'Enviando…' : 'Anexar'}
        </button>
        <input ref={input} type="file" multiple hidden onChange={onFiles} />
      </div>

      {files.length === 0 ? (
        <p className="panel-empty">Slides, listas de exercícios, códigos — até 25MB por arquivo.</p>
      ) : (
        <ul className="file-list">
          {files.map(att => (
            <li key={att.id}>
              <span className="file-icon">{fileIcon(att)}</span>
              <div className="file-text">
                <strong>{att.name}</strong>
                <small>{formatBytes(att.size)}</small>
              </div>
              <button
                className="icon-btn"
                title="Baixar"
                onClick={() => downloadNoteAttachment(att)}
              ><Download size={16} /></button>
              <button
                className="icon-btn danger"
                title="Excluir arquivo"
                onClick={() => { if (confirm(`Excluir o arquivo "${att.name}"?`)) delNoteAttachment(note.id, att.id) }}
              ><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Painel do editor — remontado por anotação (key) para isolar carregamento/salvamento
function NoteEditorPane({ note }) {
  const { updNote, delNote } = useStore()
  const { initial, status, onChange } = useAutosaveContent('note', note.id)

  return (
    <div className="note-editor-pane">
      <div className="note-editor-head">
        <input
          className="note-title-input"
          value={note.title}
          onChange={e => updNote(note.id, { title: e.target.value })}
          placeholder="Título da anotação"
        />
        <input
          type="date"
          className="note-date-input"
          value={note.date || ''}
          onChange={e => updNote(note.id, { date: e.target.value })}
          title="Data da aula"
        />
        <SaveStatus status={status} />
        <button
          className="icon-btn danger"
          title="Excluir anotação"
          onClick={() => { if (confirm(`Excluir a anotação "${note.title}" e seus arquivos?`)) delNote(note.id) }}
        ><Trash2 size={16} /></button>
      </div>

      {initial === undefined
        ? <div className="editor-loading">Carregando anotação…</div>
        : <RichEditor initial={initial} onChange={onChange} />}

      <NoteFiles note={note} />
    </div>
  )
}

export default function ClassView({ classId }) {
  const { data, nav, addNote } = useStore()
  const [selId, setSelId] = useState(null)
  const [modal, setModal] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())

  const cls = data.classes.find(c => c.id === classId)
  const notes = data.notes
    .filter(n => n.classId === classId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.updatedAt - a.updatedAt)

  // Mantém uma anotação válida selecionada
  useEffect(() => {
    if (!notes.find(n => n.id === selId)) setSelId(notes[0]?.id ?? null)
  }, [notes.length, selId, classId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!cls) {
    return (
      <div className="view">
        <button className="btn-ghost" onClick={() => nav('studies')}><ChevronLeft size={16} /> Voltar</button>
        <p className="panel-empty">Aula não encontrada.</p>
      </div>
    )
  }

  const selected = notes.find(n => n.id === selId)

  const openNewNote = () => {
    setTitle(`Aula ${notes.length + 1}`)
    setDate(todayISO())
    setModal(true)
  }

  const createNote = async e => {
    e.preventDefault()
    const n = await addNote(classId, { title: title.trim() || `Aula ${notes.length + 1}`, date })
    if (!n) return // erro já avisado pelo store
    setSelId(n.id)
    setModal(false)
  }

  return (
    <div className="view view-wide class-view">
      <header className="view-head">
        <div>
          <button className="btn-back" onClick={() => nav('semester', { semesterId: cls.semesterId })}>
            <ChevronLeft size={16} /> Voltar à grade
          </button>
          <h1><span className="class-dot" style={{ background: cls.color }} /> {cls.name}</h1>
          <p className="view-sub">
            {(cls.slots || []).map(s => `${DAYS[s.day]} ${s.start}–${s.end}`).join(' · ')}
            {cls.professor ? ` · Prof. ${cls.professor}` : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openNewNote}><Plus size={16} /> Nova anotação</button>
      </header>

      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma anotação ainda"
          text={`Crie sua primeira anotação desta matéria — ex.: "Aula 1 — ${formatBR(todayISO())}".`}
        >
          <button className="btn-primary" onClick={openNewNote}><Plus size={16} /> Criar anotação</button>
        </EmptyState>
      ) : (
        <div className="class-layout">
          <aside className="notes-list panel">
            <div className="panel-head"><h2>Anotações</h2><small className="panel-sub">{notes.length}</small></div>
            <ul>
              {notes.map(n => (
                <li
                  key={n.id}
                  className={'note-item' + (n.id === selId ? ' selected' : '')}
                  onClick={() => setSelId(n.id)}
                >
                  <strong>{n.title}</strong>
                  <small>
                    <Clock size={11} /> {n.date ? formatBR(n.date) : 'sem data'}
                    {n.attachments?.length > 0 && (
                      <span className="note-clip" title={`${n.attachments.length} arquivo(s)`}>
                        <Paperclip size={11} /> {n.attachments.length}
                      </span>
                    )}
                  </small>
                </li>
              ))}
            </ul>
          </aside>

          <section className="panel note-editor-panel">
            {selected
              ? <NoteEditorPane key={selected.id} note={selected} />
              : <p className="panel-empty">Selecione uma anotação ao lado.</p>}
          </section>
        </div>
      )}

      {modal && (
        <Modal title="Nova anotação" onClose={() => setModal(false)} width={420}>
          <form onSubmit={createNote} className="modal-form">
            <Field label="Título" hint="Sugestão automática seguindo sua numeração de aulas.">
              <input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            </Field>
            <Field label="Data da aula">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Criar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
