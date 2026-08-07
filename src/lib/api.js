// Cliente da API do Jahint.Studies.
// O token JWT fica no localStorage e vai em todas as requisições autenticadas.
// A URL da API vem do .env do Vite (VITE_API_URL) — em dev, http://localhost:3001.

const ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const BASE = ORIGIN + '/api'
const TOKEN_KEY = 'jahint:token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = t => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

// O avatar vem do servidor como caminho relativo (/uploads/avatars/x.jpg);
// os componentes usam <img src>, então convertemos para URL absoluta.
const fixUser = user => (user ? { ...user, avatar: user.avatar ? ORIGIN + user.avatar : null } : user)

// Remove os dados da era "100% local" (contas/sessão/dados no localStorage e
// anotações/arquivos no IndexedDB). Hoje tudo vive no servidor — só o token fica.
export function purgeLegacyLocalData() {
  try {
    localStorage.removeItem('jahint:users')
    localStorage.removeItem('jahint:session')
    for (const key of Object.keys(localStorage))
      if (key.startsWith('jahint:data:')) localStorage.removeItem(key)
    indexedDB?.deleteDatabase?.('jahint-studies')
  } catch { /* melhor esforço */ }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function request(method, path, body) {
  const isForm = body instanceof FormData
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(isForm ? {} : body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    // 413 sem corpo JSON = o proxy (nginx) barrou antes de chegar na API.
    // O padrão do nginx é client_max_body_size 1m, menor que uma foto de celular.
    if (res.status === 413 && !json?.error)
      throw new ApiError(413, 'Arquivo grande demais para o servidor. Aumente o limite de upload do proxy (nginx: client_max_body_size).')
    throw new ApiError(res.status, json?.error || 'Erro de comunicação com o servidor.')
  }
  return json
}

const get = path => request('GET', path)
const post = (path, body) => request('POST', path, body)
const put = (path, body) => request('PUT', path, body)
const del = path => request('DELETE', path)

export const api = {
  // ---------- conta ----------
  register: form => post('/auth/register', form)
    .then(r => ({ ...r, user: fixUser(r.user) })),         // → { token, user }
  login: (email, password) => post('/auth/login', { email, password })
    .then(r => ({ ...r, user: fixUser(r.user) })),
  me: () => get('/me').then(r => ({ user: fixUser(r.user) })),
  updateMe: changes => put('/me', changes).then(r => ({ user: fixUser(r.user) })),
  updateAvatar: file => {
    const fd = new FormData()
    fd.append('avatar', file)
    return post('/me/avatar', fd).then(r => ({ user: fixUser(r.user) }))
  },
  setActiveSemester: semesterId => put('/me/active-semester', { semesterId }),
  bootstrap: () => get('/me/data')
    .then(r => ({ ...r, user: fixUser(r.user) })),         // → { user, data } no formato do store

  // ---------- anos e semestres ----------
  addYear: (number, calendarYear) => post('/years', { number, calendarYear }),
  updYear: (id, changes) => put(`/years/${id}`, changes),
  delYear: id => del(`/years/${id}`),
  addSemester: (yearId, number) => post(`/years/${yearId}/semesters`, { number }),
  delSemester: id => del(`/semesters/${id}`),

  // ---------- aulas ----------
  addClass: (semesterId, cls) => post(`/semesters/${semesterId}/classes`, cls),
  updClass: (id, cls) => put(`/classes/${id}`, cls),
  delClass: id => del(`/classes/${id}`),

  // ---------- anotações ----------
  listNotes: classId => get(`/classes/${classId}/notes`),
  addNote: (classId, { title, date }) => post(`/classes/${classId}/notes`, { title, date }),
  getNote: id => get(`/notes/${id}`),                      // inclui o conteúdo TipTap
  updNote: (id, changes) => put(`/notes/${id}`, changes),  // { title?, date?, content? }
  delNote: id => del(`/notes/${id}`),

  // ---------- trabalhos ----------
  listWorks: () => get('/works'),
  addWork: work => post('/works', work),
  getWork: id => get(`/works/${id}`),
  updWork: (id, changes) => put(`/works/${id}`, changes),
  delWork: id => del(`/works/${id}`),
  addMember: (workId, name) => post(`/works/${workId}/members`, { name }),
  delMember: (workId, memberId) => del(`/works/${workId}/members/${memberId}`),
  addWorkTab: (workId, title) => post(`/works/${workId}/tabs`, { title }),
  getTabContent: tabId => get(`/work-tabs/${tabId}/content`),
  updTab: (tabId, changes) => put(`/work-tabs/${tabId}`, changes),
  delWorkTab: tabId => del(`/work-tabs/${tabId}`),
  addAttachment: (workId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return post(`/works/${workId}/attachments`, fd)
  },
  delAttachment: attId => del(`/attachments/${attId}`),
  // Download autenticado: baixa o blob e dispara o "salvar como" no navegador
  async downloadAttachment(att) {
    const res = await fetch(`${BASE}/attachments/${att.id}/download`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new ApiError(res.status, 'Arquivo não encontrado no servidor.')
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = att.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  },

  // ---------- provas ----------
  listExams: () => get('/exams'),
  addExam: exam => post('/exams', exam),
  updExam: (id, exam) => put(`/exams/${id}`, exam),
  delExam: id => del(`/exams/${id}`),
}
