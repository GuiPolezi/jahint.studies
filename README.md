# Jahint.Studies 🎓

Sistema de organização de estudos — protótipo funcional para validação.

## Como rodar

```bash
npm install
npm run dev
```

Abre em http://localhost:5173

## Onde ficam os dados

Tudo é salvo **localmente no navegador** (sem servidor):

- **localStorage** — usuários, sessão e dados estruturados (anos, semestres, aulas, trabalhos, provas).
- **IndexedDB** — conteúdos pesados: anotações do editor (com imagens) e arquivos anexados (PDFs, ZIPs, códigos...). O localStorage tem limite de ~5MB, por isso os itens grandes vivem no IndexedDB, que suporta centenas de MB.

⚠️ Como é um protótipo local: limpar os dados do navegador apaga tudo. Use o botão **Exportar backup** no Perfil regularmente.

## Stack

- React 18 + Vite
- TipTap (editor de texto rico estilo Notion)
- lucide-react (ícones)
- CSS puro com estética Frutiger Aero × iOS (vidro translúcido, gradientes aqua)
