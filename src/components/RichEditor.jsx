import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { FloatingMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import TTImage from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Plus } from 'lucide-react'
import { readImageResized } from '../lib/utils'
import { api } from '../lib/api'
import { SlashCommands, makeSuggestion } from './SlashMenu'
import EditorBubbleMenu from './EditorBubbleMenu'
import Indent, { IndentEnterReset } from './editorIndent'

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

export default function RichEditor({ initial, onChange, placeholder = 'Escreva aqui… digite "/" para comandos, como no Notion.' }) {
  const imgInput = useRef(null)

  // Elementos de referência dos menus flutuantes, guardados como state (e não
  // ref) para que os menus só montem depois de eles existirem no DOM — o
  // BubbleMenu e o FloatingMenu (TipTap 3) precisam deles ao criar o plugin.
  // rootEl (.rich-editor): onde os menus são anexados — fora do overflow do
  //   .editor-scroll, mas DENTRO da árvore React (#root). No body os onClick
  //   nunca disparam: o React 18 delega eventos na raiz da aplicação.
  // scrollEl (.editor-scroll): a rolagem interna que reposiciona os menus.
  const [rootEl, setRootEl] = useState(null)
  const [scrollEl, setScrollEl] = useState(null)

  // A lista de extensões é capturada uma única vez pelo useEditor; o callback
  // usa ref (estável), então o useMemo sem deps é seguro.
  const slashSuggestion = useMemo(
    () => makeSuggestion({ pickImage: () => imgInput.current?.click() }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const editor = useEditor({
    extensions: [
      // Na versão 3 o StarterKit já traz Underline e Link
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: true } }),
      TTImage.configure({ allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      // Antes do SlashCommands de propósito: o Enter com o menu "/" aberto
      // pertence ao menu (atalhos executam na ordem inversa do registro)
      IndentEnterReset,
      SlashCommands.configure({ suggestion: slashSuggestion }),
      Indent,
    ],
    content: initial || '',
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
  })

  // "+" de linha vazia (Floating UI): à esquerda da linha; quando não há
  // espaço, o flip resolve. scrollTarget: sem ele o plugin só escuta a janela
  const floatOpts = useMemo(
    () => ({ placement: 'left', offset: 6, scrollTarget: scrollEl || undefined }),
    [scrollEl]
  )

  if (!editor) return null

  const menusReady = rootEl && scrollEl

  return (
    <div className="rich-editor" ref={setRootEl}>
      {menusReady && <EditorBubbleMenu editor={editor} appendTo={rootEl} scrollTarget={scrollEl} />}

      {/* "+" em linha vazia: insere "/" e cai no mesmo menu do slash —
          é o caminho de quem está no toque, sem tecla "/" à mão */}
      {menusReady && (
        <FloatingMenu editor={editor} className="floating-plus" appendTo={rootEl} options={floatOpts}>
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
      )}

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

      <div className="editor-scroll" ref={setScrollEl} onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
