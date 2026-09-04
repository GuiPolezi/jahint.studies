import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ChevronLeft, Plus, X, Trash2, MoreHorizontal, FileDown, Share2, Paperclip,
  GraduationCap, FileText, LayoutDashboard,
} from 'lucide-react'
import { useStore, classInfo, ClassSelect } from '../store/StoreProvider'
import { DueChip, Modal, FilesArea, EmptyState } from './ui'
import RichEditor, { useAutosaveContent, SaveStatus } from './RichEditor'
import { formatBR } from '../lib/utils'
import { DELIVERY_OPTIONS } from './WorksView'

// Título do trabalho em até duas linhas: um <input> não quebra linha, então é
// um <textarea> de uma linha só que cresce com o texto (altura = scrollHeight).
function useAutoGrow(ref, value) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight + 2}px` // +2 = as duas bordas (box-sizing: border-box)
  }, [value])
}

// Pizza de progresso em SVG: um círculo com stroke igual ao raio vira um setor
// preenchido. Com pathLength=100 o dashoffset é o próprio "% que falta", e a
// transição CSS anima o setor. Nasce em 0 e cresce até o valor ao montar.
function ProgressPie({ value, open, onClick }) {
  const done = value >= 100
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(id)
  }, [value])

  return (
    <div className="work-pie">
      <span className="work-pie-label">{value}%</span>
      <button
        type="button"
        className="work-pie-btn"
        onClick={onClick}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Progresso ${value}% — alterar`}
        title="Alterar progresso"
      >
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <defs>
            <linearGradient id="work-pie-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#56c8ff" />
              <stop offset="1" stopColor="#0060df" />
            </linearGradient>
            <linearGradient id="work-pie-grad-done" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4ade80" />
              <stop offset="1" stopColor="#16a34a" />
            </linearGradient>
          </defs>
          <circle className="work-pie-track" cx="20" cy="20" r="18" />
          <circle
            className="work-pie-sector"
            cx="20" cy="20" r="9" fill="none" strokeWidth="18" pathLength="100"
            transform="rotate(-90 20 20)"
            stroke={`url(#${done ? 'work-pie-grad-done' : 'work-pie-grad'})`}
            style={{ strokeDasharray: '100 100', strokeDashoffset: 100 - shown }}
          />
          <ellipse className="work-pie-gloss" cx="20" cy="12" rx="11" ry="6" />
        </svg>
      </button>
    </div>
  )
}

// "+ Adicionar": chip tracejado que vira um campo em pílula no mesmo lugar.
// Enter confirma e continua aberto (para o próximo nome); Esc cancela; sair do
// campo confirma o que foi digitado, ou só fecha se estiver vazio.
function MemberAdd({ onAdd }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  // Esc desmonta o campo, e alguns navegadores disparam blur nessa hora —
  // sem esta trava o blur confirmaria o nome que acabou de ser cancelado.
  const cancelled = useRef(false)

  const commit = () => {
    const n = name.trim()
    if (n) onAdd(n)
    setName('')
  }

  if (!adding) {
    return (
      <button type="button" className="member-add-chip" onClick={() => setAdding(true)}>
        <Plus size={12} /> Adicionar
      </button>
    )
  }
  return (
    <form className="member-add-inline" onSubmit={e => { e.preventDefault(); commit() }}>
      <input
        autoFocus
        value={name}
        placeholder="Nome…"
        aria-label="Nome do integrante"
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Escape') return
          cancelled.current = true
          setName('')
          setAdding(false)
        }}
        onBlur={() => {
          if (cancelled.current) { cancelled.current = false; return }
          commit()
          setAdding(false)
        }}
      />
    </form>
  )
}

function WorkTabs({ tabs, tabId, onSelect, onAdd, onDelete }) {
  return (
    <div className="work-tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === tabId}
          className={'work-tab' + (t.id === tabId ? ' active' : '')}
          onClick={() => onSelect(t.id)}
        >
          {t.title}
          {tabs.length > 1 && t.id === tabId && (
            <span
              className="chip-x"
              title="Excluir aba"
              onClick={e => { e.stopPropagation(); onDelete(t) }}
            ><X size={12} /></span>
          )}
        </button>
      ))}
      <button className="work-tab add" onClick={onAdd} title="Nova aba de anotações"><Plus size={14} /></button>
    </div>
  )
}

// Editor da aba — remontado por aba (key) para isolar carregamento e
// salvamento. O status de salvamento é informado ao pai, que o mostra na
// própria linha das abas (assim a linha não remonta a cada troca).
function TabEditor({ tab, workId, onStatus }) {
  const { touchWorkNote } = useStore()
  // Cada gravação vira "anotado hoje" no Painel de Foco
  const { initial, status, onChange } = useAutosaveContent('tab', tab.id, {
    onSaved: () => touchWorkNote(workId),
  })
  useEffect(() => { onStatus(status) }, [status, onStatus])

  if (initial === undefined) return <div className="editor-loading">Carregando…</div>
  return <RichEditor initial={initial} onChange={onChange} placeholder={`Anotações de "${tab.title}"…`} />
}

