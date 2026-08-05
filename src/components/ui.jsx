import { X } from 'lucide-react'
import { daysUntil, urgency, urgencyLabel, CLASS_COLORS } from '../lib/utils'

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

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-icon"><Icon size={34} /></div>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  )
}
