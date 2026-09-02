import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Grip, X } from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { SaveStatus } from './RichEditor'
import { formatBR, toISO, agoLabel } from '../lib/utils'
import {
  FOCUS_LANES, laneInfo, pendingWorks, groupByLane, stats, nextDays, dueText, buildBriefing,
} from '../lib/focus'

/* Painel de Foco — o popup do botão ⠿ de Trabalhos. Duas metades:
   - Meu rascunho: papel de pauta com texto livre, permanente, um por usuário
     (a "organização mental" em palavras);
   - Panorama: números, faixa dos próximos 14 dias e as trilhas de foco que o
     usuário atribui a cada trabalho pendente.
   No topo, o briefing: frases geradas a partir das trilhas e dos prazos. */

// "Editado em 02/09/2026 às 10:28"
function editedLabel(ts) {
  if (!ts) return 'Ainda sem rascunho salvo'
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `Editado em ${formatBR(toISO(d))} às ${hh}:${mm}`
}

// Nome de trabalho dentro de uma frase: clicável, na cor da matéria
function WorkLink({ part, onOpenWork }) {
  return (
    <button
      type="button"
      className="fb-work-link"
      style={part.color ? { '--cls-color': part.color } : undefined}
      onClick={() => onOpenWork(part.workId)}
    >{part.title}</button>
  )
}

function Briefing({ lines, onOpenWork }) {
  return (
    <div className="fb-brief" role="region" aria-label="Briefing">
      {lines.map((l, i) => (
        <p key={i} className={'fb-brief-line' + (l.alert ? ' is-alert' : '') + (l.muted ? ' is-muted' : '')}>
          <span className="fb-brief-icon" aria-hidden="true">{l.icon}</span>
          <span className="fb-brief-text">
            {l.parts.map((p, j) => (typeof p === 'string' ? p : <WorkLink key={j} part={p} onOpenWork={onOpenWork} />))}
          </span>
        </p>
      ))}
    </div>
  )
}

/* O papel: estado local enquanto digita, debounce de 600 ms e gravação pelo
   store só no salvamento — um patch por tecla re-renderizaria a estante 3D
   atrás do painel. Fechar o painel ou sair da página grava o que estava
   esperando o debounce. */
