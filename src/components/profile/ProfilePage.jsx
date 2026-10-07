import Avatar from '../ui/Avatar.jsx'
import { useRef, useState } from 'react'
import { Bitcoin, Camera, ChartLine, Check, HandCoins, Landmark, SlidersHorizontal, Wallet } from 'lucide-react'
import { messages } from '../../i18n/messages.jsx'
import { initialsForName, resizeImageFile } from '../../lib/image.js'
export default function ProfilePage({ language, profile, visibility, onSaveProfile, onToggleVisibility }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const [name, setName] = useState(profile.name || '')
  const [photoError, setPhotoError] = useState('')
  const fileInput = useRef(null)
  const investmentTypes = [
    { key: 'etfs', label: t.etfs, icon: <ChartLine size={17} />, tint: 'etf-tint' },
    { key: 'crypto', label: t.crypto, icon: <Bitcoin size={17} />, tint: 'crypto-tint' },
    { key: 'p2p', label: t.p2p, icon: <HandCoins size={17} />, tint: 'p2p-tint' },
    { key: 'bonds', label: t.bonds, icon: <Landmark size={17} />, tint: 'bonds-tint' },
    { key: 'savings', label: t.savings, icon: <Wallet size={17} />, tint: 'savings-tint' },
  ]
  const createdAt = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(`${profile.createdAt}T12:00:00`))

  function submit(event) {
    event.preventDefault()
    onSaveProfile({ ...profile, name: name.trim() })
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) return setPhotoError(t.avatarFileError)
    try {
      const avatar = await resizeImageFile(file)
      setPhotoError('')
      onSaveProfile({ ...profile, name: name.trim(), avatar })
    } catch {
      setPhotoError(t.avatarReadError)
    }
  }

  function removePhoto() {
    setPhotoError('')
    onSaveProfile({ ...profile, name: name.trim(), avatar: '' })
  }

  return <div className="page-content profile-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.account.toUpperCase()}</p><h1>{t.profileHeading}<span>.</span></h1><p className="welcome-sub">{t.profileSubtitle}</p></div></section>
    <section className="panel profile-card"><div className="profile-avatar-block"><button type="button" className="profile-avatar-button" onClick={() => fileInput.current?.click()} aria-label={profile.avatar ? t.changePhoto : t.uploadPhoto}><Avatar profile={profile} className="profile-avatar-large" /><span className="profile-avatar-overlay"><Camera size={18} /></span></button><input ref={fileInput} className="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadPhoto} />{profile.avatar ? <button type="button" className="profile-photo-remove" onClick={removePhoto}>{t.removePhoto}</button> : <span className="profile-photo-hint">{t.uploadPhoto}</span>}{photoError && <p className="profile-photo-error">{photoError}</p>}</div><form className="profile-form" onSubmit={submit}><label className="field-label" htmlFor="profile-name">{t.yourName}</label><div className="profile-name-edit"><input id="profile-name" value={name} placeholder={t.namePlaceholder} maxLength={60} onChange={(event) => setName(event.target.value)} /><button className="primary-button" type="submit"><Check size={15} /> {t.saveProfile}</button></div></form><div className="profile-created"><span>{t.accountCreated}</span><strong>{createdAt}</strong></div></section>
    <section className="panel visibility-panel"><div className="panel-heading"><div><h2>{t.investmentSettings}</h2><p>{t.investmentSettingsSubtitle}</p></div><span className="panel-icon"><SlidersHorizontal size={17} /></span></div><div className="visibility-list">{investmentTypes.map((item) => <div className="visibility-row" key={item.key}><span className={`portfolio-mini-icon ${item.tint}`}>{item.icon}</span><div className="visibility-label"><strong>{item.label}</strong><span>{t.visibleSetting}</span></div><button type="button" className={visibility[item.key] ? 'visibility-switch switch-on' : 'visibility-switch'} role="switch" aria-checked={visibility[item.key]} aria-label={`${t.visibleSetting}: ${item.label}`} onClick={() => onToggleVisibility(item.key)}><span /></button></div>)}</div><p className="visibility-note">{t.hiddenAssetsNote}</p></section>
    <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
  </div>
}
