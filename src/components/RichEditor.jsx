import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TTUnderline from '@tiptap/extension-underline'
import TTLink from '@tiptap/extension-link'
import TTImage from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TTTable from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  List, ListOrdered, ListTodo, Quote, Minus, Link2, Image as ImageIcon,
  Table as TableIcon, AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, Highlighter, Palette, Eraser, Plus, Trash2, MoreHorizontal,
} from 'lucide-react'
import { readImageResized } from '../lib/utils'
import { api } from '../lib/api'

const TEXT_COLORS = [
  ['Padrão', ''], ['Cinza', '#6b7280'], ['Vermelho', '#dc2626'], ['Laranja', '#ea580c'],
  ['Amarelo', '#ca8a04'], ['Verde', '#16a34a'], ['Azul', '#2563eb'], ['Roxo', '#9333ea'], ['Rosa', '#db2777'],
]
const HIGHLIGHT_COLORS = [
  ['Amarelo', '#fef08a'], ['Verde', '#bbf7d0'], ['Azul', '#bfdbfe'],
  ['Rosa', '#fbcfe8'], ['Laranja', '#fed7aa'], ['Roxo', '#e9d5ff'],
]

// Conteúdo já carregado nesta sessão, por aba/anotação. Sem esse cache,
// alternar entre as abas de um trabalho refazia a busca no servidor: surgia
// "Carregando…", a altura da página despencava e a rolagem voltava ao topo
// no meio da escrita. Limpo no logout para não vazar entre contas.
const contentCache = new Map()
export const clearContentCache = () => contentCache.clear()

// Hook: carrega o conteúdo do servidor e salva automaticamente (debounce).
// kind: 'note' (anotação de aula) ou 'tab' (aba de trabalho); id: o id dela.
export function useAutosaveContent(kind, id) {
  const cacheKey = `${kind}:${id}`
  const [initial, setInitial] = useState(() =>
    contentCache.has(cacheKey) ? contentCache.get(cacheKey) : undefined) // undefined = carregando
  const [status, setStatus] = useState('idle')
  const timer = useRef(null)
  const pending = useRef(null)

  const save = useCallback(
    json => (kind === 'note' ? api.updNote(id, { content: json }) : api.updTab(id, { content: json })),
    [kind, id]
  )

  useEffect(() => {
    if (contentCache.has(cacheKey)) return // já em memória: entra direto, sem piscar
    let alive = true
    setInitial(undefined)
    setStatus('idle')
    const load = kind === 'note'
      ? api.getNote(id).then(r => r.note?.content ?? null)
      : api.getTabContent(id).then(r => r.content ?? null)
    load
      .then(v => { if (alive) { contentCache.set(cacheKey, v); setInitial(v) } })
      .catch(() => { if (alive) { setInitial(null); setStatus('error') } })
    return () => { alive = false }
  }, [cacheKey, kind, id])

  // Ao trocar de aba, grava o que ainda estava esperando o debounce em vez
  // de descartar — digitar e trocar de aba rápido perdia o último trecho.
  useEffect(() => () => {
    if (!timer.current) return
    clearTimeout(timer.current)
    timer.current = null
    if (pending.current !== null) save(pending.current).catch(() => {})
  }, [save])

  const onChange = useCallback(json => {
    contentCache.set(cacheKey, json) // mantém o cache em dia enquanto digita
    pending.current = json
    setStatus('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      timer.current = null
      try {
        await save(json)
        pending.current = null
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    }, 600)
  }, [cacheKey, save])

  return { initial, status, onChange }
}

export function SaveStatus({ status }) {
  if (status === 'saving') return <span className="save-status saving">Salvando…</span>
  if (status === 'saved') return <span className="save-status saved">✓ Salvo</span>
  if (status === 'error') return <span className="save-status error">Erro ao salvar</span>
  return null
}

