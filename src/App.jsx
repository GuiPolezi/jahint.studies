import { useEffect, useState } from 'react'
import { loadUsers, saveUsers, loadSession, saveSession } from './lib/auth'
import { StoreProvider } from './store/StoreProvider'
import AuthScreen from './components/AuthScreen'
import Shell from './components/Shell'

export default function App() {
  const [users, setUsers] = useState(loadUsers)
  const [session, setSession] = useState(loadSession)

  useEffect(() => saveUsers(users), [users])
  useEffect(() => saveSession(session), [session])

  const user = users.find(u => u.id === session)

  if (!user) {
    return (
      <AuthScreen
        users={users}
        onLogin={id => setSession(id)}
        onRegister={u => { setUsers(us => [...us, u]); setSession(u.id) }}
      />
    )
  }

  return (
    <StoreProvider
      key={user.id}
      user={user}
      onLogout={() => setSession(null)}
      onUpdateUser={changes =>
        setUsers(us => us.map(u => (u.id === user.id ? { ...u, ...changes } : u)))
      }
    >
      <Shell />
    </StoreProvider>
  )
}
