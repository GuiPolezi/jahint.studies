import { useState } from 'react'
import { GraduationCap, Camera } from 'lucide-react'
import { api, setToken } from '../lib/api'
import { Field } from './ui'

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // login
  const [logEmail, setLogEmail] = useState('')
  const [logPass, setLogPass] = useState('')

  // cadastro
  const [form, setForm] = useState({
    fullName: '', nickname: '', email: '', password: '',
    age: '', institution: '', course: '',
  })
  const [avatarFile, setAvatarFile] = useState(null)   // enviado após criar a conta
  const [avatarPreview, setAvatarPreview] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const doLogin = async e => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await api.login(logEmail.trim(), logPass)
      await onAuthed(res)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  const doRegister = async e => {
    e.preventDefault()
    if (!form.fullName.trim()) return setError('Informe seu nome completo.')
    if (!/.+@.+\..+/.test(form.email.trim())) return setError('Informe um e-mail válido.')
    if (form.password.length < 4) return setError('A senha deve ter pelo menos 4 caracteres.')
    setBusy(true); setError('')
    try {
      const res = await api.register({
        fullName: form.fullName.trim(),
        nickname: form.nickname.trim(),
        email: form.email.trim(),
        password: form.password,
        age: form.age ? Number(form.age) : null,
        institution: form.institution.trim(),
        course: form.course.trim(),
      })
      // Com a conta criada, sobe o avatar (falha no avatar não impede o cadastro)
      if (avatarFile) {
        setToken(res.token)
        await api.updateAvatar(avatarFile).catch(() => {})
      }
      await onAuthed(res)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  const pickAvatar = e => {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
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
            <button type="submit" className="btn-primary btn-block" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={doRegister} className="auth-form">
            <div className="avatar-row">
              <label className="avatar-uploader" title="Foto de perfil">
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" />
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
            <button type="submit" className="btn-primary btn-block" disabled={busy}>
              {busy ? 'Criando conta…' : 'Criar minha conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
