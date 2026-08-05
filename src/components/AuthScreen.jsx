import { useState } from 'react'
import { GraduationCap, Camera } from 'lucide-react'
import { uid, readImageResized } from '../lib/utils'
import { Field } from './ui'

export default function AuthScreen({ users, onLogin, onRegister }) {
  const [mode, setMode] = useState(users.length ? 'login' : 'register')
  const [error, setError] = useState('')

  // login
  const [logEmail, setLogEmail] = useState('')
  const [logPass, setLogPass] = useState('')

  // cadastro
  const [form, setForm] = useState({
    fullName: '', nickname: '', email: '', password: '',
    age: '', institution: '', course: '', avatar: null,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const doLogin = e => {
    e.preventDefault()
    const u = users.find(
      u => u.email.toLowerCase() === logEmail.trim().toLowerCase() && u.password === logPass
    )
    if (!u) return setError('E-mail ou senha incorretos.')
    onLogin(u.id)
  }

  const doRegister = e => {
    e.preventDefault()
    if (!form.fullName.trim()) return setError('Informe seu nome completo.')
    if (!/.+@.+\..+/.test(form.email.trim())) return setError('Informe um e-mail válido.')
    if (form.password.length < 4) return setError('A senha deve ter pelo menos 4 caracteres.')
    if (users.some(u => u.email.toLowerCase() === form.email.trim().toLowerCase()))
      return setError('Já existe uma conta com esse e-mail.')
    const user = {
      id: uid(),
      fullName: form.fullName.trim(),
      nickname: form.nickname.trim() || form.fullName.trim().split(' ')[0],
      email: form.email.trim(),
      password: form.password,
      age: form.age ? Number(form.age) : null,
      institution: form.institution.trim(),
      course: form.course.trim(),
      avatar: form.avatar,
    }
    onRegister(user)
  }

  const pickAvatar = async e => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      set('avatar', await readImageResized(f, 256, 0.85))
    } catch {
      setError('Não foi possível carregar a imagem.')
    }
    e.target.value = ''
  }

  return (
    <div className="auth-wrap">
      <div className="bg-aero">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
        <div className="orb orb-4" /><div className="orb orb-5" />
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-badge"><GraduationCap size={28} /></div>
          <h1>Jahint<span>.Studies</span></h1>
          <p>Sua organização de estudos, em qualquer lugar.</p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError('') }}
          >Entrar</button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError('') }}
          >Criar conta</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={doLogin} className="auth-form">
            <Field label="E-mail">
              <input type="email" value={logEmail} onChange={e => setLogEmail(e.target.value)} placeholder="voce@email.com" autoFocus />
            </Field>
            <Field label="Senha">
              <input type="password" value={logPass} onChange={e => setLogPass(e.target.value)} placeholder="••••••••" />
            </Field>
            <button type="submit" className="btn-primary btn-block">Entrar</button>
            {users.length === 0 && (
              <p className="auth-hint">Nenhuma conta ainda — crie a primeira na aba "Criar conta".</p>
            )}
          </form>
        ) : (
          <form onSubmit={doRegister} className="auth-form">
            <div className="avatar-row">
              <label className="avatar-uploader" title="Foto de perfil">
                {form.avatar
                  ? <img src={form.avatar} alt="avatar" />
                  : <Camera size={22} />}
                <input type="file" accept="image/*" hidden onChange={pickAvatar} />
              </label>
              <div className="avatar-fields">
                <Field label="Nome completo *">
                  <input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Seu nome completo" autoFocus />
                </Field>
                <Field label="Apelido">
                  <input value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="Como quer ser chamado(a)" />
                </Field>
              </div>
            </div>
            <div className="form-grid">
              <Field label="E-mail *">
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="voce@email.com" />
              </Field>
              <Field label="Senha *">
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 4 caracteres" />
              </Field>
              <Field label="Idade">
                <input type="number" min="1" max="120" value={form.age} onChange={e => set('age', e.target.value)} placeholder="Ex.: 21" />
              </Field>
              <Field label="Instituição">
                <input value={form.institution} onChange={e => set('institution', e.target.value)} placeholder="Faculdade / escola" />
              </Field>
              <Field label="Curso">
                <input value={form.course} onChange={e => set('course', e.target.value)} placeholder="Ex.: Ciência da Computação" />
              </Field>
            </div>
            <button type="submit" className="btn-primary btn-block">Criar minha conta</button>
          </form>
        )}
      </div>
    </div>
  )
}
