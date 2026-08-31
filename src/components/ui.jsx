import { useRef, useState } from 'react'
import {
  X, File, FileText, FileArchive, FileCode, FileImage,
  Paperclip, ChevronDown, Upload, Download, Trash2,
} from 'lucide-react'
import { daysUntil, urgency, urgencyLabel, CLASS_COLORS, formatBytes } from '../lib/utils'

export function Modal({ title, onClose, children, width = 540 }) {
  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width, maxWidth: '94vw' }}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} title="Fechar"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

// Chip de contagem regressiva com cor de urgência
export function DueChip({ date }) {
  const days = daysUntil(date)
  if (days == null) return null
  return <span className={`due-chip due-${urgency(days)}`}>{urgencyLabel(days)}</span>
}

export function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {CLASS_COLORS.map(c => (
        <button
          key={c}
          type="button"
          className={'color-dot' + (value === c ? ' selected' : '')}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  )
}

// Ícone do anexo pela extensão do nome. Compartilhado pelos anexos de
// trabalho e de anotação de aula, para os dois nunca divergirem.
export function fileIcon(att, size = 18) {
  const ext = (att.name.split('.').pop() || '').toLowerCase()
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return <FileText size={size} />
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive size={size} />
  if (['js', 'jsx', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'sql'].includes(ext)) return <FileCode size={size} />
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage size={size} />
  return <File size={size} />
}

// Upload em fila + input escondido, compartilhado pelas duas caras dos
// anexos (barra recolhível do trabalho e modal da aula).
function useSequentialUpload(onUpload, afterUpload) {
  const [uploading, setUploading] = useState(false)
  const input = useRef(null)

  const onFiles = async e => {
    const picked = [...(e.target.files || [])]
    e.target.value = ''
    if (!picked.length) return
    setUploading(true)
    // Sequencial de propósito: o upload paralelo de vários arquivos grandes
    // estourava o limite do proxy e a barra de progresso ficava sem sentido.
    for (const f of picked) await onUpload(f)
    setUploading(false)
    afterUpload?.()
  }

  return { uploading, input, onFiles }
}

// Lista de anexos (ícone + nome + tamanho + baixar/excluir) — uma só para
// trabalho e aula, para os dois nunca divergirem.
function FileList({ files, onDownload, onDelete }) {
  return (
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
            onClick={() => onDownload(att)}
          ><Download size={16} /></button>
          <button
            className="icon-btn danger"
            title="Excluir arquivo"
            onClick={() => { if (confirm(`Excluir o arquivo "${att.name}"?`)) onDelete(att.id) }}
          ><Trash2 size={16} /></button>
        </li>
      ))}
    </ul>
  )
}

// Área de arquivos sempre expandida — vive dentro do modal "Arquivos" da
// anotação de aula. Recebe callbacks; o dono (note) fica no pai.
export function FilesArea({ files = [], onUpload, onDelete, onDownload, hint, emptyLabel = 'Nenhum arquivo ainda.' }) {
  const { uploading, input, onFiles } = useSequentialUpload(onUpload)
  return (
    <div className="files-area">
      <div className="files-area-bar">
        {hint && <p className="files-area-hint">{hint}</p>}
        <button
          className="btn-ghost btn-sm"
          onClick={() => input.current?.click()}
          disabled={uploading}
        >
          <Upload size={13} /> {uploading ? 'Enviando…' : 'Anexar'}
        </button>
        <input ref={input} type="file" multiple hidden onChange={onFiles} />
      </div>
      {files.length === 0
        ? <p className="panel-empty">{emptyLabel}</p>
        : <FileList files={files} onDownload={onDownload} onDelete={onDelete} />}
    </div>
  )
}

// Barra de arquivos recolhível: uma linha fina que expande para a lista.
// Usada nos anexos de trabalho (na aula os arquivos viraram modal).
export function CollapsibleFiles({ files = [], onUpload, onDelete, onDownload, label, emptyLabel = 'Sem arquivos', hint }) {
  const [open, setOpen] = useState(false)
  const { uploading, input, onFiles } = useSequentialUpload(onUpload, () => setOpen(true)) // mostra o resultado do envio

  return (
    <div className="note-files">
      <div className="note-files-bar" title={hint}>
        <button
          className="note-files-toggle"
          onClick={() => setOpen(o => !o)}
          disabled={files.length === 0}
          aria-expanded={open}
        >
          <Paperclip size={13} />
          <span>{files.length ? `${label} (${files.length})` : emptyLabel}</span>
          {files.length > 0 && <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />}
        </button>
        <button
          className="btn-ghost btn-sm"
          onClick={() => input.current?.click()}
          disabled={uploading}
        >
          <Upload size={13} /> {uploading ? 'Enviando…' : 'Anexar'}
        </button>
        <input ref={input} type="file" multiple hidden onChange={onFiles} />
      </div>

      {open && files.length > 0 && (
        <FileList files={files} onDownload={onDownload} onDelete={onDelete} />
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, children, className = '' }) {
  return (
    <div className={'empty-state' + (className ? ' ' + className : '')}>
      {Icon && <div className="empty-icon"><Icon size={34} /></div>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  )
}
