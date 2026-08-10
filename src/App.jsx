import { useEffect, useState } from 'react'
import { api, getToken, setToken, purgeLegacyLocalData } from './lib/api'
import { StoreProvider } from './store/StoreProvider'
import { clearContentCache } from './components/RichEditor'
import AuthScreen from './components/AuthScreen'
import Shell from './components/Shell'
import SplashScreen from './components/SplashScreen'

export default function App() {
  // undefined = verificando sessão | null = deslogado | objeto = logado
  const [user, setUser] = useState(undefined)
  const [initialData, setInitialData] = useState(null)
  // splash fica montada por cima até a animação de saída terminar
  const [splashDone, setSplashDone] = useState(false)

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
    clearContentCache() // anotações em memória não podem vazar para a próxima conta
    setInitialData(null)
    setUser(null)
  }

  // O app renderiza por baixo da splash assim que a sessão resolve; a splash
  // faz o crossfade de saída e só então é desmontada.
  const ready = user !== undefined
  let view = null
  if (ready) {
    view = !user ? (
      <AuthScreen onAuthed={onAuthed} />
    ) : (
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

  return (
    <>
      {view}
      {!splashDone && <SplashScreen ready={ready} onFinish={() => setSplashDone(true)} />}
    </>
  )
}
