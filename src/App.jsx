import { useEffect, useState } from 'react'
import { api, getToken, setToken, purgeLegacyLocalData } from './lib/api'
import { StoreProvider } from './store/StoreProvider'
import AuthScreen from './components/AuthScreen'
import Shell from './components/Shell'

export default function App() {
  // undefined = verificando sessão | null = deslogado | objeto = logado
  const [user, setUser] = useState(undefined)
  const [initialData, setInitialData] = useState(null)

  useEffect(() => {
    purgeLegacyLocalData() // limpa contas/dados da era 100% local (uma vez por carga)
    if (!getToken()) return setUser(null)
    api.bootstrap()
      .then(({ user, data }) => { setInitialData(data); setUser(user) })
      .catch(() => { setToken(null); setUser(null) }) // token expirado/inválido
  }, [])

  // Após login/cadastro: guarda o token e carrega os dados do servidor
  const onAuthed = async ({ token, user }) => {
    setToken(token)
    const boot = await api.bootstrap()
    setInitialData(boot.data)
    setUser(boot.user ?? user)
  }

  const onLogout = () => {
    setToken(null)
    setInitialData(null)
    setUser(null)
  }

  if (user === undefined) {
    return <div className="app-loading">Carregando…</div>
  }

  if (!user) {
    return <AuthScreen onAuthed={onAuthed} />
  }

  return (
    <StoreProvider
      key={user.id}
      user={user}
      initialData={initialData}
      onLogout={onLogout}
      onUserChanged={setUser}
    >
      <Shell />
    </StoreProvider>
  )
}
