import { useEffect, useRef, useState } from 'react'
import { BubbleMenu, isNodeSelection } from '@tiptap/react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Link2,
  Palette, Highlighter, AlignLeft, AlignCenter, AlignRight, Eraser,
  Minus, Trash2, Rows3, Columns3, Check, CornerDownLeft,
} from 'lucide-react'
import { TbBtn, TEXT_COLORS, HIGHLIGHT_COLORS } from './editorUi'

// Balão de formatação sobre a seleção, como no Notion.
// shouldShow e tippyOptions são constantes de módulo DE PROPÓSITO: o plugin
// do BubbleMenu captura essas referências no primeiro render — recriá-las a
// cada render congela/duplica o comportamento do menu.
const TIPPY_OPTS = {
  duration: 120,
  // Fora do overflow do .editor-scroll, mas DENTRO da árvore React (#root):
  // movido para o body, o balão fica fora da raiz onde o React 18 delega os
  // eventos, e nenhum onClick dos botões dispara (mesmo caso do "+").
  appendTo: ref => ref.closest('.rich-editor') || document.body,
  placement: 'top',
  maxWidth: 'none',
}

// Não exige editor.isFocused: o campo de link dentro do balão rouba o foco
// e o plugin já cuida de esconder no blur verdadeiro (para fora do menu).
const shouldShow = ({ editor, state, from, to }) => {
  const { selection } = state
  if (!editor.isEditable) return false
  // Imagem selecionada: marcas inline não se aplicam
  if (isNodeSelection(selection)) return !editor.isActive('image')
  // Seleção de células da tabela ($anchorCell = CellSelection) mostra o
  // balão mesmo sem texto — é onde vivem os controles de linha/coluna
  if ('$anchorCell' in selection) return true
  if (selection.empty) return false
  return state.doc.textBetween(from, to).length > 0
}

export default function EditorBubbleMenu({ editor }) {
  // Painéis trocados dentro do MESMO balão (evita tippy aninhado):
  // null = linha de botões | 'link' | 'color' | 'highlight'
  const [panel, setPanel] = useState(null)
  const [linkUrl, setLinkUrl] = useState('')
  const linkInput = useRef(null)

  // Foco no campo de link quando o painel abre
  useEffect(() => {
    if (panel === 'link') linkInput.current?.focus()
  }, [panel])

  // Mudou a seleção = novo contexto: o balão reabre na linha de botões,
  // não no painel que ficou aberto da seleção anterior
  useEffect(() => {
    const reset = () => setPanel(null)
    editor.on('selectionUpdate', reset)
    return () => editor.off('selectionUpdate', reset)
  }, [editor])

  const openLink = () => {
    setLinkUrl(editor.getAttributes('link').href || '')
    setPanel('link')
  }

  const applyLink = () => {
    const url = linkUrl.trim()
    if (!url) editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setPanel(null)
  }

  const run = fn => { fn(); setPanel(null) }
  const inTable = editor.isActive('table')

  return (
    <BubbleMenu editor={editor} className="bubble-menu" pluginKey="fmt" shouldShow={shouldShow} tippyOptions={TIPPY_OPTS}>
      {panel === 'link' ? (
        <div className="bubble-panel bubble-link">
          <input
            ref={linkInput}
            type="url"
            placeholder="https://…"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') { e.preventDefault(); setPanel(null) }
            }}
          />
          <TbBtn onClick={applyLink} title="Aplicar link"><Check size={14} /></TbBtn>
          {editor.isActive('link') && (
            <TbBtn onClick={() => run(() => editor.chain().focus().extendMarkRange('link').unsetLink().run())} title="Remover link">
              <Trash2 size={14} />
            </TbBtn>
          )}
          <TbBtn onClick={() => setPanel(null)} title="Voltar"><CornerDownLeft size={14} /></TbBtn>
        </div>
      ) : panel === 'color' ? (
        <div className="bubble-panel">
          <div className="swatch-grid">
            {TEXT_COLORS.map(([name, c]) => (
              <button
                key={name}
                type="button"
                className="swatch"
                title={name}
                style={{ color: c || '#1e293b' }}
                onMouseDown={e => e.preventDefault()}
                onClick={() => run(() => {
                  if (c) editor.chain().focus().setColor(c).run()
                  else editor.chain().focus().unsetColor().run()
                })}
              >A</button>
            ))}
          </div>
        </div>
      ) : panel === 'highlight' ? (
        <div className="bubble-panel">
          <div className="swatch-grid">
            {HIGHLIGHT_COLORS.map(([name, c]) => (
              <button
                key={name}
                type="button"
                className="swatch"
                title={name}
                style={{ background: c }}
                onMouseDown={e => e.preventDefault()}
                onClick={() => run(() => editor.chain().focus().toggleHighlight({ color: c }).run())}
              >A</button>
            ))}
            <button
              type="button"
              className="swatch"
              title="Remover destaque"
              onMouseDown={e => e.preventDefault()}
              onClick={() => run(() => editor.chain().focus().unsetHighlight().run())}
            >✕</button>
          </div>
        </div>
      ) : (
        <>
          <div className="bubble-row">
            <TbBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito"><Bold size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico"><Italic size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado"><UnderlineIcon size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado"><Strikethrough size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline"><Code size={15} /></TbBtn>
            <span className="tb-sep" />
            <TbBtn onClick={openLink} active={editor.isActive('link')} title="Link"><Link2 size={15} /></TbBtn>
            <TbBtn onClick={() => setPanel('color')} title="Cor do texto"><Palette size={15} /></TbBtn>
            <TbBtn onClick={() => setPanel('highlight')} title="Destacar (marca-texto)"><Highlighter size={15} /></TbBtn>
            <span className="tb-sep" />
            <TbBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinhar à esquerda"><AlignLeft size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centralizar"><AlignCenter size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinhar à direita"><AlignRight size={15} /></TbBtn>
            <span className="tb-sep" />
            <TbBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Limpar formatação"><Eraser size={15} /></TbBtn>
          </div>
          {inTable && (
            <div className="bubble-row bubble-row-table">
              <TbBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Adicionar linha"><Rows3 size={14} /></TbBtn>
              <TbBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Adicionar coluna"><Columns3 size={14} /></TbBtn>
              <TbBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Excluir linha"><Minus size={14} /></TbBtn>
              <TbBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Excluir coluna"><Minus size={14} style={{ transform: 'rotate(90deg)' }} /></TbBtn>
              <span className="tb-sep" />
              <TbBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Excluir tabela"><Trash2 size={14} /></TbBtn>
            </div>
          )}
        </>
      )}
    </BubbleMenu>
  )
}
