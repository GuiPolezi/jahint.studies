// Autenticação de rascunho: usuários e sessão salvos no localStorage.
// (Em produção isso viraria um backend com senhas criptografadas.)

const USERS_KEY = 'jahint:users'
const SESSION_KEY = 'jahint:session'

export function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || []
  } catch {
    return []
  }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function loadSession() {
  return localStorage.getItem(SESSION_KEY) || null
}

export function saveSession(userId) {
  if (userId) localStorage.setItem(SESSION_KEY, userId)
  else localStorage.removeItem(SESSION_KEY)
}