function DraftPaper({ open }) {
  const { data, updFocusBoard } = useStore()
  const [text, setText] = useState(data.focusBoard.draft)
  const [status, setStatus] = useState('idle')
  const timer = useRef(null)
  const pending = useRef(null)

  // Ao abrir, parte do que está salvo (pode ter sido editado em outro aparelho)
  useEffect(() => {
    if (open) { setText(data.focusBoard.draft); setStatus('idle') }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    timer.current = null
    if (pending.current === null) return
    const draft = pending.current
    pending.current = null
    const res = await updFocusBoard({ draft })
    setStatus(res ? 'saved' : 'error')
  }, [updFocusBoard])

  const onChange = e => {
    const v = e.target.value
    setText(v)
    pending.current = v
    setStatus('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 600)
  }

  useEffect(() => { if (!open) flush() }, [open, flush])
  useEffect(() => () => { flush() }, [flush]) // desmontou (navegou para um trabalho)

  return (
    <section className="fb-pane fb-draft-pane" aria-label="Meu rascunho">
      <header className="fb-pane-head">
        <h3 className="fb-pane-title">Meu rascunho</h3>
        <SaveStatus status={status} />
      </header>
      <textarea
        className="fb-draft"
        value={text}
        onChange={onChange}
        placeholder="Como você organizou os trabalhos? O que vem primeiro, o que fica para o fim de semana, o que precisa de atenção…"
      />
      <p className="fb-draft-foot">{editedLabel(data.focusBoard.updatedAt)}</p>
    </section>
  )
}

function DaysStrip({ days }) {
  return (
    <ol className="fb-strip" aria-label="Entregas nos próximos 14 dias">
      {days.map(d => (
        <li
          key={d.iso}
          className={'fb-day' + (d.isToday ? ' is-today' : '') + (d.isWeekend ? ' is-weekend' : '') + (d.works.length ? ' has-due' : '')}
          title={`${d.dow} ${formatBR(d.iso)}` + (d.works.length ? '\n' + d.works.map(w => `• ${w.title}`).join('\n') : '')}
        >
          <span className="fb-day-dow">{d.dow[0]}</span>
          <span className="fb-day-num">{d.dayNum}</span>
          <span className="fb-day-dots">
            {d.works.slice(0, 3).map(w => <i key={w.id} style={{ background: w.cls?.color || 'var(--accent)' }} />)}
            {d.works.length > 3 && <small>+{d.works.length - 3}</small>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/* Seletor de trilha: fica centralizado dentro do dialog (o backdrop-filter do
   .paper-modal faz dele o bloco de referência de position: fixed), então não
   é cortado pela rolagem do panorama. O ritmo digitado é gravado ao escolher
   uma trilha, ao dar Enter ou ao clicar fora. */
function LanePicker({ w, onClose, onChange }) {
  const [note, setNote] = useState(w.focusNote || '')
  const noteValue = () => note.trim() || null
  const pick = id => { onChange({ focus: id, focusNote: noteValue() }); onClose() }
  const dismiss = () => {
    if (noteValue() !== (w.focusNote || null)) onChange({ focusNote: noteValue() })
    onClose()
  }
  const clear = () => { onChange({ focus: null, focusNote: null }); onClose() }
  return (
    <>
      <div className="pop-backdrop" onClick={dismiss} />
      <div className="fb-pop" role="menu" aria-label={`Trilha de ${w.title}`}>
        <span className="tb-menu-label">Trilha</span>
        {FOCUS_LANES.map(l => (
          <button
            key={l.id}
            type="button"
            role="menuitemradio"
            aria-checked={w.focus === l.id}
            className={'tb-menu-item' + (w.focus === l.id ? ' active' : '')}
            onClick={() => pick(l.id)}
          >
            <span className="fb-pop-emoji" aria-hidden="true">{l.emoji}</span>
            <span className="fb-pop-lane"><b>{l.label}</b><small>{l.hint}</small></span>
          </button>
        ))}
        <div className="tb-menu-sep" />
        <label className="fb-pop-note">
          <span className="tb-menu-label">Ritmo (opcional)</span>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={120}
            placeholder="ex.: fins de semana, 30 min/dia"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); dismiss() } }}
          />
        </label>
        {w.focus && (
          <>
            <div className="tb-menu-sep" />
            <button type="button" className="tb-menu-item fb-pop-clear" onClick={clear}>Sem trilha</button>
          </>
        )}
      </div>
    </>
  )
}

function LaneRow({ w, onOpenWork, pickerOpen, onPicker }) {
  const { updWork } = useStore()
  const lane = laneInfo(w.focus)
  return (
    <li className="fb-row" style={{ '--cls-color': w.cls?.color || 'var(--accent)' }}>
      <div className="fb-row-main">
        <button type="button" className="fb-row-title" onClick={() => onOpenWork(w.id)}>{w.title}</button>
        <div className="fb-row-meta">
          {w.cls && <span className="fb-row-class">{w.cls.name}</span>}
          <span className={'fb-row-due' + (w.days == null ? '' : ' du-' + w.urgency)}>{dueText(w)}</span>
          <span className="fb-row-bar" title={`${w.progress}% feito`}>
            <span className="progress-track"><span className="progress-fill" style={{ width: `${w.progress}%` }} /></span>
            {w.progress}%
          </span>
          <span className="fb-row-note">{w.lastNoteAt ? `anotado ${agoLabel(w.lastNoteAt)}` : 'sem anotações'}</span>
          {w.focusNote && <em className="fb-row-rhythm">{w.focusNote}</em>}
        </div>
      </div>
      <span className="fb-row-pick">
        <button
          type="button"
          className={'fb-lane-pill' + (lane ? ' lane-' + lane.id : '')}
          onClick={() => onPicker(pickerOpen ? null : w.id)}
          aria-haspopup="menu"
          aria-expanded={pickerOpen}
          title="Definir trilha"
        >
          {lane ? <><span aria-hidden="true">{lane.emoji}</span>{lane.label}</> : 'Definir trilha'}
          <ChevronDown size={12} />
        </button>
        {pickerOpen && (
          <LanePicker w={w} onClose={() => onPicker(null)} onChange={changes => updWork(w.id, changes)} />
        )}
      </span>
    </li>
  )
}

function Lanes({ groups, onOpenWork, pickerFor, setPickerFor }) {
  const rows = list => (
    <ul className="fb-rows">
      {list.map(w => (
        <LaneRow key={w.id} w={w} onOpenWork={onOpenWork} pickerOpen={pickerFor === w.id} onPicker={setPickerFor} />
      ))}
    </ul>
  )
  return (
    <div className="fb-lanes">
      {FOCUS_LANES.map(l => (
        <section key={l.id} className={'fb-lane lane-' + l.id}>
          <h4 className="fb-lane-head">
            <span className="fb-lane-emoji" aria-hidden="true">{l.emoji}</span>
            {l.label} <span className="fb-lane-count">({groups[l.id].length})</span>
          </h4>
          {groups[l.id].length
            ? rows(groups[l.id])
            : <p className="fb-lane-empty">{l.id === 'now' ? 'Escolha o trabalho que merece sua atenção agora.' : '— vazio —'}</p>}
        </section>
      ))}
      {groups.none.length > 0 && (
        <section className="fb-lane lane-none">
          <h4 className="fb-lane-head">
            Sem trilha <span className="fb-lane-count">({groups.none.length})</span>
            <span className="fb-lane-hint">· defina uma trilha para o briefing montar seu roteiro</span>
          </h4>
          {rows(groups.none)}
        </section>
      )}
    </div>
  )
}

function Panorama({ works, onOpenWork, pickerFor, setPickerFor }) {
  const s = stats(works)
  return (
    <section className="fb-pane fb-panorama" aria-label="Panorama">
      <header className="fb-pane-head"><h3 className="fb-pane-title">Panorama</h3></header>
      <div className="fb-stats">
        <div className="fb-stat">
          <span className="fb-stat-label">Pendentes</span>
          <strong className="fb-stat-value">{s.pending}</strong>
        </div>
        <div className={'fb-stat' + (s.thisWeek ? ' is-warn' : '')}>
          <span className="fb-stat-label">Esta semana</span>
          <strong className="fb-stat-value">{s.thisWeek}</strong>
        </div>
        <div className={'fb-stat' + (s.late ? ' is-late' : ' is-ok')}>
          <span className="fb-stat-label">Atrasados</span>
          <strong className="fb-stat-value">{s.late || '0 ✓'}</strong>
        </div>
      </div>
      <h4 className="fb-sub">Próximos 14 dias</h4>
      <DaysStrip days={nextDays(works, 14)} />
      <Lanes groups={groupByLane(works)} onOpenWork={onOpenWork} pickerFor={pickerFor} setPickerFor={setPickerFor} />
    </section>
  )
}

/* Sempre montado (como o BookPaperModal), para o <dialog> nativo animar
   também a saída. O conteúdo deriva do store, então não precisa guardar o
   "último aberto". */
export default function FocusBoardModal({ open, onClose, onOpenWork }) {
  const { data, updFocusBoard } = useStore()
  const dlgRef = useRef(null)
  const bodyRef = useRef(null)
  const [pickerFor, setPickerFor] = useState(null) // id do trabalho com o seletor aberto
  const [mobileTab, setMobileTab] = useState('panorama')

  useEffect(() => {
    const dlg = dlgRef.current
    if (!dlg) return
    if (open) {
      if (!dlg.open) dlg.showModal()
      // showModal() foca o primeiro focável — a textarea — e no celular o
      // teclado subiria sozinho na abertura automática. O foco vai ao corpo.
      requestAnimationFrame(() => bodyRef.current?.focus({ preventScroll: true }))
    } else if (dlg.open) {
      setPickerFor(null)
      dlg.close()
    }
  }, [open])

  const works = pendingWorks(data)
  const lines = buildBriefing(data)
  const sub = works.length
    ? `${works.length} pendente${works.length === 1 ? '' : 's'}`
    : 'nada pendente'

  return (
    <dialog
      className="paper-modal fb-modal"
      ref={dlgRef}
      aria-label="Painel de foco"
      onClose={onClose}
      /* ESC com o seletor de trilha aberto fecha só o seletor. Cancelar o
         keydown impede o pedido de fechamento do dialog; o onCancel é só
         reserva — o Chrome ignora o preventDefault do cancel sem ativação
         recente do usuário. */
      onKeyDown={e => { if (e.key === 'Escape' && pickerFor) { e.preventDefault(); setPickerFor(null) } }}
      onCancel={e => { if (pickerFor) { e.preventDefault(); setPickerFor(null) } }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <button className="paper-close" type="button" aria-label="Fechar painel" onClick={onClose}>
        <X size={16} strokeWidth={2.25} />
      </button>

      <header className="fb-head">
        <span className="fb-head-icon" aria-hidden="true"><Grip size={18} /></span>
        <div className="fb-head-text">
          <h2 className="fb-title">Painel de Foco</h2>
          <p className="fb-sub-title">Seu resumo de organização · {sub}</p>
        </div>
        <label className="fb-switch" title="Mostrar este painel ao abrir Trabalhos">
          <input
            type="checkbox"
            checked={!!data.focusBoard.autoOpen}
            onChange={e => updFocusBoard({ autoOpen: e.target.checked })}
          />
          <span className="fb-switch-track" aria-hidden="true" />
          <span className="fb-switch-label">Abrir ao entrar</span>
        </label>
      </header>

      <Briefing lines={lines} onOpenWork={onOpenWork} />

      {/* Só no celular: uma metade por vez */}
      <div className="fb-tabs" role="tablist" aria-label="Seção do painel">
        {[['panorama', 'Panorama'], ['rascunho', 'Rascunho']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={mobileTab === id} onClick={() => setMobileTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className={'fb-body show-' + mobileTab} ref={bodyRef} tabIndex={-1}>
        <DraftPaper open={open} />
        <Panorama works={works} onOpenWork={onOpenWork} pickerFor={pickerFor} setPickerFor={setPickerFor} />
      </div>
    </dialog>
  )
}
