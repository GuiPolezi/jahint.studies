import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uid, isoPlusDays } from '../lib/utils'
import { idbDel, idbDelPrefix } from '../lib/idb'

const StoreCtx = createContext(null)
export const useStore = () => useContext(StoreCtx)

const EMPTY = {
  years: [],        // { id, number, calendarYear }
  semesters: [],    // { id, yearId, number }
  classes: [],      // { id, semesterId, name, professor, color, slots: [{day, start, end}] }
  notes: [],        // { id, classId, title, date, updatedAt }  (conteúdo no IndexedDB)
  works: [],        // { id, classId, title, type, dueDate, delivery, members, progress, tabs, attachments, createdAt }
  exams: [],        // { id, classId, label, date, time, topics }
  activeSemesterId: null,
}

export const DEFAULT_WORK_TABS = ['Descrição', 'Rascunho', 'Desenvolvimento']

// ---------- derivações do vínculo aula → semestre → ano ----------
export function classInfo(data, classId) {
  const cls = data.classes.find(c => c.id === classId)
  const sem = cls ? data.semesters.find(s => s.id === cls.semesterId) : null
  const year = sem ? data.years.find(y => y.id === sem.yearId) : null
  return { cls, sem, year }
}

export const termLabel = (sem, year) =>
  sem && year ? `${year.number}º Ano · ${sem.number}º Sem` : ''

// Aulas agrupadas por ano/semestre, em ordem — para selects e filtros
export function classGroups(data) {
  const years = [...data.years].sort((a, b) => a.number - b.number)
  const groups = []
  for (const y of years) {
    const sems = data.semesters.filter(s => s.yearId === y.id).sort((a, b) => a.number - b.number)
    for (const s of sems) {
      const classes = data.classes.filter(c => c.semesterId === s.id)
      if (classes.length) groups.push({ year: y, sem: s, classes })
    }
  }
  return groups
}

