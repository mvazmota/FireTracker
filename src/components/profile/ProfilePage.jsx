import { useRef, useState } from 'react'
import { Camera, Check, Flame, RotateCcw, SlidersHorizontal } from 'lucide-react'
import Avatar from '../ui/Avatar.jsx'
import AnimalAvatar, { ANIMAL_LABEL_KEYS, ANIMAL_PRESETS, animalAvatarValue } from '../ui/AnimalAvatar.jsx'
import { resizeImageFile } from '../../lib/image.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import { useData } from '../../context/DataProvider.jsx'
import { INVESTMENT_TYPES } from '../../data/investmentTypes.js'

export default function ProfilePage() {
  const { t, locale } = useI18n()
  const {
    profile,
    saveProfile,
    investmentVisibility,
    toggleInvestmentVisibility,
    fireGoal,
    saveFireGoal,
    fireMeterVisible,
    toggleFireMeter,
  } = useSettings()

  const [name, setName] = useState(profile.name || '')
  const [photoError, setPhotoError] = useState('')
  const [goalInput, setGoalInput] = useState(String(fireGoal))
  const [goalSaved, setGoalSaved] = useState(false)
  const [goalError, setGoalError] = useState('')
  const fileInput = useRef(null)
  const { isDemo, resetDemo } = useData()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const createdAt = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(`${profile.createdAt}T12:00:00`))

  function submitProfile(event) {
    event.preventDefault()
    saveProfile({ ...profile, name: name.trim() })
  }

  function submitGoal(event) {
    event.preventDefault()
    const value = Number(goalInput)
    if (!Number.isFinite(value) || value <= 0) return setGoalError(t.goalError)
    setGoalError('')
    saveFireGoal(value)
    setGoalSaved(true)
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) return setPhotoError(t.avatarFileError)
    try {
      const avatar = await resizeImageFile(file)
      setPhotoError('')
      saveProfile({ ...profile, name: name.trim(), avatar })
    } catch {
      setPhotoError(t.avatarReadError)
    }
  }

  function removePhoto() {
    setPhotoError('')
    saveProfile({ ...profile, name: name.trim(), avatar: '' })
  }

  function chooseAnimal(id) {
    setPhotoError('')
    const value = animalAvatarValue(id)
    saveProfile({ ...profile, name: name.trim(), avatar: profile.avatar === value ? '' : value })
  }

  async function runDemoReset() {
    setResetting(true)
    try {
      await resetDemo()
      setConfirmingReset(false)
      setResetDone(true)
    } finally {
      setResetting(false)
    }
  }

  return <div className="page-content profile-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.account.toUpperCase()}</p><h1>{t.profileHeading}<span>.</span></h1><p className="welcome-sub">{t.profileSubtitle}</p></div></section>

    <section className="panel profile-card"><div className="profile-avatar-block"><button type="button" className="profile-avatar-button" onClick={() => fileInput.current?.click()} aria-label={profile.avatar ? t.changePhoto : t.uploadPhoto}><Avatar profile={profile} className="profile-avatar-large" /><span className="profile-avatar-overlay"><Camera size={18} /></span></button><input ref={fileInput} className="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadPhoto} />{profile.avatar ? <button type="button" className="profile-photo-remove" onClick={removePhoto}>{t.removePhoto}</button> : <span className="profile-photo-hint">{t.uploadPhoto}</span>}{photoError && <p className="profile-photo-error">{photoError}</p>}<span className="profile-avatar-caption">{t.avatarOrAnimal}</span><div className="profile-avatar-choices">{ANIMAL_PRESETS.map((id) => { const selected = profile.avatar === animalAvatarValue(id); const label = t[ANIMAL_LABEL_KEYS[id]]; return <button type="button" key={id} className={selected ? 'avatar-choice avatar-choice-on' : 'avatar-choice'} aria-pressed={selected} aria-label={label} title={label} onClick={() => chooseAnimal(id)}><AnimalAvatar id={id} /></button> })}</div></div><form className="profile-form" onSubmit={submitProfile}><label className="field-label" htmlFor="profile-name">{t.yourName}</label><div className="profile-name-edit"><input id="profile-name" value={name} placeholder={t.namePlaceholder} maxLength={60} onChange={(event) => setName(event.target.value)} /><button className="primary-button" type="submit"><Check size={15} /> {t.saveProfile}</button></div></form><div className="profile-created"><span>{t.accountCreated}</span><strong>{createdAt}</strong></div></section>

    <section className="panel visibility-panel">
      <div className="panel-heading"><div><h2>{t.fireMeterSettings}</h2><p>{t.fireMeterSettingsSubtitle}</p></div><span className="panel-icon"><Flame size={17} /></span></div>
      <form className="fire-goal-form" onSubmit={submitGoal}>
        <label className="field-label" htmlFor="fire-goal-input">{t.goalAmount}</label>
        <div className="profile-name-edit">
          <div className="amount-input"><span>€</span><input id="fire-goal-input" type="number" min="1" step="1000" value={goalInput} onChange={(event) => { setGoalInput(event.target.value); setGoalSaved(false) }} /></div>
          <button className="primary-button" type="submit"><Check size={15} /> {t.saveChanges}</button>
          {goalSaved && <span className="settings-saved">{t.goalSaved}</span>}
        </div>
        {goalError && <p className="form-error">{goalError}</p>}
      </form>
      <div className="visibility-row">
        <span className="portfolio-mini-icon fire-tint"><Flame size={17} /></span>
        <div className="visibility-label"><strong>{t.fireMeterSettings}</strong><span>{t.showFireMeter}</span></div>
        <button type="button" className={fireMeterVisible ? 'visibility-switch switch-on' : 'visibility-switch'} role="switch" aria-checked={fireMeterVisible} aria-label={t.showFireMeter} onClick={toggleFireMeter}><span /></button>
      </div>
    </section>

    <section className="panel visibility-panel"><div className="panel-heading"><div><h2>{t.investmentSettings}</h2><p>{t.investmentSettingsSubtitle}</p></div><span className="panel-icon"><SlidersHorizontal size={17} /></span></div><div className="visibility-list">{INVESTMENT_TYPES.map(({ key, icon: Icon, tint }) => <div className="visibility-row" key={key}><span className={`portfolio-mini-icon ${tint}`}><Icon size={17} /></span><div className="visibility-label"><strong>{t[key]}</strong><span>{t.visibleSetting}</span></div><button type="button" className={investmentVisibility[key] ? 'visibility-switch switch-on' : 'visibility-switch'} role="switch" aria-checked={investmentVisibility[key]} aria-label={`${t.visibleSetting}: ${t[key]}`} onClick={() => toggleInvestmentVisibility(key)}><span /></button></div>)}</div><p className="visibility-note">{t.hiddenAssetsNote}</p></section>
    {isDemo && <section className="panel demo-panel">
      <div className="panel-heading"><div><h2>{t.demoData}</h2><p>{t.demoDataSubtitle}</p></div><span className="panel-icon"><RotateCcw size={17} /></span></div>
      {confirmingReset
        ? <div className="demo-reset-row"><p className="demo-reset-note">{t.demoResetConfirm}</p><div className="demo-reset-actions"><button type="button" className="danger-button" onClick={runDemoReset} disabled={resetting}>{resetting ? t.loading : t.demoResetYes}</button><button type="button" className="ghost-button" onClick={() => setConfirmingReset(false)} disabled={resetting}>{t.cancel}</button></div></div>
        : <div className="demo-reset-row"><p className="demo-reset-note">{t.demoDataNote}</p><div className="demo-reset-actions"><button type="button" className="danger-button" onClick={() => { setResetDone(false); setConfirmingReset(true) }}><RotateCcw size={15} /> {t.demoReset}</button>{resetDone && <span className="settings-saved">{t.demoResetDone}</span>}</div></div>}
    </section>}

    <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
  </div>
}
