import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo,
  Quote, Code, Minus, Table as TableIcon, Image as ImageIcon, Search,
} from 'lucide-react'

// Menu de comandos estilo Notion: digitar "/" no editor abre esta lista,
// e o que se digita em seguida filtra os comandos (a query vive no próprio
// documento — o plugin Suggestion a rastreia e apaga ao aplicar o comando).

// Normaliza acentos para o filtro casar "titulo" com "Título"
const fold = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

// Todo comando começa apagando o "/query" digitado (deleteRange)
const COMMANDS = [
  { label: 'Texto', icon: Type, keywords: 'texto paragrafo p normal',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
  { label: 'Título 1', icon: Heading1, keywords: 'titulo h1 cabecalho grande',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run() },
  { label: 'Título 2', icon: Heading2, keywords: 'titulo h2 cabecalho medio',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run() },
  { label: 'Título 3', icon: Heading3, keywords: 'titulo h3 cabecalho pequeno',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run() },
  { label: 'Lista', icon: List, keywords: 'lista marcadores bullet topicos',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { label: 'Lista numerada', icon: ListOrdered, keywords: 'lista numerada ordenada numeros',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { label: 'Lista de tarefas', icon: ListTodo, keywords: 'tarefas checkbox todo checklist',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
  { label: 'Citação', icon: Quote, keywords: 'citacao quote bloco',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { label: 'Bloco de código', icon: Code, keywords: 'codigo code programacao',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  { label: 'Divisória', icon: Minus, keywords: 'divisoria linha separador hr',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
  { label: 'Tabela', icon: TableIcon, keywords: 'tabela table colunas linhas',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
]

// Lista renderizada no popup do Suggestion. forwardRef: o render() do
// Suggestion delega as teclas (↑ ↓ Enter) para cá via useImperativeHandle.
const SlashMenuList = forwardRef(function SlashMenuList({ items, command, query }, ref) {
  const [selected, setSelected] = useState(0)
  const listRef = useRef(null)

  useEffect(() => { setSelected(0) }, [items])

  // Mantém o item selecionado à vista quando a lista rola
  useEffect(() => {
    listRef.current?.querySelector('.tb-menu-item.selected')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false
      if (event.key === 'ArrowDown') { setSelected(s => (s + 1) % items.length); return true }
      if (event.key === 'ArrowUp') { setSelected(s => (s - 1 + items.length) % items.length); return true }
      if (event.key === 'Enter') { command(items[selected]); return true }
      return false
    },
  }), [items, selected, command])

  return (
    <div className="tb-menu slash-menu" ref={listRef}>
      {/* "Campo" de busca do topo: visual apenas — a digitação acontece no
          documento e chega aqui como query. Mover o foco para um input real
          quebraria o rastreamento do Suggestion e o teclado do celular. */}
      <div className="slash-search">
        <Search size={13} />
        {query
          ? <span className="query">{query}</span>
          : <span className="placeholder">Pesquisar ações…</span>}
      </div>
      <div className="tb-menu-label">Blocos</div>
      {items.length === 0 && <div className="slash-empty">Nenhum comando</div>}
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            type="button"
            className={'tb-menu-item' + (i === selected ? ' selected' : '')}
            onMouseDown={e => e.preventDefault()}
            onMouseEnter={() => setSelected(i)}
            onClick={() => command(item)}
          >
            <Icon size={15} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
})

// Fábrica da configuração do Suggestion. pickImage é injetado pelo RichEditor
// (abre o file input escondido) — por isso a lista de imagem nasce aqui.
export function makeSuggestion({ pickImage }) {
  const all = [
    ...COMMANDS,
    { label: 'Imagem', icon: ImageIcon, keywords: 'imagem foto figura fotografia',
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); pickImage() } },
  ]

  return {
    char: '/',
    startOfLine: false,
    allowSpaces: false,
    allow: ({ editor }) => !editor.isActive('codeBlock'), // "/" dentro de código é código
    command: ({ editor, range, props }) => props.command({ editor, range }),
    items: ({ query }) => {
      const q = fold(query)
      if (!q) return all
      return all.filter(it => fold(it.label).includes(q) || it.keywords.includes(q))
    },
    // Posição do popup (TipTap 3 posiciona com Floating UI por conta própria)
    placement: 'bottom-start',
    render: () => {
      let component, unmount
      return {
        onStart: props => {
          component = new ReactRenderer(SlashMenuList, { props, editor: props.editor })
          // O wrapper da lista recebe a classe que o CSS usa (z-index e a
          // folha de rodapé no celular). props.mount anexa o elemento ao
          // <body> — escapa do overflow do .editor-scroll — e o mantém junto
          // ao cursor em rolagem e redimensionamento.
          component.element.classList.add('slash-root')
          unmount = props.mount(component.element)
        },
        onUpdate: props => component.updateProps(props),
        // Escape é tratado pelo próprio plugin (encerra a sugestão);
        // ↑ ↓ Enter vão para a lista
        onKeyDown: props => component.ref?.onKeyDown(props) ?? false,
        onExit: () => {
          unmount?.()
          component.destroy()
        },
      }
    },
  }
}

export const SlashCommands = Extension.create({
  name: 'slashCommands',
  addOptions() {
    return { suggestion: {} }
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })]
  },
})
