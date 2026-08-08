import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { api, ApiError } from '../lib/api'

const StoreCtx = createContext(null)
export const useStore = () => useContext(StoreCtx)

const EMPTY = {
  years: [],        // { id, number, calendarYear }
  semesters: [],    // { id, yearId, number }
  classes: [],      // { id, semesterId, name, professor, color, slots: [{day, start, end}] }
  notes: [],        // { id, classId, title, date, updatedAt, attachments }  (conteúdo carregado sob demanda)
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

// Semestres de um ano letivo, em ordem
export function semestersOfYear(data, yearId) {
  return data.semesters.filter(s => s.yearId === yearId).sort((a, b) => a.number - b.number)
}

// Ids das aulas de um semestre — base para filtrar trabalhos e provas por semestre,
// já que o vínculo com o semestre vem sempre da matéria
export function semesterClassIds(data, semesterId) {
  return new Set(data.classes.filter(c => c.semesterId === semesterId).map(c => c.id))
}

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

export function StoreProvider({ user, initialData, onLogout, onUserChanged, children }) {
  const [data, setData] = useState(() => ({ ...EMPTY, ...(initialData || {}) }))
  const [route, setRoute] = useState({ view: 'dashboard' })
  const nav = (view, params = {}) => setRoute({ view, ...params })

  // Estado mais recente acessível dentro do api_ (que é memoizado uma única vez)
  const dataRef = useRef(data)
  dataRef.current = data

  // Sincronização com debounce para campos de digitação (título, progresso…):
  // a tela atualiza na hora e a API recebe uma única chamada logo depois.
  const timers = useRef(new Map())
  const pending = useRef(new Map())

  const api_ = useMemo(() => {
    const patch = fn => setData(prev => fn(prev))

    const fail = err => {
      if (err instanceof ApiError && err.status === 401) {
        alert('Sua sessão expirou. Entre novamente.')
        onLogout()
      } else {
        alert(err.message || 'Erro de comunicação com o servidor.')
      }
      return null
    }

    // Executa uma chamada à API; em caso de erro avisa e devolve null
    const run = promise => promise.catch(fail)

    const queueSync = (key, changes, send) => {
      pending.current.set(key, { ...(pending.current.get(key) || {}), ...changes })
      clearTimeout(timers.current.get(key))
      timers.current.set(key, setTimeout(() => {
        const merged = pending.current.get(key)
        pending.current.delete(key)
        timers.current.delete(key)
        run(send(merged))
      }, 600))
    }

    return {
      // ---------- anos ----------
      async addYear(number, calendarYear) {
        const res = await run(api.addYear(Number(number), calendarYear ? Number(calendarYear) : null))
        if (res) patch(d => ({ ...d, years: [...d.years, res.year] }))
        return res?.year || null
      },
      async updYear(id, changes) {
        const res = await run(api.updYear(id, changes))
        if (res) patch(d => ({ ...d, years: d.years.map(y => (y.id === id ? { ...y, ...changes } : y)) }))
      },
      async delYear(id) {
        const res = await run(api.delYear(id))
        if (!res) return
        patch(d => {
          const semIds = d.semesters.filter(s => s.yearId === id).map(s => s.id)
          const classIds = d.classes.filter(c => semIds.includes(c.semesterId)).map(c => c.id)
          return {
            ...d,
            years: d.years.filter(y => y.id !== id),
            semesters: d.semesters.filter(s => s.yearId !== id),
            classes: d.classes.filter(c => !classIds.includes(c.id)),
            notes: d.notes.filter(n => !classIds.includes(n.classId)),
            works: d.works.filter(w => !classIds.includes(w.classId)),
            exams: d.exams.filter(e => !classIds.includes(e.classId)),
            activeSemesterId: semIds.includes(d.activeSemesterId) ? null : d.activeSemesterId,
          }
        })
      },

      // ---------- semestres ----------
      async addSemester(yearId, number) {
        const res = await run(api.addSemester(yearId, Number(number)))
        if (res) patch(d => ({ ...d, semesters: [...d.semesters, res.semester] }))
        return res?.semester || null
      },
      async delSemester(id) {
        const res = await run(api.delSemester(id))
        if (!res) return
        patch(d => {
          const classIds = d.classes.filter(c => c.semesterId === id).map(c => c.id)
          return {
            ...d,
            semesters: d.semesters.filter(s => s.id !== id),
            classes: d.classes.filter(c => !classIds.includes(c.id)),
            notes: d.notes.filter(n => !classIds.includes(n.classId)),
            works: d.works.filter(w => !classIds.includes(w.classId)),
            exams: d.exams.filter(e => !classIds.includes(e.classId)),
            activeSemesterId: d.activeSemesterId === id ? null : d.activeSemesterId,
          }
        })
      },
      async setActiveSemester(id) {
        const next = dataRef.current.activeSemesterId === id ? null : id
        const res = await run(api.setActiveSemester(next))
        if (res) patch(d => ({ ...d, activeSemesterId: next }))
      },

      // ---------- aulas ----------
      async addClass(semesterId, cls) {
        const res = await run(api.addClass(semesterId, cls))
        if (res) patch(d => ({ ...d, classes: [...d.classes, res.class] }))
        return res?.class || null
      },
      async updClass(id, changes) {
        const res = await run(api.updClass(id, changes))
        if (res) patch(d => ({ ...d, classes: d.classes.map(c => (c.id === id ? res.class : c)) }))
      },
      async delClass(id) {
        const res = await run(api.delClass(id))
        if (!res) return
        patch(d => ({
          ...d,
          classes: d.classes.filter(c => c.id !== id),
          notes: d.notes.filter(n => n.classId !== id),
          works: d.works.filter(w => w.classId !== id),
          exams: d.exams.filter(e => e.classId !== id),
        }))
      },

      // ---------- anotações de aula (conteúdo via RichEditor/api) ----------
      async addNote(classId, { title, date }) {
        const res = await run(api.addNote(classId, { title, date }))
        if (res) patch(d => ({ ...d, notes: [...d.notes, res.note] }))
        return res?.note || null
      },
      updNote(id, changes) {
        // Otimista + debounce: título/data são digitados letra a letra
        patch(d => ({
          ...d,
          notes: d.notes.map(n => (n.id === id ? { ...n, ...changes, updatedAt: Date.now() } : n)),
        }))
        queueSync(`note:${id}`, changes, merged => api.updNote(id, merged))
      },
      async delNote(id) {
        const res = await run(api.delNote(id))
        if (res) patch(d => ({ ...d, notes: d.notes.filter(n => n.id !== id) }))
      },
      async uploadNoteAttachment(noteId, file) {
        const res = await run(api.addNoteAttachment(noteId, file))
        if (res) patch(d => ({
          ...d,
          notes: d.notes.map(n =>
            n.id === noteId ? { ...n, attachments: [...(n.attachments || []), res.attachment] } : n
          ),
        }))
        return res?.attachment || null
      },
      async delNoteAttachment(noteId, attId) {
        const res = await run(api.delNoteAttachment(attId))
        if (res) patch(d => ({
          ...d,
          notes: d.notes.map(n =>
            n.id === noteId
              ? { ...n, attachments: (n.attachments || []).filter(a => a.id !== attId) }
              : n
          ),
        }))
      },
      downloadNoteAttachment: att => run(api.downloadNoteAttachment(att)),

      // ---------- trabalhos e tarefas ----------
      async addWork({ classId, title, type, dueDate, delivery }) {
        const res = await run(api.addWork({ classId, title, type, dueDate, delivery }))
        if (res) patch(d => ({ ...d, works: [...d.works, res.work] }))
        return res?.work || null
      },
      updWork(id, changes) {
        // Otimista + debounce (título, slider de progresso, selects)
        patch(d => ({ ...d, works: d.works.map(w => (w.id === id ? { ...w, ...changes } : w)) }))
        queueSync(`work:${id}`, changes, merged => api.updWork(id, merged))
      },
      async delWork(id) {
        const res = await run(api.delWork(id))
        if (res) patch(d => ({ ...d, works: d.works.filter(w => w.id !== id) }))
      },
      async addWorkMember(workId, name) {
        const res = await run(api.addMember(workId, name))
        if (res) patch(d => ({
          ...d,
          works: d.works.map(w =>
            w.id === workId ? { ...w, members: [...w.members, res.member] } : w
          ),
        }))
      },
      async delWorkMember(workId, memberId) {
        const res = await run(api.delMember(workId, memberId))
        if (res) patch(d => ({
          ...d,
          works: d.works.map(w =>
            w.id === workId ? { ...w, members: w.members.filter(m => m.id !== memberId) } : w
          ),
        }))
      },
      async addWorkTab(workId, title) {
        const res = await run(api.addWorkTab(workId, title))
        if (res) patch(d => ({
          ...d,
          works: d.works.map(w => (w.id === workId ? { ...w, tabs: [...w.tabs, res.tab] } : w)),
        }))
        return res?.tab || null
      },
      async delWorkTab(workId, tabId) {
        const res = await run(api.delWorkTab(tabId))
        if (res) patch(d => ({
          ...d,
          works: d.works.map(w =>
            w.id === workId ? { ...w, tabs: w.tabs.filter(t => t.id !== tabId) } : w
          ),
        }))
      },
      async uploadAttachment(workId, file) {
        const res = await run(api.addAttachment(workId, file))
        if (res) patch(d => ({
          ...d,
          works: d.works.map(w =>
            w.id === workId ? { ...w, attachments: [...w.attachments, res.attachment] } : w
          ),
        }))
        return res?.attachment || null
      },
      async delAttachment(workId, attId) {
        const res = await run(api.delAttachment(attId))
        if (res) patch(d => ({
          ...d,
          works: d.works.map(w =>
            w.id === workId ? { ...w, attachments: w.attachments.filter(a => a.id !== attId) } : w
          ),
        }))
      },
      downloadAttachment: att => run(api.downloadAttachment(att)),

      // ---------- provas ----------
      async addExam(exam) {
        const res = await run(api.addExam(exam))
        if (res) patch(d => ({ ...d, exams: [...d.exams, res.exam] }))
        return res?.exam || null
      },
      async updExam(id, exam) {
        const res = await run(api.updExam(id, exam))
        if (res) patch(d => ({ ...d, exams: d.exams.map(e => (e.id === id ? res.exam : e)) }))
      },
      async delExam(id) {
        const res = await run(api.delExam(id))
        if (res) patch(d => ({ ...d, exams: d.exams.filter(e => e.id !== id) }))
      },

      // ---------- perfil ----------
      async updateProfile(changes) {
        const res = await run(api.updateMe(changes))
        if (res) onUserChanged(res.user)
        return res?.user || null
      },
      async updateAvatar(file) {
        const res = await run(api.updateAvatar(file))
        if (res) onUserChanged(res.user)
      },

      // ---------- dados de exemplo (matérias reais do usuário) ----------
      async seedExample() {
        try {
          const { year } = await api.addYear(3, new Date().getFullYear())
          const { semester } = await api.addSemester(year.id, 2)
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
          const colors = ['#0a84ff', '#00b8d9', '#34c759', '#ff9f0a', '#ff375f', '#bf5af2', '#5e5ce6', '#ff6b35']
          const created = []
          for (let i = 0; i < subjects.length; i++) {
            const [name, day, start, end] = subjects[i]
            const { class: cls } = await api.addClass(semester.id, {
              name, professor: '', color: colors[i % colors.length],
              slots: [{ day, start, end }],
            })
            created.push(cls)
          }
          const plus = days => {
            const d = new Date(); d.setDate(d.getDate() + days)
            return d.toISOString().slice(0, 10)
          }
          await api.addExam({
            classId: created[0].id, label: 'P1', date: plus(10), time: '19:00',
            topics: 'Padrões de projeto, camadas e arquitetura MVC.',
          })
          const { work } = await api.addWork({
            classId: created[3].id, title: 'Tarefa de levantamento de requisitos',
            type: 'tarefa', dueDate: plus(3), delivery: 'Microsoft Teams',
          })
          await api.updWork(work.id, { progress: 40 })
          await api.setActiveSemester(semester.id)
          // Recarrega tudo do servidor de uma vez
          const boot = await api.bootstrap()
          setData({ ...EMPTY, ...boot.data })
        } catch (err) {
          fail(err)
        }
      },
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value = { data, route, nav, user, onLogout, ...api_ }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}