function TbBtn({ onClick, active, title, children, disabled }) {
  return (
    <button
      type="button"
      className={'tb-btn' + (active ? ' active' : '')}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function Popover({ open, onClose, children }) {
  if (!open) return null
  return (
    <>
      <div className="pop-backdrop" onClick={onClose} />
      <div className="popover">{children}</div>
    </>
  )
}

// Item do menu "⋯" — mesmo preventDefault do TbBtn: não roubar a seleção do editor
function MenuItem({ icon: Icon, onClick, active, children }) {
  return (
    <button
      type="button"
      className={'tb-menu-item' + (active ? ' active' : '')}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
    >
      <Icon size={15} />
      {children}
    </button>
  )
}

export default function RichEditor({ initial, onChange, placeholder = 'Escreva aqui… use a barra acima para formatar como no Notion.' }) {
  const [colorOpen, setColorOpen] = useState(false)
  const [hlOpen, setHlOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const imgInput = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TTUnderline,
      TTLink.configure({ openOnClick: false, autolink: true }),
      TTImage.configure({ allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TTTable.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: initial || '',
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
  })

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL do link:', prev || 'https://')
    if (url === null) return
    if (url === '' || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const headingValue = editor.isActive('heading', { level: 1 }) ? 'h1'
    : editor.isActive('heading', { level: 2 }) ? 'h2'
    : editor.isActive('heading', { level: 3 }) ? 'h3'
    : 'p'

  // Comandos do menu "⋯" fecham o menu ao executar (alinhamentos ficam abertos)
  const runAndClose = fn => () => { fn(); setMoreOpen(false) }

  return (
    <div className="rich-editor">
      <div className="editor-toolbar">
        <TbBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer" disabled={!editor.can().undo()}><Undo2 size={15} /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer" disabled={!editor.can().redo()}><Redo2 size={15} /></TbBtn>
        <span className="tb-sep" />

        <select
          className="tb-select"
          value={headingValue}
          onMouseDown={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value
            if (v === 'p') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().toggleHeading({ level: Number(v[1]) }).run()
          }}
        >
          <option value="p">Texto</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
        </select>
        <span className="tb-sep" />

        <TbBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito"><Bold size={15} /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico"><Italic size={15} /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado"><UnderlineIcon size={15} /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado"><Strikethrough size={15} /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline"><Code size={15} /></TbBtn>

        <span className="tb-wrap">
          <TbBtn onClick={() => setColorOpen(o => !o)} active={colorOpen} title="Cor do texto"><Palette size={15} /></TbBtn>
          <Popover open={colorOpen} onClose={() => setColorOpen(false)}>
            <div className="swatch-grid">
              {TEXT_COLORS.map(([name, c]) => (
                <button
                  key={name}
                  type="button"
                  className="swatch"
                  title={name}
                  style={{ color: c || '#1e293b' }}
                  onClick={() => {
                    if (c) editor.chain().focus().setColor(c).run()
                    else editor.chain().focus().unsetColor().run()
                    setColorOpen(false)
                  }}
                >A</button>
              ))}
            </div>
          </Popover>
        </span>

        <span className="tb-wrap">
          <TbBtn onClick={() => setHlOpen(o => !o)} active={hlOpen} title="Destacar (marca-texto)"><Highlighter size={15} /></TbBtn>
          <Popover open={hlOpen} onClose={() => setHlOpen(false)}>
            <div className="swatch-grid">
              {HIGHLIGHT_COLORS.map(([name, c]) => (
                <button
                  key={name}
                  type="button"
                  className="swatch"
                  title={name}
                  style={{ background: c }}
                  onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setHlOpen(false) }}
                >A</button>
              ))}
              <button
                type="button"
                className="swatch"
                title="Remover destaque"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setHlOpen(false) }}
              >✕</button>
            </div>
          </Popover>
        </span>
        <span className="tb-sep" />

        <TbBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista"><List size={15} /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered size={15} /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Lista de tarefas (checkbox)"><ListTodo size={15} /></TbBtn>
        <span className="tb-sep" />

        <TbBtn onClick={setLink} active={editor.isActive('link')} title="Link"><Link2 size={15} /></TbBtn>
        <TbBtn onClick={() => imgInput.current?.click()} title="Inserir imagem"><ImageIcon size={15} /></TbBtn>

        {editor.isActive('table') && (
          <>
            <span className="tb-sep" />
            <TbBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Adicionar linha"><Plus size={13} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Adicionar coluna"><TableIcon size={13} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Excluir tabela"><Trash2 size={13} /></TbBtn>
          </>
        )}
        <span className="tb-sep" />

        <span className="tb-wrap tb-wrap-end">
          <TbBtn onClick={() => setMoreOpen(o => !o)} active={moreOpen} title="Mais opções"><MoreHorizontal size={15} /></TbBtn>
          <Popover open={moreOpen} onClose={() => setMoreOpen(false)}>
            <div className="tb-menu">
              <div className="tb-menu-label">Alinhamento</div>
              <div className="tb-menu-row">
                <TbBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinhar à esquerda"><AlignLeft size={15} /></TbBtn>
                <TbBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centralizar"><AlignCenter size={15} /></TbBtn>
                <TbBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinhar à direita"><AlignRight size={15} /></TbBtn>
              </div>
              <div className="tb-menu-sep" />
              <MenuItem icon={Quote} active={editor.isActive('blockquote')} onClick={runAndClose(() => editor.chain().focus().toggleBlockquote().run())}>Citação</MenuItem>
              <MenuItem icon={Code} active={editor.isActive('codeBlock')} onClick={runAndClose(() => editor.chain().focus().toggleCodeBlock().run())}>Bloco de código</MenuItem>
              <MenuItem icon={Minus} onClick={runAndClose(() => editor.chain().focus().setHorizontalRule().run())}>Divisória</MenuItem>
              <MenuItem icon={TableIcon} onClick={runAndClose(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>Tabela</MenuItem>
              <div className="tb-menu-sep" />
              <MenuItem icon={Eraser} onClick={runAndClose(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}>Limpar formatação</MenuItem>
            </div>
          </Popover>
        </span>

        <input
          ref={imgInput}
          type="file"
          accept="image/*"
          hidden
          onChange={async e => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              const src = await readImageResized(f)
              editor.chain().focus().setImage({ src }).run()
            } catch {
              alert('Não foi possível carregar a imagem.')
            }
            e.target.value = ''
          }}
        />
      </div>

      <div className="editor-scroll" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