export default function WorkDetail({ workId }) {
  const {
    data, nav, updWork, delWork, addWorkTab, delWorkTab,
    addWorkMember, delWorkMember,
    uploadAttachment, delAttachment, downloadAttachment,
  } = useStore()
  const [tabId, setTabId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  const titleRef = useRef(null)

  const work = data.works.find(w => w.id === workId)

  // Hooks antes do guard (regra dos hooks)
  useAutoGrow(titleRef, work?.title)

  useEffect(() => {
    if (work && !work.tabs.find(t => t.id === tabId)) setTabId(work.tabs[0]?.id ?? null)
  }, [work, tabId])

  // Esc fecha o menu ••• e o popover de progresso
  useEffect(() => {
    if (!menuOpen && !progressOpen) return
    const onKey = e => { if (e.key === 'Escape') { setMenuOpen(false); setProgressOpen(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, progressOpen])

  if (!work) {
    return (
      <div className="view">
        <button className="btn-ghost" onClick={() => nav('works')}><ChevronLeft size={16} /> Voltar</button>
        <p className="panel-empty">Trabalho não encontrado.</p>
      </div>
    )
  }

  const { cls, sem, year } = classInfo(data, work.classId)
  const clsName = cls?.name ?? 'Sem matéria'
  const activeTab = work.tabs.find(t => t.id === tabId)
  const progress = work.progress ?? 0
  const done = progress >= 100
  const typeLabel = work.type === 'trabalho' ? 'Trabalho (Final)' : 'Tarefa'
  const termFull = sem && year ? `${year.number}º Ano · ${sem.number}º Semestre` : ''
  const attachCount = work.attachments?.length || 0
  const backToWorks = () => nav('works', { yearId: year?.id, semesterId: sem?.id })

  const addTab = async () => {
    const title = window.prompt('Nome da nova aba de anotações:', 'Nova anotação')
    if (!title?.trim()) return
    const t = await addWorkTab(work.id, title.trim())
    if (t) setTabId(t.id)
  }
  const deleteTab = t => {
    if (confirm(`Excluir a aba "${t.title}" e seu conteúdo?`)) delWorkTab(work.id, t.id)
  }
  const deleteWork = () => {
    if (!confirm(`Excluir "${work.title}" e todas as suas anotações e arquivos?`)) return
    delWork(work.id)
    backToWorks()
  }

  // Mesma estratégia da aula: a folha styles.print.css transforma a página no documento.
  const exportPdf = () => {
    setMenuOpen(false)
    window.print()
  }

  // Compartilha um resumo do trabalho: nativo no celular, cópia no desktop.
  // (Sem link direto possível: a navegação do app vive em memória, não em URL.)
  const shareWork = async () => {
    setMenuOpen(false)
    const text = `${clsName} — ${work.title}${work.dueDate ? ` (entrega ${formatBR(work.dueDate)})` : ''}`
    if (navigator.share) {
      try { await navigator.share({ title: work.title, text }) } catch { /* usuário cancelou */ }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      alert('Resumo copiado para a área de transferência.')
    } catch {
      alert('Não foi possível compartilhar neste navegador.')
    }
  }

  return (
    <div className="view view-wide class-view work-view">
      {/* Mesmo esqueleto da página de aula (.class-topbar / .class-layout):
          Voltar sobre a coluna lateral, nome da matéria sobre o editor, ações
          à direita. .work-view é só o namespace dos ajustes desta tela. */}
      <header className="class-topbar">
        <button className="btn-back" onClick={backToWorks}>
          <ChevronLeft size={15} /> Voltar
        </button>

        <h1 className="class-note-title as-heading">{clsName}</h1>

        <div className="class-topbar-actions">
          <button className="btn-danger btn-sm" onClick={deleteWork}>
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
                  <button className="tb-menu-item" onClick={exportPdf}>
                    <FileDown size={15} /> Exportar PDF
                  </button>
                  <button className="tb-menu-item" onClick={shareWork}>
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
      </header>

      <div className="class-layout">
        {/* Coluna esquerda: identidade + detalhes + integrantes + progresso, e os atalhos */}
        <div className="class-side">
          {/* O popover de progresso ancora aqui, FORA do .panel: o backdrop-filter
              do painel viraria containing block do .pop-backdrop (position: fixed),
              que deixaria de cobrir a tela. */}
          <div className="work-side-anchor">
            <aside className="panel class-side-panel work-side-panel">
              <div className="work-side-top">
                <div className="work-side-chiprow">
                  <span className="class-chip" style={{ '--cls-color': cls?.color ?? '#94a3b8' }}>{clsName}</span>
                  {termFull && <small className="work-side-term">{termFull}</small>}
                </div>
                <textarea
                  ref={titleRef}
                  className="work-side-title"
                  rows={1}
                  value={work.title}
                  placeholder="Título do trabalho"
                  aria-label="Título do trabalho"
                  onChange={e => updWork(work.id, { title: e.target.value.replace(/\n/g, ' ') })}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
                />
                <p className="work-side-sub">
                  <span>{typeLabel}</span>
                  <span className="work-side-sub-sep">—</span>
                  <span>{work.dueDate ? `Data Entrega: ${formatBR(work.dueDate)}` : 'sem data de entrega'}</span>
                </p>
              </div>

              {/* No modo documento este bloco rola por dentro; o topo fica fixo */}
              <div className="work-side-body">
                <section className="work-side-section">
                  <h3 className="work-side-head">Detalhes</h3>
                  <div className="work-side-fields">
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
                      <span className="field-label">Data de Entrega</span>
                      <input type="date" value={work.dueDate || ''} onChange={e => updWork(work.id, { dueDate: e.target.value })} />
                    </label>
                    <label className="field">
                      <span className="field-label">Forma de Entrega</span>
                      <select value={work.delivery} onChange={e => updWork(work.id, { delivery: e.target.value })}>
                        {DELIVERY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        {!DELIVERY_OPTIONS.includes(work.delivery) && <option>{work.delivery}</option>}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="work-side-section">
                  <h3 className="work-side-head">Integrantes <span>{work.members.length}</span></h3>
                  <div className="work-side-members">
                    <MemberAdd onAdd={name => addWorkMember(work.id, name)} />
                    {work.members.map(m => (
                      <span key={m.id} className="member-chip">
                        {m.name}
                        <button
                          type="button"
                          className="chip-x"
                          title="Remover integrante"
                          onClick={() => delWorkMember(work.id, m.id)}
                        ><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                </section>
              </div>

              {/* Fora da área rolável: prazo e progresso ficam sempre à vista,
                  mesmo com uma lista longa de integrantes acima */}
              <section className="work-side-section work-side-foot">
                <h3 className="work-side-head">Progresso</h3>
                <div className="work-side-progress">
                  {done
                    ? <span className="due-chip due-done">Concluído 🎉</span>
                    : work.dueDate
                      ? <DueChip date={work.dueDate} />
                      : <span className="due-chip due-nodate">Sem data</span>}
                  <ProgressPie value={progress} open={progressOpen} onClick={() => setProgressOpen(o => !o)} />
                </div>
              </section>
            </aside>

            {progressOpen && (
              <>
                <div className="pop-backdrop" onClick={() => setProgressOpen(false)} />
                <div className="popover progress-pop" role="dialog" aria-label="Alterar progresso">
                  <div className="progress-pop-head">
                    <span>Progresso</span>
                    <strong>{progress}%</strong>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={progress}
                    autoFocus
                    aria-label="Progresso do trabalho"
                    onChange={e => updWork(work.id, { progress: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="class-quicknav">
            <div className="quicknav-row">
              <button className="quicknav-btn" onClick={() => nav('studies')}>
                <GraduationCap size={14} /> Meus Estudos
              </button>
              <button className="quicknav-btn" onClick={() => nav('exams', { semesterId: sem?.id })}>
                <FileText size={14} /> Provas
              </button>
            </div>
            <button className="quicknav-btn quicknav-wide" onClick={() => nav('dashboard')}>
              <LayoutDashboard size={14} /> Dashboard
            </button>
          </div>
        </div>

        {/* Coluna direita: o documento (abas + editor) */}
        <section className="panel note-editor-panel">
          {activeTab ? (
            <div className="note-editor-pane">
              <div className="work-tabs-bar">
                <WorkTabs tabs={work.tabs} tabId={tabId} onSelect={setTabId} onAdd={addTab} onDelete={deleteTab} />
                <span className="work-tabs-status"><SaveStatus status={saveStatus} /></span>
              </div>

              {/* Só aparece no papel (styles.print.css): identifica o documento */}
              <div className="print-head">
                <h1>{work.title}</h1>
                <p>{clsName}{work.dueDate ? ` — entrega ${formatBR(work.dueDate)}` : ''} · {activeTab.title}</p>
              </div>

              <TabEditor key={activeTab.id} tab={activeTab} workId={work.id} onStatus={setSaveStatus} />
            </div>
          ) : (
            <EmptyState
              className="in-panel"
              icon={FileText}
              title="Nenhuma aba de anotação"
              text="Crie uma aba para começar a anotar — ex.: Descrição, Rascunho, Desenvolvimento."
            >
              <button className="btn-primary" onClick={addTab}><Plus size={16} /> Nova aba</button>
            </EmptyState>
          )}
        </section>
      </div>

      {filesOpen && (
        <Modal title="Arquivos do trabalho" onClose={() => setFilesOpen(false)} width={520}>
          <FilesArea
            files={work.attachments}
            hint="Requisitos em PDF, códigos, ZIPs — até 25MB por arquivo. Tudo fica salvo na sua conta, no servidor."
            onUpload={f => uploadAttachment(work.id, f)}
            onDelete={attId => delAttachment(work.id, attId)}
            onDownload={downloadAttachment}
          />
        </Modal>
      )}
    </div>
  )
}
