import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Check, Flame, Plus, X } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import { categorySuggestions } from '../../data/categories.js'
import { INVESTMENT_TYPES } from '../../data/investmentTypes.js'
import { PLATFORM_SUGGESTIONS } from '../../lib/constants.js'
import { resizeImageFile } from '../../lib/image.js'
import Avatar from '../ui/Avatar.jsx'
import AnimalAvatar, { ANIMAL_LABEL_KEYS, ANIMAL_PRESETS, animalAvatarValue, animalId } from '../ui/AnimalAvatar.jsx'

/** How many categories each group needs before the step can continue. */
const MIN_CATEGORIES = 3

/** Pre-selected so the step never starts from an empty screen. */
const DEFAULT_CATEGORIES = { expense: ['Food & dining'], income: ['Salary'] }

/**
 * First-run setup: a new account has no categories and no platforms, so we ask
 * for them before the app is usable, then for the investment spaces to show,
 * an optional FIRE goal, and finally an optional profile picture. The choice
 * steps are suggestion-driven to keep it quick, and categories can be typed in
 * as well.
 */
export default function OnboardingPage() {
  const { t, language, changeLanguage } = useI18n()
  const { profile, investmentVisibility, fireGoal, fireMeterVisible, saveProfile, saveOnboarding } = useSettings()
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState(() => ({ expense: [...DEFAULT_CATEGORIES.expense], income: [...DEFAULT_CATEGORIES.income] }))
  const [customCategories, setCustomCategories] = useState({ expense: [], income: [] })
  const [categoryDrafts, setCategoryDrafts] = useState({ expense: '', income: '' })
  const [platforms, setPlatforms] = useState([])
  const [visibility, setVisibility] = useState(() => ({ ...investmentVisibility }))
  const [goalInput, setGoalInput] = useState(String(fireGoal))
  const [showFire, setShowFire] = useState(fireMeterVisible)
  const [avatar, setAvatar] = useState(profile.avatar || '')
  const [photoError, setPhotoError] = useState('')
  const fileInput = useRef(null)

  function toggleCategory(type, name) {
    setCategories((current) => ({
      ...current,
      [type]: current[type].includes(name) ? current[type].filter((item) => item !== name) : [...current[type], name],
    }))
  }

  function setCategoryDraft(type, value) {
    setCategoryDrafts((current) => ({ ...current, [type]: value }))
  }

  /** Adds a typed category, or just selects it when it already exists. */
  function addCustomCategory(type) {
    const name = categoryDrafts[type].trim()
    if (!name) return
    const existing = [...categorySuggestions(type), ...customCategories[type]].find((item) => item.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!categories[type].includes(existing)) setCategories((current) => ({ ...current, [type]: [...current[type], existing] }))
    } else {
      setCustomCategories((current) => ({ ...current, [type]: [...current[type], name] }))
      setCategories((current) => ({ ...current, [type]: [...current[type], name] }))
    }
    setCategoryDraft(type, '')
  }

  function togglePlatform(name) {
    setPlatforms((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]))
  }

  function toggleInvestment(key) {
    setVisibility((current) => ({ ...current, [key]: !current[key] }))
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) return setPhotoError(t.avatarFileError)
    try {
      const dataUrl = await resizeImageFile(file)
      setPhotoError('')
      setAvatar(dataUrl)
    } catch {
      setPhotoError(t.avatarReadError)
    }
  }

  function finish() {
    if (avatar !== (profile.avatar || '')) saveProfile({ ...profile, avatar })
    saveOnboarding({
      categories,
      platforms,
      investmentVisibility: visibility,
      fireGoal: Number(goalInput) > 0 ? Number(goalInput) : fireGoal,
      fireMeterVisible: showFire,
    })
  }

  const categoriesReady = categories.expense.length >= MIN_CATEGORIES && categories.income.length >= MIN_CATEGORIES
  const goalValid = !showFire || goalInput.trim() === '' || (Number.isFinite(Number(goalInput)) && Number(goalInput) > 0)

  return <div className="onboarding-page">
    <div className="login-language">
      <div className="language-switch" role="group" aria-label={t.language}>
        <button type="button" className={language === 'en' ? 'language-option selected-language' : 'language-option'} aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>EN</button>
        <button type="button" className={language === 'pt' ? 'language-option selected-language' : 'language-option'} aria-pressed={language === 'pt'} onClick={() => changeLanguage('pt')} aria-label="Português (Portugal)" title="Português (Portugal)">PT</button>
      </div>
    </div>

    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <span className="login-brand-mark"><Flame size={22} fill="currentColor" /></span>
      <div className="onboarding-progress" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => <span key={index} className={step >= index ? 'onboarding-dot active-dot' : 'onboarding-dot'} />)}
      </div>
      <p className="onboarding-step">{t.stepLabel} {step + 1}/5</p>

      {step === 0 ? <>
        <h1 id="onboarding-title">{t.onboardingCategoriesTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingCategoriesSubtitle}</p>
        {['expense', 'income'].map((type) => <div className="onboarding-group" key={type}>
          <div className="onboarding-group-head"><strong>{type === 'expense' ? t.expense : t.income}</strong><span>{categories[type].length} / {MIN_CATEGORIES}</span></div>
          <div className="onboarding-chips">
            {[...categorySuggestions(type), ...customCategories[type]].map((name) => <button type="button" key={name} className={categories[type].includes(name) ? 'onboarding-chip chip-on' : 'onboarding-chip'} aria-pressed={categories[type].includes(name)} onClick={() => toggleCategory(type, name)}>{t.categoryNames[name] || name}</button>)}
          </div>
          <div className="onboarding-add">
            <input value={categoryDrafts[type]} placeholder={t.addOwnCategory} aria-label={t.addOwnCategory} onChange={(event) => setCategoryDraft(type, event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomCategory(type) } }} />
            <button type="button" onClick={() => addCustomCategory(type)} disabled={!categoryDrafts[type].trim()} aria-label={t.addCategory} title={t.addCategory}><Plus size={15} /></button>
          </div>
        </div>)}
        {!categoriesReady && <p className="onboarding-hint">{t.onboardingCategoriesHint}</p>}
        <button type="button" className="submit-button onboarding-wide" disabled={!categoriesReady} onClick={() => setStep(1)}>{t.continue} <ArrowRight size={16} /></button>
      </> : step === 1 ? <>
        <h1 id="onboarding-title">{t.onboardingPlatformsTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingPlatformsSubtitle}</p>
        <div className="onboarding-chips onboarding-chips-platforms">
          {PLATFORM_SUGGESTIONS.map((name) => <button type="button" key={name} className={platforms.includes(name) ? 'onboarding-chip chip-on' : 'onboarding-chip'} aria-pressed={platforms.includes(name)} onClick={() => togglePlatform(name)}>{name}</button>)}
        </div>
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(0)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" onClick={() => setStep(2)}>{t.continue} <ArrowRight size={16} /></button>
        </div>
      </> : step === 2 ? <>
        <h1 id="onboarding-title">{t.onboardingInvestmentsTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingInvestmentsSubtitle}</p>
        <div className="onboarding-chips onboarding-chips-investments">
          {INVESTMENT_TYPES.map(({ key, icon: Icon }) => <button type="button" key={key} className={visibility[key] ? 'onboarding-chip chip-on' : 'onboarding-chip'} aria-pressed={visibility[key]} onClick={() => toggleInvestment(key)}><Icon size={15} /> {t[key]}</button>)}
        </div>
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(1)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" onClick={() => setStep(3)}>{t.continue} <ArrowRight size={16} /></button>
        </div>
      </> : step === 3 ? <>
        <h1 id="onboarding-title">{t.onboardingFireTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingFireSubtitle}</p>
        <div className="onboarding-fire">
          <div className="onboarding-fire-toggle">
            <div className="visibility-label"><strong>{t.fireMeterSettings}</strong><span>{t.showFireMeter}</span></div>
            <button type="button" className={showFire ? 'visibility-switch switch-on' : 'visibility-switch'} role="switch" aria-checked={showFire} aria-label={t.showFireMeter} onClick={() => setShowFire((current) => !current)}><span /></button>
          </div>
          <label className="field-label" htmlFor="onboarding-fire-goal">{t.goalAmount}</label>
          <div className={showFire ? 'amount-input' : 'amount-input amount-input-off'}><span>€</span><input id="onboarding-fire-goal" type="number" min="1" step="1000" value={goalInput} disabled={!showFire} onChange={(event) => setGoalInput(event.target.value)} /></div>
          {!goalValid && <p className="form-error">{t.goalError}</p>}
        </div>
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(2)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" disabled={!goalValid} onClick={() => setStep(4)}>{t.continue} <ArrowRight size={16} /></button>
        </div>
      </> : <>
        <h1 id="onboarding-title">{t.onboardingAvatarTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingAvatarSubtitle}</p>
        <div className="onboarding-avatar-preview">
          <Avatar profile={{ name: profile.name, avatar }} className="onboarding-avatar-big" />
        </div>
        <div className="onboarding-animals">
          {ANIMAL_PRESETS.map((id) => {
            const value = animalAvatarValue(id)
            const selected = avatar === value
            const label = t[ANIMAL_LABEL_KEYS[id]]
            return <button type="button" key={id} className={selected ? 'avatar-choice avatar-choice-on' : 'avatar-choice'} aria-pressed={selected} aria-label={label} title={label} onClick={() => setAvatar(selected ? '' : value)}><AnimalAvatar id={id} /></button>
          })}
        </div>
        <div className="onboarding-avatar-actions">
          <button type="button" className="ghost-button" onClick={() => fileInput.current?.click()}><Camera size={15} /> {avatar && !animalId(avatar) ? t.changePhoto : t.uploadPhoto}</button>
          {avatar && <button type="button" className="ghost-button" onClick={() => setAvatar('')}><X size={15} /> {t.removePhoto}</button>}
        </div>
        <input ref={fileInput} className="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadPhoto} />
        {photoError && <p className="form-error">{photoError}</p>}
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(3)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" onClick={finish}><Check size={16} /> {t.finishSetup}</button>
        </div>
      </>}
    </section>
  </div>
}
