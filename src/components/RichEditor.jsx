import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent, FloatingMenu } from '@tiptap/react'
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
import { Plus } from 'lucide-react'
import { readImageResized } from '../lib/utils'
import { api } from '../lib/api'
import { SlashCommands, makeSuggestion } from './SlashMenu'
import EditorBubbleMenu from './EditorBubbleMenu'

// Conteúdo já carregado nesta sessão, por aba/anotação. Sem esse cache,
// alternar entre as abas de um trabalho refazia a busca no servidor: surgia
// "Carregando…", a altura da página despencava e a rolagem voltava ao topo
// no meio da escrita. Limpo no logout para não vazar entre contas.
const contentCache = new Map()
export const clearContentCache = () => contentCache.clear()

// Hook: carrega o conteúdo do servidor e salva automaticamente (debounce).
// kind: 'note' (anotação de aula) ou 'tab' (aba de trabalho); id: o id dela.
// onSaved (opcional): chamado depois de cada gravação bem-sucedida.
export function useAutosaveContent(kind, id, { onSaved } = {}) {
  const cacheKey = `${kind}:${id}`
  const [initial, setInitial] = useState(() =>
    contentCache.has(cacheKey) ? contentCache.get(cacheKey) : undefined) // undefined = carregando
  const [status, setStatus] = useState('idle')
  const timer = useRef(null)
  const pending = useRef(null)
  // Callback numa ref: quem chama passa uma arrow nova a cada render, e se ela
  // entrasse nas deps de `save` o efeito de flush abaixo rodaria o cleanup a
  // cada re-render — viraria um PUT por tecla em vez de um por pausa.
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved

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
    if (pending.current !== null)
      save(pending.current).then(() => onSavedRef.current?.()).catch(() => {})
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
        onSavedRef.current?.()
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

// tippyOptions do "+" de linha vazia: constante de módulo (capturada uma vez
// pelo plugin). O flip do popper resolve quando não há espaço à esquerda.
// appendTo: fora do overflow do .editor-scroll, mas DENTRO da árvore React
// (#root). No body os onClick nunca disparam — o React 18 delega eventos na
// raiz da aplicação, e o clique num nó movido para o body não passa por ela.
const FLOAT_OPTS = {
  placement: 'left',
  offset: [0, 6],
  appendTo: ref => ref.closest('.rich-editor') || document.body,
  duration: 100,
}

export default function RichEditor({ initial, onChange, placeholder = 'Escreva aqui… digite "/" para comandos, como no Notion.' }) {
  const imgInput = useRef(null)

  // A lista de extensões é capturada uma única vez pelo useEditor; o callback
  // usa ref (estável), então o useMemo sem deps é seguro.
  const slashSuggestion = useMemo(
    () => makeSuggestion({ pickImage: () => imgInput.current?.click() }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

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
      SlashCommands.configure({ suggestion: slashSuggestion }),
    ],
    content: initial || '',
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
  })

  if (!editor) return null

  return (
    <div className="rich-editor">
      <EditorBubbleMenu editor={editor} />

      {/* "+" em linha vazia: insere "/" e cai no mesmo menu do slash —
          é o caminho de quem está no toque, sem tecla "/" à mão */}
      <FloatingMenu editor={editor} className="floating-plus" tippyOptions={FLOAT_OPTS}>
        <button
          type="button"
          className="floating-plus-btn"
          title='Adicionar bloco ("/")'
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor.chain().focus().insertContent('/').run()}
        >
          <Plus size={14} />
        </button>
      </FloatingMenu>

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

      <div className="editor-scroll" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
