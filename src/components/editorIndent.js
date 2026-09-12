// Recuo de bloco com Tab/Shift-Tab, estilo Notion/Word: o parágrafo/título
// ganha um atributo `indent` (0–8) que vira `data-indent` no DOM e margem via
// CSS. O recuo viaja dentro do próprio JSON do editor — conteúdo antigo, sem
// o atributo, continua válido no nível 0.
import { Extension } from '@tiptap/core'

const MAX_INDENT = 8
const TYPES = ['paragraph', 'heading']

// Soma delta ao recuo de todos os blocos indentáveis da seleção.
// Blocos dentro de item de lista ficam de fora: lista aninha pelo Tab nativo,
// e recuar o parágrafo interno somaria dois recuos no mesmo item.
const changeIndent = delta => ({ tr, state, dispatch }) => {
  const { from, to } = state.selection
  let changed = false
  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (!TYPES.includes(node.type.name)) return
    if (parent && ['listItem', 'taskItem'].includes(parent.type.name)) return
    const current = node.attrs.indent || 0
    const next = Math.min(MAX_INDENT, Math.max(0, current + delta))
    if (next !== current) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next })
      changed = true
    }
  })
  if (changed && dispatch) dispatch(tr)
  return changed
}

const Indent = Extension.create({
  name: 'indent',
  // Abaixo do padrão (100): os Tab nativos de lista (aninhar item) e de
  // tabela (próxima célula) rodam primeiro; este só pega o que sobrar.
  priority: 50,

  addGlobalAttributes() {
    return [{
      types: TYPES,
      attributes: {
        indent: {
          default: 0,
          parseHTML: el => parseInt(el.getAttribute('data-indent'), 10) || 0,
          renderHTML: attrs => (attrs.indent ? { 'data-indent': attrs.indent } : {}),
        },
      },
    }]
  },

  addCommands() {
    return {
      indent: () => changeIndent(1),
      outdent: () => changeIndent(-1),
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // Bloco de código: tabulação literal, como em editor de código.
        // insertText no tr, e não insertContent: o parse de conteúdo pode
        // descartar um texto só de whitespace.
        if (editor.isActive('codeBlock')) {
          editor.view.dispatch(editor.state.tr.insertText('\t'))
          return true
        }
        // Se caiu aqui dentro de lista, o aninhar nativo falhou (ex.: primeiro
        // item) — engole o evento para o foco não escapar do editor
        if (editor.isActive('listItem') || editor.isActive('taskItem')) return true
        // Sempre consome: no nível máximo nada muda, mas o foco fica
        editor.commands.indent()
        return true
      },
      'Shift-Tab': ({ editor }) => {
        if (editor.isActive('listItem') || editor.isActive('taskItem')) return true
        // No nível 0 devolve false de propósito: Shift-Tab segue sendo a
        // rota de fuga do editor para quem navega por teclado
        return editor.commands.outdent()
      },
    }
  },
})

// Enter numa linha recuada: a próxima linha nasce no nível 0 — o recuo não
// "escorre" para o parágrafo seguinte. Extensão separada do Indent porque o
// Enter precisa de prioridade PADRÃO (100) para rodar antes do keymap base do
// core (splitBlock, sempre o último); o Tab do Indent precisa de prioridade
// MENOR para rodar depois dos nativos de lista/tabela.
// ATENÇÃO à ordem no RichEditor: registrar ANTES do SlashCommands — o TipTap
// executa os atalhos dos últimos da lista primeiro, e o Enter com o menu "/"
// aberto pertence ao menu.
export const IndentEnterReset = Extension.create({
  name: 'indentEnterReset',

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // Lista, tarefa e bloco de código têm Enter próprio — fluxo normal
        if (editor.isActive('codeBlock') || editor.isActive('listItem') || editor.isActive('taskItem')) return false
        const parent = editor.state.selection.$from.parent
        if (!TYPES.includes(parent.type.name) || !(parent.attrs.indent > 0)) return false
        // Linha recuada e vazia: Enter só volta ao nível 0, sem criar bloco
        if (parent.content.size === 0)
          return editor.commands.updateAttributes(parent.type.name, { indent: 0 })
        // Divide o bloco e zera o recuo do novo — uma transação só (um Ctrl+Z)
        return editor.chain()
          .splitBlock()
          .command(({ tr, dispatch }) => {
            const pos = tr.selection.$from.before()
            const node = tr.doc.nodeAt(pos)
            if (node && node.attrs.indent && dispatch)
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: 0 })
            return true
          })
          .run()
      },
    }
  },
})

export default Indent
