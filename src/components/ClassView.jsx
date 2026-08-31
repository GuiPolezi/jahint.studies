import { useEffect, useState } from 'react'
import {
  ChevronLeft, Plus, Trash2, FileText, Clock, Paperclip, MoreHorizontal,
  FileDown, Share2, Briefcase, LayoutDashboard,
} from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { Modal, Field, EmptyState, FilesArea } from './ui'
import RichEditor, { useAutosaveContent, SaveStatus } from './RichEditor'
import { formatBR, todayISO, DAYS } from '../lib/utils'

// Painel do editor — remontado por anotação (key) para isolar carregamento/
// salvamento. clsName alimenta o cabeçalho que só existe na impressão.
function NoteEditorPane({ note, clsName }) {
  const { updNote } = useStore()
  const { initial, status, onChange } = useAutosaveContent('note', note.id)

  return (
    <div className="note-editor-pane">
      {/* Linha discreta no topo do documento: título (espelho do topbar,
          que é quem edita) + data editável + estado do salvamento */}
      <div className="note-doc-head">
        <span className="note-doc-title">{note.title}</span>
        <span className="note-doc-sep">—</span>
        <input
          type="date"
          className="note-date-input subtle"
          value={note.date || ''}
          onChange={e => updNote(note.id, { date: e.target.value })}
          title="Data da aula"
        />
        <SaveStatus status={status} />
      </div>

      {/* Só aparece no papel (styles.print.css): identifica o documento */}
      <div className="print-head">
        <h1>{note.title}</h1>
        <p>{clsName}{note.date ? ` — ${formatBR(note.date)}` : ''}</p>
      </div>

      {initial === undefined
        ? <div className="editor-loading">Carregando anotação…</div>
        : <RichEditor initial={initial} onChange={onChange} />}
    </div>
  )
}

export default function ClassView({ classId }) {
  const {
    data, nav, addNote, updNote, delNote,
    uploadNoteAttachment, delNoteAttachment, downloadNoteAttachment,
  } = useStore()
  const [selId, setSelId] = useState(null)
  const [modal, setModal] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [menuOpen, setMenuOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)

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

  const deleteSelected = () => {
    if (!selected) return
    if (confirm(`Excluir a anotação "${selected.title}" e seus arquivos?`)) delNote(selected.id)
  }

  // Isolada de propósito: trocar a estratégia (ex.: PDF gerado no servidor)
  // não toca no menu. A folha styles.print.css transforma a página no documento.
  const exportNotePdf = () => {
    setMenuOpen(false)
    window.print()
  }

  // Compartilha um resumo da anotação: nativo no celular, cópia no desktop.
  // (Sem link direto possível: a navegação do app vive em memória, não em URL.)
  const shareNote = async () => {
    setMenuOpen(false)
    if (!selected) return
    const text = `${cls.name} — ${selected.title}${selected.date ? ` (${formatBR(selected.date)})` : ''}`
    if (navigator.share) {
      try { await navigator.share({ title: selected.title, text }) } catch { /* usuário cancelou */ }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      alert('Resumo copiado para a área de transferência.')
    } catch {
      alert('Não foi possível compartilhar neste navegador.')
    }
  }

  const attachCount = selected?.attachments?.length || 0

  return (
    <div className="view view-wide class-view">
      {/* Topbar flutuante: Voltar · título da anotação (editável) · ações.
          O grid usa as mesmas colunas do .class-layout, então o título
          nasce alinhado sobre a coluna do editor. */}
      <header className="class-topbar">
        <button className="btn-back" onClick={() => nav('semester', { semesterId: cls.semesterId })}>
          <ChevronLeft size={15} /> Voltar
        </button>

        {selected ? (
          <input
            className="class-note-title"
            value={selected.title}
            onChange={e => updNote(selected.id, { title: e.target.value })}
            placeholder="Título da anotação"
          />
        ) : (
          <h1 className="class-note-title as-heading">{cls.name}</h1>
        )}

        {selected && (
          <div className="class-topbar-actions">
            <button className="btn-danger btn-sm" onClick={deleteSelected}>
              <Trash2 size={14} /> Excluir
            </button>
            <span className="menu-wrap">
              <button
                className="dots-btn"
                onClick={() => setMenuOpen(o => !o)}
                title="Mais ações"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <>
                  <div className="pop-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="popover class-menu">
                    <button className="tb-menu-item" onClick={exportNotePdf}>
                      <FileDown size={15} /> Exportar PDF
                    </button>
                    <button className="tb-menu-item" onClick={shareNote}>
                      <Share2 size={15} /> Compartilhar
                    </button>
                    <button className="tb-menu-item" onClick={() => { setMenuOpen(false); setFilesOpen(true) }}>
                      <Paperclip size={15} /> Arquivos{attachCount > 0 ? ` (${attachCount})` : ''}
                    </button>
                  </div>
                </>
              )}
            </span>
          </div>
        )}
      </header>

      <div className="class-layout">
        {/* Coluna esquerda: identidade da matéria + anotações + atalhos */}
        <div className="class-side">
          <aside className="panel class-side-panel">
            <span className="class-accent-bar" style={{ background: cls.color }} />
            <h2 className="class-side-name">{cls.name}</h2>
            <div className="class-side-meta">
              {cls.professor && <span>Prof. {cls.professor}</span>}
              {(cls.slots || []).length > 0 && (
                <span>{cls.slots.map(s => `${DAYS[s.day]} ${s.start}–${s.end}`).join(' · ')}</span>
              )}
            </div>

            <div className="notes-list-head">Anotações <span>{notes.length}</span></div>
            <button className="note-add-btn" onClick={openNewNote}>
              <Plus size={15} /> Nova Anotação
            </button>
            <ul className="notes-list">
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

          <div className="class-quicknav">
            <div className="quicknav-row">
              <button className="quicknav-btn" onClick={() => nav('works', { semesterId: cls.semesterId })}>
                <Briefcase size={14} /> Trabalhos
              </button>
              <button className="quicknav-btn" onClick={() => nav('exams', { semesterId: cls.semesterId })}>
                <FileText size={14} /> Provas
              </button>
            </div>
            <button className="quicknav-btn quicknav-wide" onClick={() => nav('dashboard')}>
              <LayoutDashboard size={14} /> Dashboard
            </button>
          </div>
        </div>

        {/* Coluna direita: o documento */}
        <section className="panel note-editor-panel">
          {selected ? (
            <NoteEditorPane key={selected.id} note={selected} clsName={cls.name} />
          ) : notes.length === 0 ? (
            <EmptyState
              className="in-panel"
              icon={FileText}
              title="Nenhuma anotação ainda"
              text={`Crie sua primeira anotação desta matéria — ex.: "Aula 1 — ${formatBR(todayISO())}".`}
            >
              <button className="btn-primary" onClick={openNewNote}><Plus size={16} /> Criar anotação</button>
            </EmptyState>
          ) : (
            /* instante entre o render e o guard de seleção escolher a 1ª nota */
            <p className="panel-empty">Selecione uma anotação ao lado.</p>
          )}
        </section>
      </div>

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

      {filesOpen && selected && (
        <Modal title="Arquivos da aula" onClose={() => setFilesOpen(false)} width={520}>
          <FilesArea
            files={selected.attachments}
            hint="Slides, listas de exercícios, códigos — até 25MB por arquivo."
            onUpload={f => uploadNoteAttachment(selected.id, f)}
            onDelete={attId => delNoteAttachment(selected.id, attId)}
            onDownload={downloadNoteAttachment}
          />
        </Modal>
      )}
    </div>
  )
}