// Select de matéria com optgroups "1º Ano · 1º Semestre (2024)"
export function ClassSelect({ data, value, onChange, required }) {
  const groups = classGroups(data)
  return (
    <select value={value} onChange={onChange} required={required}>
      <option value="" disabled>Selecione a matéria…</option>
      {groups.map(g => (
        <optgroup
          key={g.sem.id}
          label={`${g.year.number}º Ano · ${g.sem.number}º Semestre${g.year.calendarYear ? ` (${g.year.calendarYear})` : ''}`}
        >
          {g.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

// Aula sugerida ao criar trabalho/prova: primeira do semestre atual, senão a primeira geral
export function defaultClassId(data) {
  const active = data.classes.find(c => c.semesterId === data.activeSemesterId)
  return (active || data.classes[0])?.id || ''
}

export function StoreProvider({ user, onLogout, onUpdateUser, children }) {
  const storageKey = `jahint:data:${user.id}`

  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
    } catch {
      return EMPTY
    }
  })

  const quotaWarned = useRef(false)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (e) {
      console.error('Falha ao salvar no localStorage', e)
      if (!quotaWarned.current) {
        quotaWarned.current = true
        alert('Atenção: o armazenamento local está cheio. Alguns dados podem não ter sido salvos.')
      }
    }
  }, [data, storageKey])

  const [route, setRoute] = useState({ view: 'dashboard' })
  const nav = (view, params = {}) => setRoute({ view, ...params })

  const api = useMemo(() => {
    const patch = fn => setData(prev => fn(prev))

    // ---------- limpeza em cascata (IndexedDB) ----------
    const cleanupWorks = works => {
      for (const w of works) {
        idbDelPrefix('contents', `work:${w.id}:`).catch(() => {})
        for (const att of w.attachments || []) idbDel('files', att.id).catch(() => {})
      }
    }
    const cleanupClasses = (classIds, d) => {
      for (const n of d.notes.filter(n => classIds.includes(n.classId)))
        idbDel('contents', `note:${n.id}`).catch(() => {})
      cleanupWorks(d.works.filter(w => classIds.includes(w.classId)))
    }
    const removeClassesData = (d, classIds) => ({
      ...d,
      classes: d.classes.filter(c => !classIds.includes(c.id)),
      notes: d.notes.filter(n => !classIds.includes(n.classId)),
      works: d.works.filter(w => !classIds.includes(w.classId)),
      exams: d.exams.filter(e => !classIds.includes(e.classId)),
    })

    return {
      // ---------- anos ----------
      addYear(number, calendarYear) {
        const y = { id: uid(), number: Number(number), calendarYear: Number(calendarYear) || null }
        patch(d => ({ ...d, years: [...d.years, y] }))
        return y
      },
      updYear(id, changes) {
        patch(d => ({ ...d, years: d.years.map(y => (y.id === id ? { ...y, ...changes } : y)) }))
      },
      delYear(id) {
        patch(d => {
          const semIds = d.semesters.filter(s => s.yearId === id).map(s => s.id)
          const classIds = d.classes.filter(c => semIds.includes(c.semesterId)).map(c => c.id)
          cleanupClasses(classIds, d)
          const next = removeClassesData(d, classIds)
          return {
            ...next,
            years: next.years.filter(y => y.id !== id),
            semesters: next.semesters.filter(s => s.yearId !== id),
            activeSemesterId: semIds.includes(next.activeSemesterId) ? null : next.activeSemesterId,
          }
        })
      },

      // ---------- semestres ----------
      addSemester(yearId, number) {
        const s = { id: uid(), yearId, number: Number(number) }
        patch(d => ({ ...d, semesters: [...d.semesters, s] }))
        return s
      },
      delSemester(id) {
        patch(d => {
          const classIds = d.classes.filter(c => c.semesterId === id).map(c => c.id)
          cleanupClasses(classIds, d)
          const next = removeClassesData(d, classIds)
          return {
            ...next,
            semesters: next.semesters.filter(s => s.id !== id),
            activeSemesterId: next.activeSemesterId === id ? null : next.activeSemesterId,
          }
        })
      },
      setActiveSemester(id) {
        patch(d => ({ ...d, activeSemesterId: d.activeSemesterId === id ? null : id }))
      },

      // ---------- aulas ----------
      addClass(semesterId, cls) {
        const c = { id: uid(), semesterId, ...cls }
        patch(d => ({ ...d, classes: [...d.classes, c] }))
        return c
      },
      updClass(id, changes) {
        patch(d => ({ ...d, classes: d.classes.map(c => (c.id === id ? { ...c, ...changes } : c)) }))
      },
      delClass(id) {
        patch(d => {
          cleanupClasses([id], d)
          return removeClassesData(d, [id])
        })
      },

      // ---------- anotações de aula ----------
      addNote(classId, { title, date }) {
        const n = { id: uid(), classId, title, date, updatedAt: Date.now() }
        patch(d => ({ ...d, notes: [...d.notes, n] }))
        return n
      },
      updNote(id, changes) {
        patch(d => ({
          ...d,
          notes: d.notes.map(n => (n.id === id ? { ...n, ...changes, updatedAt: Date.now() } : n)),
        }))
      },
      delNote(id) {
        idbDel('contents', `note:${id}`).catch(() => {})
        patch(d => ({ ...d, notes: d.notes.filter(n => n.id !== id) }))
      },

      // ---------- trabalhos e tarefas ----------
      addWork({ classId, title, type, dueDate, delivery }) {
        const w = {
          id: uid(), classId, title, type, dueDate, delivery,
          members: [], progress: 0,
          tabs: DEFAULT_WORK_TABS.map(t => ({ id: uid(), title: t })),
          attachments: [],
          createdAt: Date.now(),
        }
        patch(d => ({ ...d, works: [...d.works, w] }))
        return w
      },
      updWork(id, changes) {
        patch(d => ({ ...d, works: d.works.map(w => (w.id === id ? { ...w, ...changes } : w)) }))
      },
      delWork(id) {
        patch(d => {
          cleanupWorks(d.works.filter(w => w.id === id))
          return { ...d, works: d.works.filter(w => w.id !== id) }
        })
      },
      addWorkTab(workId, title) {
        const tab = { id: uid(), title }
        patch(d => ({
          ...d,
          works: d.works.map(w => (w.id === workId ? { ...w, tabs: [...w.tabs, tab] } : w)),
        }))
        return tab
      },
      delWorkTab(workId, tabId) {
        idbDel('contents', `work:${workId}:${tabId}`).catch(() => {})
        patch(d => ({
          ...d,
          works: d.works.map(w =>
            w.id === workId ? { ...w, tabs: w.tabs.filter(t => t.id !== tabId) } : w
          ),
        }))
      },
      addAttachment(workId, meta) {
        patch(d => ({
          ...d,
          works: d.works.map(w =>
            w.id === workId ? { ...w, attachments: [...w.attachments, meta] } : w
          ),
        }))
      },
      delAttachment(workId, attId) {
        idbDel('files', attId).catch(() => {})
        patch(d => ({
          ...d,
          works: d.works.map(w =>
            w.id === workId ? { ...w, attachments: w.attachments.filter(a => a.id !== attId) } : w
          ),
        }))
      },

      // ---------- provas ----------
      addExam(exam) {
        const e = { id: uid(), ...exam }
        patch(d => ({ ...d, exams: [...d.exams, e] }))
        return e
      },
      updExam(id, changes) {
        patch(d => ({ ...d, exams: d.exams.map(e => (e.id === id ? { ...e, ...changes } : e)) }))
      },
      delExam(id) {
        patch(d => ({ ...d, exams: d.exams.filter(e => e.id !== id) }))
      },

      // ---------- dados de exemplo (matérias reais do usuário) ----------
      seedExample() {
        const year = { id: uid(), number: 3, calendarYear: new Date().getFullYear() }
        const sem = { id: uid(), yearId: year.id, number: 2 }
        const subjects = [
          ['Arquitetura de Software', 1, '19:00', '22:30'],
          ['Redes de Computadores 2', 2, '19:00', '22:30'],
          ['Aprendizado de Máquina', 3, '19:00', '22:30'],
          ['Engenharia de Software', 4, '19:00', '20:40'],
          ['Projeto Interdisciplinar de Computação 3', 4, '20:50', '22:30'],
          ['Programação de Dispositivos Móveis', 5, '19:00', '22:30'],
          ['Governança e Gestão de Tecnologia da Informação', 6, '08:00', '09:40'],
          ['Metodologia do Trabalho Científico e Tecnológico', 6, '09:50', '11:30'],
        ]
        const classes = subjects.map(([name, day, start, end], i) => ({
          id: uid(), semesterId: sem.id, name, professor: '',
          color: ['#0a84ff', '#00b8d9', '#34c759', '#ff9f0a', '#ff375f', '#bf5af2', '#5e5ce6', '#ff6b35'][i % 8],
          slots: [{ day, start, end }],
        }))
        const exam = {
          id: uid(), classId: classes[0].id, label: 'P1',
          date: isoPlusDays(10), time: '19:00',
          topics: 'Padrões de projeto, camadas e arquitetura MVC.',
        }
        const work = {
          id: uid(), classId: classes[3].id, title: 'Tarefa de levantamento de requisitos',
          type: 'tarefa', dueDate: isoPlusDays(3), delivery: 'Microsoft Teams',
          members: [], progress: 40,
          tabs: DEFAULT_WORK_TABS.map(t => ({ id: uid(), title: t })),
          attachments: [], createdAt: Date.now(),
        }
        patch(d => ({
          ...d,
          years: [...d.years, year],
          semesters: [...d.semesters, sem],
          classes: [...d.classes, ...classes],
          exams: [...d.exams, exam],
          works: [...d.works, work],
          activeSemesterId: sem.id,
        }))
      },
    }
  }, [])

  const value = { data, route, nav, user, onLogout, onUpdateUser, ...api }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}
