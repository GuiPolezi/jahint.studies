import { useEffect, useRef } from 'react'
import {
  LayoutDashboard, GraduationCap, Briefcase, FileText, User, LogOut,
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

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [route])

  return (
    <div className="app">
      <div className="bg-aero">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
        <div className="orb orb-4" /><div className="orb orb-5" />
      </div>

      <aside className="sidebar">
        <div className="side-logo" onClick={() => nav('dashboard')}>
          <div className="logo-badge"><GraduationCap size={22} /></div>
          <div className="side-logo-text">Jahint<span>.Studies</span></div>
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
            {user.avatar
              ? <img src={user.avatar} alt="" className="user-avatar" />
              : <div className="user-avatar user-avatar-fallback">{(user.nickname || '?')[0].toUpperCase()}</div>}
            <div className="user-chip-text">
              <strong>{user.nickname}</strong>
              <small>{user.course || user.institution || user.email}</small>
            </div>
          </button>
          <button className="icon-btn" onClick={onLogout} title="Sair da conta"><LogOut size={17} /></button>
        </div>
      </aside>

      <main className="content" ref={contentRef}>
        <CurrentView />
      </main>
    </div>
  )
}
