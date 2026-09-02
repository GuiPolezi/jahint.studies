import { useEffect, useRef, useState } from 'react'
import { Briefcase, Grip, Plus, X } from 'lucide-react'
import {
  useStore, classInfo, termLabel, ClassSelect, defaultClassId, semestersOfYear,
} from '../store/StoreProvider'
import { Modal, Field, EmptyState } from './ui'
import FocusBoardModal from './FocusBoard'
import { formatBR, todayISO, daysUntil, urgency, urgencyLabel } from '../lib/utils'

export const DELIVERY_OPTIONS = ['Microsoft Teams', 'Em aula (em mãos)', 'E-mail', 'Outro']

export function WorkFormModal({ onClose, onCreated }) {
  const { data, addWork } = useStore()
  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState(() => defaultClassId(data))
  const [type, setType] = useState('tarefa')
  const [dueDate, setDueDate] = useState(todayISO())
  const [delivery, setDelivery] = useState(DELIVERY_OPTIONS[0])

  const save = async e => {
    e.preventDefault()
    if (!title.trim() || !classId) return
    const w = await addWork({ classId, title: title.trim(), type, dueDate, delivery })
    if (!w) return // erro já avisado pelo store
    onCreated?.(w)
    onClose()
  }

  return (
    <Modal title="Novo trabalho / tarefa" onClose={onClose} width={520}>
      <form onSubmit={save} className="modal-form">
        <Field label="Título *">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Trabalho final — sistema distribuído" autoFocus required />
        </Field>
        <Field label="Matéria vinculada *" hint="A matéria define o ano e o semestre do trabalho.">
          <ClassSelect data={data} value={classId} onChange={e => setClassId(e.target.value)} required />
        </Field>
        <Field label="Tipo">
          <div className="radio-row">
            <label className={'radio-pill' + (type === 'tarefa' ? ' on' : '')}>
              <input type="radio" checked={type === 'tarefa'} onChange={() => setType('tarefa')} />
              Tarefa cotidiana
            </label>
            <label className={'radio-pill' + (type === 'trabalho' ? ' on' : '')}>
              <input type="radio" checked={type === 'trabalho'} onChange={() => setType('trabalho')} />
              Trabalho (entrega final)
            </label>
          </div>
        </Field>
        <div className="form-grid">
          <Field label="Data de entrega">
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
          </Field>
          <Field label="Forma de entrega">
            <select value={delivery} onChange={e => setDelivery(e.target.value)}>
              {DELIVERY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">Criar</button>
        </div>
      </form>
    </Modal>
  )
}

// Entregas ordenadas pela data (sem data vai para o fim)
const byDue = (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')

// Chave do livro: a matéria (nome normalizado) dentro de um semestre. Se a
// mesma matéria foi cadastrada mais de uma vez no mesmo semestre, os
// registros duplicados se fundem num único livro — as entregas de todos
// aparecem juntas dentro dele, nunca em livros repetidos.
const bookKey = c => `${c.semesterId}::${c.name.trim().toLowerCase()}`

// Título da capa: quanto mais longo o nome da aula, menor a fonte
const coverFontSize = name =>
  name.length <= 12 ? '1.05rem' : name.length <= 28 ? '0.88rem' : '0.76rem'

/* Livro 3D — geometria adaptada de "Animated Books with CSS 3D Transforms"
   (Marco Barría / Codrops): capa com espessura, lombada própria e folhas em
   leque. A cor da capa (--cover) é a cor da aula. */
function Book3D({ cls, term, caption, onOpen }) {
  return (
    <figure
      className="book"
      style={{ '--cover': cls.color }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
      aria-label={`${cls.name} — ${caption}. Clique para ver as entregas.`}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onOpen()
      }}
    >
      {/* Capa frontal: sólido com 2 faces + bordas */}
      <ul className="hardcover_front">
        <li>
          <div className="coverDesign">
            <span>{term}</span>
            <h3 style={{ fontSize: coverFontSize(cls.name) }}>{cls.name}</h3>
          </div>
        </li>
        <li />
      </ul>

      {/* Folhas em leque */}
      <ul className="page">
        <li />
        <li><div className="hint"><p>Clique para ver<br />as entregas</p></div></li>
        <li />
        <li />
        <li />
      </ul>

      {/* Contracapa e lombada */}
      <ul className="hardcover_back"><li /><li /></ul>
      <ul className="book_spine"><li /><li /></ul>
    </figure>
  )
}

/* Uma entrega na pauta: o título ocupa a(s) linha(s) dele e os detalhes vêm
   na linha de baixo — em bloco, título e metadados nunca se misturam na
   mesma quebra. Concluídas ganham ✓ na margem e título riscado. */
function PaperItem({ w, done, highlight, onOpen }) {
  const days = daysUntil(w.dueDate)
  return (
    <li className={'paper-item' + (highlight ? ' is-new' : '') + (done ? ' is-done' : '')}>
      <button type="button" onClick={onOpen}>
        <em>{w.title}</em>
        <span className="paper-meta">
          {w.type === 'trabalho' ? 'Trabalho' : 'Tarefa'}
          {done && (
            <i className="paper-done"> · {w.type === 'trabalho' ? 'concluído' : 'concluída'} ✓</i>
          )}
          {w.dueDate && <> · entrega {formatBR(w.dueDate)}</>}
          {!done && days != null && days <= 7 && (
            <i className={'paper-due du-' + urgency(days)}> · {urgencyLabel(days).toLowerCase()}</i>
          )}
          {!done && (w.progress ?? 0) > 0 && <> · {w.progress}%</>}
        </span>
      </button>
    </li>
  )
}

/* Popup "papel de pauta" do livro: as entregas da aula, uma por linha.
   Fica sempre montado para o <dialog> nativo animar também a saída
   (transition com allow-discrete) — o conteúdo da última aula aberta
   permanece renderizado durante o fade. */
function BookPaperModal({ book, onClose, onOpenWork }) {
  const dlgRef = useRef(null)
  const bodyRef = useRef(null)
  const lastRef = useRef(null)
  if (book) lastRef.current = book
  const shown = book || lastRef.current

  useEffect(() => {
    const dlg = dlgRef.current
    if (!dlg) return
    if (book) {
      if (!dlg.open) dlg.showModal()
      // Recém-criada em destaque: rola até ela; senão, começa do topo
      requestAnimationFrame(() => {
        const novo = dlg.querySelector('.paper-item.is-new')
        if (novo) novo.scrollIntoView({ block: 'center' })
        else bodyRef.current?.scrollTo({ top: 0 })
      })
    } else if (dlg.open) {
      dlg.close()
    }
  }, [book])

  if (!shown) return <dialog className="paper-modal" ref={dlgRef} onClose={onClose} />

  const { cls, term, works, highlightId } = shown
  // As seções já dizem quantas estão pendentes/concluídas — o subtítulo só
  // resume os tipos
  const pendentes = works.filter(w => (w.progress ?? 0) < 100)
  const concluidas = works.filter(w => (w.progress ?? 0) >= 100)
  const nTrab = works.filter(w => w.type === 'trabalho').length
  const nTar = works.length - nTrab
  const parts = []
  if (nTrab) parts.push(`${nTrab} ${nTrab === 1 ? 'trabalho' : 'trabalhos'}`)
  if (nTar) parts.push(`${nTar} ${nTar === 1 ? 'tarefa' : 'tarefas'}`)
  const sub = parts.join(' · ')

  return (
    <dialog
      className="paper-modal"
      ref={dlgRef}
      style={{ '--cover': cls.color }}
      aria-label={`Entregas de ${cls.name}`}
      onClose={onClose}
      /* clique no backdrop fecha — cliques internos caem na .paper-body,
         então o alvo só é o próprio dialog quando vem do backdrop */
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <button className="paper-close" type="button" aria-label="Fechar lista" onClick={onClose}>
        <X size={16} strokeWidth={2.25} />
      </button>
      <div className="paper-body" ref={bodyRef}>
        <header>
          <span className="paper-vol">{term}</span>
          <h2 className="paper-title">{cls.name}</h2>
          <p className="paper-sub">{sub}</p>
        </header>
        {pendentes.length > 0 && (
          <section className="paper-sec">
            <h3 className="paper-sec-label">Pendentes ({pendentes.length})</h3>
            <ol className="paper-list">
              {pendentes.map(w => (
                <PaperItem
                  key={w.id} w={w}
                  highlight={w.id === highlightId}
                  onOpen={() => onOpenWork(w.id)}
                />
              ))}
            </ol>
          </section>
        )}
        {concluidas.length > 0 && (
          <section className="paper-sec paper-sec-done">
            <h3 className="paper-sec-label">Concluídas ({concluidas.length})</h3>
            <ol className="paper-list paper-list-done">
              {concluidas.map(w => (
                <PaperItem
                  key={w.id} w={w} done
                  highlight={w.id === highlightId}
                  onOpen={() => onOpenWork(w.id)}
                />
              ))}
            </ol>
          </section>
        )}
        <p className="paper-foot">— clique numa entrega para abrir as anotações</p>
      </div>
    </dialog>
  )
}

// Abertura automática do Painel de Foco: uma vez por carga da página, por
// usuário (trocar de conta na mesma aba não engole a abertura do próximo).
// Ir a um trabalho e voltar remonta esta view, mas não reabre o painel.
const autoOpenedFor = new Set()

export default function WorksView() {
  const { data, nav, route, user } = useStore()
  const [modal, setModal] = useState(false)
  const [boardOpen, setBoardOpen] = useState(false)

  useEffect(() => {
    if (autoOpenedFor.has(user.id)) return
    if (!data.focusBoard.autoOpen || data.works.length === 0) return
    autoOpenedFor.add(user.id)
    setBoardOpen(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ponto vermelho no botão ⠿: há entrega pendente atrasada
  const hasLate = data.works.some(w => (w.progress ?? 0) < 100 && w.dueDate && daysUntil(w.dueDate) < 0)
  // Livro aberto no popup: { key (bookKey), highlightId? } — highlightId
  // marca a entrega recém-criada dentro do papel
  const [openBook, setOpenBook] = useState(null)
  const [fClass, setFClass] = useState('todas')
  // Começa no ano/semestre pedido pela navegação (ex.: voltar do detalhe de um trabalho),
  // senão no semestre atual — "o semestre em que estou"
  const routeSem = route.semesterId ? data.semesters.find(s => s.id === route.semesterId) : null
  const [fYear, setFYear] = useState(
    () => routeSem?.yearId || route.yearId ||
      data.semesters.find(s => s.id === data.activeSemesterId)?.yearId || 'todos'
  )
  const [fSem, setFSem] = useState(
    () => route.semesterId || (route.yearId ? 'todos' : data.activeSemesterId) || 'todos'
  )

  const yearOf = classId => classInfo(data, classId).year
  const fYearSafe = data.years.some(y => y.id === fYear) ? fYear : 'todos'

  const years = [...data.years].sort((a, b) => a.number - b.number)
  // O semestre só faz sentido dentro de um ano: com "todos os anos", não filtra semestre
  const semOptions = fYearSafe === 'todos' ? [] : semestersOfYear(data, fYearSafe)
  const fSemSafe = semOptions.some(s => s.id === fSem) ? fSem : 'todos'

  const classOptions = data.classes
    .filter(c => (fYearSafe === 'todos' ? true : yearOf(c.id)?.id === fYearSafe))
    .filter(c => (fSemSafe === 'todos' ? true : c.semesterId === fSemSafe))

  // Agrupa as aulas do escopo por matéria (bookKey): registros duplicados da
  // mesma matéria no mesmo semestre viram UM grupo, com os ids de todos
  const groups = []
  for (const c of classOptions) {
    const key = bookKey(c)
    let g = groups.find(x => x.key === key)
    if (!g) {
      const { sem, year } = classInfo(data, c.id)
      g = { key, cls: c, sem, year, term: termLabel(sem, year), classIds: [] }
      groups.push(g)
    }
    g.classIds.push(c.id)
  }
  for (const g of groups) {
    g.works = data.works.filter(w => g.classIds.includes(w.classId)).sort(byDue)
  }

  // Matéria de fora do ano/semestre escolhido não pode continuar filtrando
  const fClassSafe = groups.some(g => g.key === fClass) ? fClass : 'todas'

  // Um livro por matéria que tem pelo menos uma entrega registrada — matérias
  // sem trabalho/tarefa não aparecem na estante
  const books = groups
    .filter(g => (fClassSafe === 'todas' ? true : g.key === fClassSafe))
    .filter(g => g.works.length > 0)
    .sort((a, b) =>
      (a.year?.number || 0) - (b.year?.number || 0) ||
      (a.sem?.number || 0) - (b.sem?.number || 0) ||
      a.cls.name.localeCompare(b.cls.name, 'pt-BR'))

  const captionOf = b => {
    const n = b.works.length
    const pend = b.works.filter(w => (w.progress ?? 0) < 100).length
    return `${n} ${n === 1 ? 'entrega' : 'entregas'}` +
      (pend ? ` · ${pend} pendente${pend === 1 ? '' : 's'}` : ' · tudo em dia ✓')
  }

  // Após criar uma entrega: ajusta os filtros para a matéria dela ficar à
  // vista (o livro surge, se ainda não existia) e abre o papel com ela em
  // destaque — cai sempre no livro do grupo, mesmo com registro duplicado
  const afterCreate = w => {
    const c = data.classes.find(x => x.id === w.classId)
    if (!c) return
    const { sem, year } = classInfo(data, c.id)
    setFYear(year?.id || 'todos')
    setFSem(sem?.id || 'todos')
    setFClass('todas')
    setOpenBook({ key: bookKey(c), highlightId: w.id })
  }

  // Conteúdo do popup, derivado do estado mais recente do store
  const openGroup = openBook ? groups.find(g => g.key === openBook.key) : null
  const bookData = openGroup
    ? {
        cls: openGroup.cls,
        term: openGroup.term,
        works: openGroup.works,
        highlightId: openBook.highlightId,
      }
    : null

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Trabalhos &amp; Tarefas</h1>
          <p className="view-sub">Tudo o que precisa ser entregue, com prazo, grupo, progresso e arquivos.</p>
        </div>
        <div className="head-actions">
          <button
            className="btn-primary"
            onClick={() => {
              if (data.classes.length === 0) return alert('Cadastre pelo menos uma aula antes de criar trabalhos (em Meus Estudos).')
              setModal(true)
            }}
          ><Plus size={16} /> Novo trabalho</button>
          {/* Painel de Foco: rascunho permanente + panorama dos trabalhos.
              Mesmo estilo do "Novo trabalho", só com ícone. */}
          <button
            type="button"
            className={'btn-primary btn-icon-only' + (hasLate ? ' has-alert' : '')}
            aria-label="Painel de foco"
            title={hasLate ? 'Painel de foco · há entrega atrasada' : 'Painel de foco'}
            onClick={() => setBoardOpen(true)}
          >
            <Grip size={18} />
          </button>
        </div>
      </header>

      <div className="filter-bar">
        {years.length > 0 && (
          <select
            value={fYearSafe}
            onChange={e => { setFYear(e.target.value); setFSem('todos'); setFClass('todas') }}
            title="Filtrar pelo ano letivo"
          >
            <option value="todos">Todos os anos</option>
            {years.map(y => (
              <option key={y.id} value={y.id}>
                {y.number}º Ano{y.calendarYear ? ` (${y.calendarYear})` : ''}
              </option>
            ))}
          </select>
        )}
        {semOptions.length > 0 && (
          <select
            value={fSemSafe}
            onChange={e => { setFSem(e.target.value); setFClass('todas') }}
            title="Filtrar pelo semestre"
          >
            <option value="todos">Todos os semestres</option>
            {semOptions.map(s => (
              <option key={s.id} value={s.id}>{s.number}º Semestre</option>
            ))}
          </select>
        )}
        <select value={fClassSafe} onChange={e => setFClass(e.target.value)}>
          <option value="todas">Todas as matérias</option>
          {groups.map(g => <option key={g.key} value={g.key}>{g.cls.name}</option>)}
        </select>
      </div>

      {books.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={data.works.length === 0 ? 'Nenhum trabalho registrado' : 'Nada encontrado com esses filtros'}
          text={data.works.length === 0
            ? 'Registre trabalhos e tarefas para nunca perder um prazo de entrega. Cada aula com entregas vira um livro na estante.'
            : undefined}
        >
          {data.works.length === 0 && data.classes.length > 0 && (
            <button className="btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Registrar trabalho</button>
          )}
        </EmptyState>
      ) : (
        <section className="shelf">
          {books.map((b, i) => (
            <article className="shelf-item" key={b.key} style={{ '--i': i }}>
              <div className="scene">
                <Book3D
                  cls={b.cls}
                  term={b.term}
                  caption={captionOf(b)}
                  onOpen={() => setOpenBook({ key: b.key })}
                />
              </div>
              <div className="caption">
                <h2>{b.cls.name}</h2>
                <p>{captionOf(b)}</p>
              </div>
            </article>
          ))}
        </section>
      )}

      <BookPaperModal
        book={bookData}
        onClose={() => setOpenBook(null)}
        onOpenWork={id => nav('work', { workId: id })}
      />

      <FocusBoardModal
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        onOpenWork={id => { setBoardOpen(false); nav('work', { workId: id }) }}
      />

      {modal && <WorkFormModal onClose={() => setModal(false)} onCreated={afterCreate} />}
    </div>
  )
}
