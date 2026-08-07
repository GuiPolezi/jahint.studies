# Contribuindo com o Jahint.Studies 🎓

Obrigado por considerar contribuir com o **Jahint.Studies**! Este documento explica como configurar o ambiente, o fluxo de contribuição e algumas convenções do projeto.

## 📋 Sumário

- [Como contribuir](#como-contribuir)
- [Configurando o ambiente local](#configurando-o-ambiente-local)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Reportando bugs](#reportando-bugs)
- [Sugerindo melhorias](#sugerindo-melhorias)
- [Padrões de código](#padrões-de-código)
- [Padrão de commits](#padrão-de-commits)
- [Segurança](#segurança)
- [Dúvidas](#dúvidas)

## Como contribuir

1. Faça um **fork** deste repositório
2. Clone o seu fork:
   ```bash
   git clone https://github.com/seu-usuario/jahint.studies.git
   cd jahint.studies
   ```
3. Crie uma branch descritiva para sua alteração:
   ```bash
   git checkout -b feat/nome-da-feature
   # ou
   git checkout -b fix/nome-do-bug
   ```
4. Faça suas alterações, seguindo os [padrões de código](#padrões-de-código)
5. Teste localmente (veja [Configurando o ambiente local](#configurando-o-ambiente-local))
6. Faça commit seguindo o [padrão de commits](#padrão-de-commits)
7. Envie para o seu fork:
   ```bash
   git push origin feat/nome-da-feature
   ```
8. Abra um **Pull Request** contra a branch `main` deste repositório, descrevendo:
   - O que foi alterado e por quê
   - Como testar a mudança
   - Screenshots, se houver alteração visual

Todas as contribuições passam por revisão antes do merge — não hesite em abrir o PR mesmo que a mudança seja pequena.

## Configurando o ambiente local

### Pré-requisitos

- **Node.js 18+**
- **MariaDB 10.5+** (ou MySQL 8)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # preencha DB_USER, DB_PASSWORD e gere um JWT_SECRET
npm run db:setup       # cria o banco e as 11 tabelas automaticamente
npm run dev             # API em http://localhost:3001
```

> 💡 Para gerar um `JWT_SECRET` forte:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### 2. Frontend

```bash
npm install
npm run dev             # abre em http://localhost:5173
```

Em desenvolvimento o frontend já aponta para `http://localhost:3001`. Para usar outro endereço, copie `.env.example` para `.env` e ajuste `VITE_API_URL`.

## Estrutura do projeto

```
jahint-studies/
├── src/                        # Frontend — React 18 + Vite
│   ├── components/             #   Telas e componentes (Dashboard, Trabalhos, Provas…)
│   ├── store/StoreProvider.jsx #   Estado global + sincronização com a API
│   └── lib/api.js              #   Cliente HTTP (JWT em todas as requisições)
│
└── server/                     # Backend — Node.js + Express
    └── src/
        ├── routes/             #   ~35 rotas REST (/api/…)
        ├── controllers/        #   Validação e regras de negócio
        ├── models/             #   SQL (mysql2) + verificação de propriedade
        ├── middleware/         #   Autenticação JWT e tratamento de erros
        ├── config/             #   Pool do banco e uploads (multer)
        └── setup/              #   schema.sql + migração automática
```

**Modelo de dados** — cada recurso pertence a um usuário através da cadeia:

```
users ──< years ──< semesters ──< classes ──< notes / works / exams
                                    │            works ──< members · tabs · attachments
                                    └──< class_slots (dias e horários)
```

Se sua contribuição envolve o schema do banco, lembre-se de que exclusões são em cascata (`ON DELETE CASCADE`) — apagar um ano remove semestres, aulas, anotações, trabalhos e provas ligados a ele. Alterações no `schema.sql` devem preservar essa integridade referencial.

## Reportando bugs

Abra uma [Issue](../../issues) incluindo:

- O que você esperava que acontecesse
- O que de fato aconteceu
- Passos para reproduzir o problema
- Ambiente (SO, versão do Node, versão do MariaDB/MySQL)
- Prints ou logs de erro, se aplicável

## Sugerindo melhorias

Para features maiores, abra uma Issue descrevendo a ideia antes de começar a codar, para alinharmos o escopo e evitar retrabalho. Para ajustes pequenos (correção de texto, pequenos bugs de UI), pode ir direto para o Pull Request.

## Padrões de código

- **Frontend**: siga o padrão de componentes já usado em `src/components/`; mantenha o estilo visual *Frutiger Aero* (vidro translúcido, gradientes aqua) consistente com CSS puro
- **Backend**: siga a separação `routes → controllers → models`; consultas SQL explícitas via `mysql2` (sem ORM)
- Toda rota que acessa dados de usuário deve validar a propriedade do recurso (acesso alheio → `404`, nunca `403`, para não vazar existência do recurso)
- Nomeie variáveis e funções em português ou inglês conforme o padrão já existente no arquivo que você está editando (evite misturar os dois no mesmo arquivo)

## Padrão de commits

Utilize mensagens de commit curtas e descritivas, preferencialmente seguindo [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona filtro de provas por semestre
fix: corrige contagem regressiva de provas com data passada
docs: atualiza instruções de setup do backend
refactor: extrai validação de propriedade para middleware
```

Prefixos comuns: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `chore`.

## Segurança

Este projeto lida com dados pessoais de usuários (anotações, trabalhos, anexos). Ao contribuir:

- **Nunca** commite credenciais, tokens ou arquivos `.env`
- Senhas devem sempre passar por `bcrypt` — nunca em texto puro
- Toda nova rota autenticada deve usar o middleware de JWT existente
- Anexos e uploads devem continuar sendo servidos apenas por rota autenticada

Se você encontrar uma vulnerabilidade de segurança, evite abrir uma Issue pública — prefira reportar diretamente ao mantenedor do repositório.

## Dúvidas?

Abra uma [Issue](../../issues) ou comente no Pull Request relacionado. Toda contribuição é bem-vinda! ☕