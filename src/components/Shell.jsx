import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, GraduationCap, Briefcase, FileText, User, LogOut, Menu, X,
} from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import Dashboard from './Dashboard'
import StudiesView from './StudiesView'
import SemesterView from './SemesterView'
import ClassView from './ClassView'
import WorksView from './WorksView'
import WorkDetail from './WorkDetail'
import ExamsView from './ExamsView'
import ProfileView from './ProfileView'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, match: ['dashboard'] },
  { key: 'studies', label: 'Meus Estudos', icon: GraduationCap, match: ['studies', 'semester', 'class'] },
  { key: 'works', label: 'Trabalhos', icon: Briefcase, match: ['works', 'work'] },
  { key: 'exams', label: 'Provas', icon: FileText, match: ['exams'] },
  { key: 'profile', label: 'Perfil', icon: User, match: ['profile'] },
]

function CurrentView() {
  const { route } = useStore()
  switch (route.view) {
    case 'studies': return <StudiesView />
    case 'semester': return <SemesterView semesterId={route.semesterId} />
    case 'class': return <ClassView classId={route.classId} />
    case 'works': return <WorksView />
    case 'work': return <WorkDetail workId={route.workId} />
    case 'exams': return <ExamsView />
    case 'profile': return <ProfileView />
    default: return <Dashboard />
  }
}

export default function Shell() {
  const { route, nav, user, onLogout } = useStore()
  const contentRef = useRef(null)
  // Gaveta de navegação — usada apenas nas larguras mobile (ver styles.mobile.css)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
    setMenuOpen(false) // navegar sempre fecha a gaveta
  }, [route])

  // Esc fecha a gaveta (teclado externo / tablet com teclado)
  useEffect(() => {
    if (!menuOpen) return
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const currentNav = NAV.find(item => item.match.includes(route.view)) || NAV[0]

  // Página de anotações de aula: no desktop o menu recolhe para a lateral,
  // liberando a largura toda para o editor. Ele volta ao pousar o mouse na
  // borda esquerda (faixa .sidebar-hotzone) ou ao focar a navegação via teclado.
  const sidebarPeek = route.view === 'class'

  const avatar = user.avatar
    ? <img src={user.avatar} alt="" className="user-avatar" />
    : <div className="user-avatar user-avatar-fallback">{(user.nickname || '?')[0].toUpperCase()}</div>

  return (
    <div className={'app' + (sidebarPeek ? ' sidebar-peek' : '')}>
      <div className="bg-aero">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
        <div className="orb orb-4" /><div className="orb orb-5" />
      </div>

      {/* Barra superior exclusiva do mobile: hambúrguer + tela atual + atalho do perfil */}
      <header className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu de navegação"
          aria-expanded={menuOpen}
        >
          <Menu size={21} />
        </button>
        <div className="mobile-topbar-text">
          <span className="mobile-topbar-app">Jahint<span>.Studies</span></span>
          <span className="mobile-topbar-view">{currentNav.label}</span>
        </div>
        <button className="mobile-user-btn" onClick={() => nav('profile')} aria-label="Abrir meu perfil">
          {avatar}
        </button>
      </header>

      {/* Fundo escurecido: fecha a gaveta ao tocar fora */}
      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      {/* Faixa sensível ao mouse na borda esquerda (só existe no modo peek do
          desktop). Precisa vir ANTES do <aside> no DOM: o CSS usa o seletor de
          irmão (~) para revelar a sidebar quando esta faixa recebe hover. */}
      {sidebarPeek && (
        <div className="sidebar-hotzone" aria-hidden="true">
          <div className="sidebar-handle" />
        </div>
      )}

      <aside className={'sidebar' + (menuOpen ? ' open' : '')}>
        <div className="side-logo">
          <div className="logo-badge" onClick={() => nav('dashboard')}><GraduationCap size={22} /></div>
          <div className="side-logo-text" onClick={() => nav('dashboard')}>Jahint<span>.Studies</span></div>
          <button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="side-nav">
          {NAV.map(item => {
            const Icon = item.icon
            const active = item.match.includes(route.view)
            return (
              <button
                key={item.key}
                className={'nav-item' + (active ? ' active' : '')}
                onClick={() => nav(item.key)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="side-user">
          <button className="user-chip" onClick={() => nav('profile')} title="Ver perfil">
            {avatar}
            <div className="user-chip-text">
              <strong>{user.nickname}</strong>
              <small>{user.course || user.institution || user.email}</small>
            </div>
          </button>
          <button className="icon-btn" onClick={onLogout} title="Sair da conta"><LogOut size={17} /></button>
        </div>
      </aside>

      {/* content-fill: na página de anotações o painel preenche a viewport
          (modo documento, só desktop) — mesma condição do sidebar-peek */}
      <main className={'content' + (sidebarPeek ? ' content-fill' : '')} ref={contentRef}>
        <CurrentView />
      </main>
    </div>
  )
}
