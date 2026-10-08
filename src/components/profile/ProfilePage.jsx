import { useMemo, useRef, useState } from 'react'
import { Camera, Check, Flame, Plus, RotateCcw, SlidersHorizontal, Tag, Trash2, Wallet, X } from 'lucide-react'
import Avatar from '../ui/Avatar.jsx'
import AnimalAvatar, { ANIMAL_LABEL_KEYS, ANIMAL_PRESETS, animalAvatarValue } from '../ui/AnimalAvatar.jsx'
import { resizeImageFile } from '../../lib/image.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import { useData } from '../../context/DataProvider.jsx'
import { useFinance } from '../../context/FinanceProvider.jsx'
import { useAuth } from '../../context/AuthProvider.jsx'
import { api } from '../../lib/api.js'
import { REMEMBERED_EMAIL_KEY } from '../../lib/constants.js'
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary.js'
import { useFireProjection } from '../../hooks/useFireProjection.js'
import { ageFromBirthYear, countryOptions } from '../../lib/personal.js'
import { INVESTMENT_TYPES } from '../../data/investmentTypes.js'
import FireMeterCompact from '../fire/FireMeterCompact.jsx'

export default function ProfilePage() {
  const { t, locale, language } = useI18n()
  const {
    profile,
    saveProfile,
    investmentVisibility,
    toggleInvestmentVisibility,
    birthYear,
    country,
    savePersonal,
    fireMeterVisible,
    toggleFireMeter,
    categories,
    platforms,
    rememberCategory,
    rememberPlatform,
    removeCategory,
    removePlatform,
  } = useSettings()
  const { user, signOut } = useAuth()
  const { transactions } = useFinance()
  // A stable date: the FIRE figures below are lifetime totals, not monthly.
  const today = useMemo(() => new Date(), [])
  const { globalPosition } = usePortfolioSummary(today)

  const [name, setName] = useState(profile.name || '')
  const [photoError, setPhotoError] = useState('')
  const [birthYearInput, setBirthYearInput] = useState(birthYear == null ? '' : String(birthYear))
  const [countryInput, setCountryInput] = useState(country || '')
  const fileInput = useRef(null)
  const { isDemo, resetDemo } = useData()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [categoryDrafts, setCategoryDrafts] = useState({ expense: '', income: '' })
  const [platformDraft, setPlatformDraft] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const createdAt = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(`${profile.createdAt}T12:00:00`))

  // The plan is edited on the FIRE tab; here the meter just needs its goal.
  const fire = useFireProjection(globalPosition)

  // How many transactions use each category, so in-use ones can be protected.
  const categoryUsage = useMemo(() => {
    const counts = { expense: {}, income: {} }
    for (const item of transactions) {
      if (!counts[item.type]) continue
      counts[item.type][item.category] = (counts[item.type][item.category] || 0) + 1
    }
    return counts
  }, [transactions])

  function submitProfile(event) {
    event.preventDefault()
    saveProfile({ ...profile, name: name.trim() })
    savePersonal({ birthYear: Number(birthYearInput) || null, country: countryInput || null })
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

  function addCategory(type) {
    const value = categoryDrafts[type].trim()
    if (!value) return
    rememberCategory(type, value)
    setCategoryDrafts((current) => ({ ...current, [type]: '' }))
  }

  function addPlatform() {
    const value = platformDraft.trim()
    if (!value) return
    rememberPlatform(value)
    setPlatformDraft('')
  }

  /** Deletes the account server-side, then restarts the app signed out. */
  async function confirmDeleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.deleteAccount()
    } catch {
      setDeleting(false)
      setDeleteError(t.deleteAccountError)
      return
    }
    try {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY)
    } catch {
      // Nothing to clear.
    }
    await signOut().catch(() => {})
    window.location.reload()
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

    <section className="panel profile-card"><div className="profile-avatar-block"><button type="button" className="profile-avatar-button" onClick={() => fileInput.current?.click()} aria-label={profile.avatar ? t.changePhoto : t.uploadPhoto}><Avatar profile={profile} className="profile-avatar-large" /><span className="profile-avatar-overlay"><Camera size={18} /></span></button><input ref={fileInput} className="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadPhoto} />{profile.avatar ? <button type="button" className="profile-photo-remove" onClick={removePhoto}>{t.removePhoto}</button> : <span className="profile-photo-hint">{t.uploadPhoto}</span>}{photoError && <p className="profile-photo-error">{photoError}</p>}<span className="profile-avatar-caption">{t.avatarOrAnimal}</span><div className="profile-avatar-choices">{ANIMAL_PRESETS.map((id) => { const selected = profile.avatar === animalAvatarValue(id); const label = t[ANIMAL_LABEL_KEYS[id]]; return <button type="button" key={id} className={selected ? 'avatar-choice avatar-choice-on' : 'avatar-choice'} aria-pressed={selected} aria-label={label} title={label} onClick={() => chooseAnimal(id)}><AnimalAvatar id={id} /></button> })}</div></div>
      <div className="profile-details">
        <form className="profile-form" onSubmit={submitProfile}><label className="field-label" htmlFor="profile-name">{t.yourName}</label><div className="profile-name-edit"><input id="profile-name" value={name} placeholder={t.namePlaceholder} maxLength={60} onChange={(event) => setName(event.target.value)} /><button className="primary-button" type="submit"><Check size={15} /> {t.saveProfile}</button></div><div className="form-row"><div><label className="field-label" htmlFor="profile-birth-year">{t.birthYearLabel}</label><div className="amount-input"><input id="profile-birth-year" type="number" min="1900" max="2100" step="1" placeholder="1990" value={birthYearInput} onChange={(event) => setBirthYearInput(event.target.value)} /></div></div><div><label className="field-label" htmlFor="profile-country">{t.countryLabel}</label><select className="select-input" id="profile-country" value={countryInput} onChange={(event) => setCountryInput(event.target.value)}><option value="">{t.countryNone}</option>{countryOptions(locale).map(({ code, name: countryLabel }) => <option key={code} value={code}>{countryLabel}</option>)}</select></div></div><p className="onboarding-hint onboarding-units-hint">{ageFromBirthYear(birthYearInput) == null ? t.personalHint : t.birthYearHint.replace('{age}', ageFromBirthYear(birthYearInput))}</p></form>
        <dl className="profile-facts">
          <div><dt>{t.email}</dt><dd title={user?.email || ''}>{user?.email || '—'}</dd></div>
          <div><dt>{t.language}</dt><dd>{language === 'pt' ? 'Português (Portugal)' : 'English'}</dd></div>
          <div><dt>{t.accountCreated}</dt><dd>{createdAt}</dd></div>
        </dl>
      </div>
    </section>

    <div className="settings-pair">
      <section className="panel visibility-panel">
        <div className="panel-heading"><div><h2>{t.fireSettings}</h2><p>{t.fireSettingsSubtitle}</p></div><span className="panel-icon"><Flame size={17} /></span></div>
        <div className="fire-toggle-row">
          <div className="visibility-label"><strong>{t.showFireMeter}</strong><span>{t.fireMeterHint}</span></div>
          <button type="button" className={fireMeterVisible ? 'visibility-switch switch-on' : 'visibility-switch'} role="switch" aria-checked={fireMeterVisible} aria-label={t.showFireMeter} onClick={toggleFireMeter}><span /></button>
        </div>
        <div className="fire-preview">
          <span className="fire-preview-label">{t.firePreview}</span>
          <FireMeterCompact position={globalPosition} goal={fire.target} />
        </div>
      </section>

      <section className="panel visibility-panel"><div className="panel-heading"><div><h2>{t.investmentSettings}</h2><p>{t.investmentSettingsSubtitle}</p></div><span className="panel-icon"><SlidersHorizontal size={17} /></span></div><div className="visibility-list">{INVESTMENT_TYPES.map(({ key, icon: Icon, tint }) => <div className="visibility-row" key={key}><span className={`portfolio-mini-icon ${tint}`}><Icon size={17} /></span><div className="visibility-label"><strong>{t[key]}</strong><span>{t.visibleSetting}</span></div><button type="button" className={investmentVisibility[key] ? 'visibility-switch switch-on' : 'visibility-switch'} role="switch" aria-checked={investmentVisibility[key]} aria-label={`${t.visibleSetting}: ${t[key]}`} onClick={() => toggleInvestmentVisibility(key)}><span /></button></div>)}</div><p className="visibility-note">{t.hiddenAssetsNote}</p></section>
    </div>

    <section className="panel visibility-panel">
      <div className="panel-heading"><div><h2>{t.manageCategories}</h2><p>{t.manageCategoriesSubtitle}</p></div><span className="panel-icon"><Tag size={17} /></span></div>
      <div className="manage-columns">
        {['expense', 'income'].map((type) => <div className="manage-group" key={type}>
          <div className="manage-group-head"><strong>{type === 'expense' ? t.expense : t.income}</strong><span>{categories[type].length}</span></div>
          <div className="manage-list">
            {categories[type].map((item) => {
              const used = categoryUsage[type][item] || 0
              return <div className="manage-row" key={item}>
                <span className="manage-name">{t.categoryNames[item] || item}</span>
                {used > 0 && <span className="manage-usage">{used} {t.records}</span>}
                <button type="button" className="manage-remove" disabled={used > 0} title={used > 0 ? t.categoryInUse : `${t.delete} ${item}`} aria-label={`${t.delete} ${item}`} onClick={() => removeCategory(type, item)}><X size={14} /></button>
              </div>
            })}
          </div>
          <div className="add-row">
            <input value={categoryDrafts[type]} placeholder={t.addOwnCategory} aria-label={t.addOwnCategory} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [type]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCategory(type) } }} />
            <button type="button" onClick={() => addCategory(type)} disabled={!categoryDrafts[type].trim()} aria-label={t.addCategory} title={t.addCategory}><Plus size={15} /></button>
          </div>
        </div>)}
      </div>
    </section>

    <section className="panel visibility-panel">
      <div className="panel-heading"><div><h2>{t.managePlatforms}</h2><p>{t.managePlatformsSubtitle}</p></div><span className="panel-icon"><Wallet size={17} /></span></div>
      <div className="manage-list">
        {platforms.length ? platforms.map((item) => <div className="manage-row" key={item}><span className="manage-name">{item}</span><button type="button" className="manage-remove" title={`${t.delete} ${item}`} aria-label={`${t.delete} ${item}`} onClick={() => removePlatform(item)}><X size={14} /></button></div>) : <p className="empty-note">{t.noPlatformsYet}</p>}
      </div>
      <div className="add-row">
        <input value={platformDraft} placeholder={t.addOwnPlatform} aria-label={t.addOwnPlatform} onChange={(event) => setPlatformDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addPlatform() } }} />
        <button type="button" onClick={addPlatform} disabled={!platformDraft.trim()} aria-label={t.addPlatform} title={t.addPlatform}><Plus size={15} /></button>
      </div>
    </section>

    {isDemo && <section className="panel action-panel">
      <div className="panel-heading"><div><h2>{t.demoData}</h2><p>{t.demoDataSubtitle}</p></div><span className="panel-icon"><RotateCcw size={17} /></span></div>
      {confirmingReset
        ? <div className="action-row"><p className="action-note">{t.demoResetConfirm}</p><div className="action-actions"><button type="button" className="danger-button" onClick={runDemoReset} disabled={resetting}>{resetting ? t.loading : t.demoResetYes}</button><button type="button" className="ghost-button" onClick={() => setConfirmingReset(false)} disabled={resetting}>{t.cancel}</button></div></div>
        : <div className="action-row"><p className="action-note">{t.demoDataNote}</p><div className="action-actions"><button type="button" className="danger-button" onClick={() => { setResetDone(false); setConfirmingReset(true) }}><RotateCcw size={15} /> {t.demoReset}</button>{resetDone && <span className="settings-saved">{t.demoResetDone}</span>}</div></div>}
    </section>}

    {!isDemo && <section className="panel action-panel danger-zone">
      <div className="panel-heading"><div><h2>{t.deleteAccount}</h2><p>{t.deleteAccountSubtitle}</p></div><span className="panel-icon danger-icon"><Trash2 size={17} /></span></div>
      {confirmingDelete
        ? <div className="action-row"><p className="action-note">{t.deleteAccountConfirm}</p><div className="action-actions"><button type="button" className="danger-button" onClick={confirmDeleteAccount} disabled={deleting}>{deleting ? t.loading : t.deleteAccountYes}</button><button type="button" className="ghost-button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>{t.cancel}</button></div></div>
        : <div className="action-row"><p className="action-note">{t.deleteAccountNote}</p><div className="action-actions"><button type="button" className="danger-button" onClick={() => { setDeleteError(''); setConfirmingDelete(true) }}><Trash2 size={15} /> {t.deleteAccount}</button></div></div>}
      {deleteError && <p className="form-error">{deleteError}</p>}
    </section>}

    <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
  </div>
}
