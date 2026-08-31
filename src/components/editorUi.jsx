// Peças compartilhadas entre o RichEditor e seus menus (slash e bubble).
// Vivem num arquivo próprio para evitar import circular entre eles.

export const TEXT_COLORS = [
  ['Padrão', ''], ['Cinza', '#6b7280'], ['Vermelho', '#dc2626'], ['Laranja', '#ea580c'],
  ['Amarelo', '#ca8a04'], ['Verde', '#16a34a'], ['Azul', '#2563eb'], ['Roxo', '#9333ea'], ['Rosa', '#db2777'],
]
export const HIGHLIGHT_COLORS = [
  ['Amarelo', '#fef08a'], ['Verde', '#bbf7d0'], ['Azul', '#bfdbfe'],
  ['Rosa', '#fbcfe8'], ['Laranja', '#fed7aa'], ['Roxo', '#e9d5ff'],
]

// O preventDefault no mousedown é estrutural: sem ele o clique rouba o foco
// do editor e a seleção some antes de o comando rodar.
export function TbBtn({ onClick, active, title, children, disabled }) {
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
