import { useEffect, useState } from 'react'
import { Camera, Save, Download, LogOut, HardDrive } from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { Field } from './ui'
import { readImageResized, formatBytes } from '../lib/utils'
import { idbAllEntries, storageEstimate } from '../lib/idb'

export default function ProfileView() {
  const { user, data, onUpdateUser, onLogout } = useStore()
  const [form, setForm] = useState({
    fullName: user.fullName, nickname: user.nickname, email: user.email,
    password: user.password, age: user.age ?? '', institution: user.institution,
    course: user.course, avatar: user.avatar,
  })
  const [saved, setSaved] = useState(false)
  const [estimate, setEstimate] = useState(null)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  useEffect(() => {
    storageEstimate().then(setEstimate)
  }, [])

  const save = e => {
    e.preventDefault()
    onUpdateUser({
      ...form,
      fullName: form.fullName.trim(),
      nickname: form.nickname.trim() || form.fullName.trim().split(' ')[0],
      email: form.email.trim(),
      age: form.age ? Number(form.age) : null,
    })
    setSaved(true)
  }

  const pickAvatar = async e => {
    const f = e.target.files?.[0]
    if (!f) return
    try { set('avatar', await readImageResized(f, 256, 0.85)) } catch { /* ignora */ }
    e.target.value = ''
  }

  const exportBackup = async () => {
    const contents = await idbAllEntries('contents')
    const payload = {
      app: 'Jahint.Studies',
      version: 1,
      exportedAt: new Date().toISOString(),
      user: { ...user, password: undefined },
      data,
      contents: Object.fromEntries(contents),
      note: 'Arquivos anexados (PDFs, ZIPs...) não entram neste backup — baixe-os individualmente em cada trabalho.',
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
          <p className="view-sub">Seus dados e as informações de armazenamento local.</p>
        </div>
        <button className="btn-ghost" onClick={onLogout}><LogOut size={15} /> Sair da conta</button>
      </header>

      <div className="profile-layout">
        <form onSubmit={save} className="panel profile-form">
          <div className="avatar-row">
            <label className="avatar-uploader big" title="Alterar foto">
              {form.avatar ? <img src={form.avatar} alt="avatar" /> : <Camera size={26} />}
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
            <Field label="Senha">
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required />
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
            <button type="submit" className="btn-primary"><Save size={15} /> Salvar alterações</button>
          </div>
        </form>

        <div className="profile-side">
          <div className="panel">
            <div className="panel-head"><h2><HardDrive size={17} /> Armazenamento</h2></div>
            <p className="storage-text">
              Seus dados ficam salvos <strong>neste navegador</strong> (localStorage + IndexedDB).
              {estimate && (
                <>
                  <br />Em uso: <strong>{formatBytes(estimate.usage)}</strong> de {formatBytes(estimate.quota)} disponíveis.
                </>
              )}
            </p>
            <div className="progress-track big">
              <div
                className="progress-fill"
                style={{ width: estimate ? `${Math.min(100, (estimate.usage / estimate.quota) * 100)}%` : '0%' }}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>💾 Backup</h2></div>
            <p className="storage-text">
              Exporte um arquivo JSON com todos os seus dados e anotações — sua proteção contra formatações e perda do computador.
            </p>
            <button className="btn-primary btn-block" onClick={exportBackup}><Download size={15} /> Exportar backup</button>
          </div>
        </div>
      </div>
    </div>
  )
}
