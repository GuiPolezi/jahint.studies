import { useState } from 'react'
import { Camera, Save, Download, LogOut, Cloud } from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { Field } from './ui'
import { api } from '../lib/api'

export default function ProfileView() {
  const { user, onLogout, updateProfile, updateAvatar } = useStore()
  const [form, setForm] = useState({
    fullName: user.fullName, nickname: user.nickname, email: user.email,
    password: '', age: user.age ?? '', institution: user.institution || '',
    course: user.course || '',
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    const changes = {
      fullName: form.fullName.trim(),
      nickname: form.nickname.trim() || form.fullName.trim().split(' ')[0],
      email: form.email.trim(),
      age: form.age ? Number(form.age) : null,
      institution: form.institution.trim(),
      course: form.course.trim(),
    }
    if (form.password) changes.password = form.password // só troca se preenchida
    const updated = await updateProfile(changes)
    if (updated) {
      setForm(f => ({ ...f, password: '' }))
      setSaved(true)
    }
    setSaving(false)
  }

  const pickAvatar = async e => {
    const f = e.target.files?.[0]
    if (!f) return
    await updateAvatar(f) // sobe para o servidor e atualiza o usuário
    e.target.value = ''
  }

  const exportBackup = async () => {
    // Exporta os dados do servidor (estrutura completa; conteúdos das anotações
    // e arquivos anexados ficam no servidor e não entram neste JSON)
    const { user: u, data } = await api.bootstrap()
    const payload = {
      app: 'Jahint.Studies',
      version: 2,
      exportedAt: new Date().toISOString(),
      user: u,
      data,
      note: 'Conteúdo das anotações e arquivos anexados ficam no servidor — este backup cobre a estrutura (anos, aulas, trabalhos, provas).',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jahint-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Meu Perfil</h1>
          <p className="view-sub">Seus dados de conta — salvos com segurança no servidor.</p>
        </div>
        <button className="btn-ghost" onClick={onLogout}><LogOut size={15} /> Sair da conta</button>
      </header>

      <div className="profile-layout">
        <form onSubmit={save} className="panel profile-form">
          <div className="avatar-row">
            <label className="avatar-uploader big" title="Alterar foto">
              {user.avatar ? <img src={user.avatar} alt="avatar" /> : <Camera size={26} />}
              <input type="file" accept="image/*" hidden onChange={pickAvatar} />
            </label>
            <div className="avatar-fields">
              <Field label="Nome completo">
                <input value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
              </Field>
              <Field label="Apelido">
                <input value={form.nickname} onChange={e => set('nickname', e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="form-grid">
            <Field label="E-mail">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </Field>
            <Field label="Nova senha" hint="Deixe em branco para manter a atual.">
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="Idade">
              <input type="number" min="1" max="120" value={form.age} onChange={e => set('age', e.target.value)} />
            </Field>
            <Field label="Instituição">
              <input value={form.institution} onChange={e => set('institution', e.target.value)} />
            </Field>
            <Field label="Curso">
              <input value={form.course} onChange={e => set('course', e.target.value)} />
            </Field>
          </div>

          <div className="modal-actions">
            {saved && <span className="save-status saved">✓ Perfil atualizado</span>}
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>

        <div className="profile-side">
          <div className="panel">
            <div className="panel-head"><h2><Cloud size={17} /> Seus dados</h2></div>
            <p className="storage-text">
              Tudo fica salvo <strong>na sua conta, no servidor</strong> — anos, aulas,
              anotações, trabalhos, provas e arquivos. Você pode entrar de qualquer
              computador com seu e-mail e senha.
            </p>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>💾 Backup</h2></div>
            <p className="storage-text">
              Exporte um arquivo JSON com a estrutura dos seus dados registrados no sistema.
            </p>
            <button className="btn-primary btn-block" onClick={exportBackup}><Download size={15} /> Exportar backup</button>
          </div>
        </div>
      </div>
    </div>
  )
}
