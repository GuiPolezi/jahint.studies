import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorState, isNodeSelection } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Link2,
  Palette, Highlighter, AlignLeft, AlignCenter, AlignRight, Eraser,
  Minus, Trash2, Rows3, Columns3, Check, CornerDownLeft,
} from 'lucide-react'
import { TbBtn, TEXT_COLORS, HIGHLIGHT_COLORS } from './editorUi'

// Balão de formatação sobre a seleção, como no Notion.
// shouldShow é constante de módulo DE PROPÓSITO: referência estável evita o
// plugin do BubbleMenu reprocessar as opções a cada render.

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

// appendTo: elemento onde o balão é anexado (o .rich-editor — fora do overflow
// do .editor-scroll, dentro da árvore React). scrollTarget: a rolagem interna
// do editor, para o balão acompanhar o texto.
export default function EditorBubbleMenu({ editor, appendTo, scrollTarget }) {
  // Painéis trocados dentro do MESMO balão (evita menu aninhado):
  // null = linha de botões | 'link' | 'color' | 'highlight'
  const [panel, setPanel] = useState(null)
  const [linkUrl, setLinkUrl] = useState('')
  const linkInput = useRef(null)

  // TipTap 3 não re-renderiza o componente a cada transação do editor: o
  // estado das marcas ativas vem por seletor, e o balão só re-renderiza
  // quando algum desses valores muda.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      link: e.isActive('link'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      inTable: e.isActive('table'),
    }),
  })

  // Posicionamento (Floating UI): acima da seleção, com flip automático
  const options = useMemo(() => ({ placement: 'top', offset: 8, scrollTarget }), [scrollTarget])

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

  return (
    <BubbleMenu
      editor={editor}
      className="bubble-menu"
      pluginKey="fmt"
      shouldShow={shouldShow}
      appendTo={appendTo}
      options={options}
    >
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
          {active.link && (
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
            <TbBtn onClick={() => editor.chain().focus().toggleBold().run()} active={active.bold} title="Negrito"><Bold size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={active.italic} title="Itálico"><Italic size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={active.underline} title="Sublinhado"><UnderlineIcon size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={active.strike} title="Tachado"><Strikethrough size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().toggleCode().run()} active={active.code} title="Código inline"><Code size={15} /></TbBtn>
            <span className="tb-sep" />
            <TbBtn onClick={openLink} active={active.link} title="Link"><Link2 size={15} /></TbBtn>
            <TbBtn onClick={() => setPanel('color')} title="Cor do texto"><Palette size={15} /></TbBtn>
            <TbBtn onClick={() => setPanel('highlight')} title="Destacar (marca-texto)"><Highlighter size={15} /></TbBtn>
            <span className="tb-sep" />
            <TbBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={active.left} title="Alinhar à esquerda"><AlignLeft size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={active.center} title="Centralizar"><AlignCenter size={15} /></TbBtn>
            <TbBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={active.right} title="Alinhar à direita"><AlignRight size={15} /></TbBtn>
            <span className="tb-sep" />
            <TbBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Limpar formatação"><Eraser size={15} /></TbBtn>
          </div>
          {active.inTable && (
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
