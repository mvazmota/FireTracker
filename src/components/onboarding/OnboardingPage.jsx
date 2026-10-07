import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Check, Flame, X } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import { categorySuggestions } from '../../data/categories.js'
import { PLATFORM_SUGGESTIONS } from '../../lib/constants.js'
import { resizeImageFile } from '../../lib/image.js'
import Avatar from '../ui/Avatar.jsx'
import AnimalAvatar, { ANIMAL_PRESETS, animalAvatarValue, animalId } from '../ui/AnimalAvatar.jsx'

const ANIMAL_LABEL_KEYS = { fox: 'animalFox', cat: 'animalCat', owl: 'animalOwl', panda: 'animalPanda', bear: 'animalBear', penguin: 'animalPenguin' }

/**
 * First-run setup: a new account has no categories and no platforms, so we ask
 * for them before the app is usable, then offer an optional profile picture.
 * The category and platform steps are suggestion-driven to keep it quick;
 * custom entries can be added later from the normal forms.
 */
export default function OnboardingPage() {
  const { t, language, changeLanguage } = useI18n()
  const { profile, saveProfile, saveOnboarding } = useSettings()
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState({ expense: [], income: [] })
  const [platforms, setPlatforms] = useState([])
  const [avatar, setAvatar] = useState(profile.avatar || '')
  const [photoError, setPhotoError] = useState('')
  const fileInput = useRef(null)

  function toggleCategory(type, name) {
    setCategories((current) => ({
      ...current,
      [type]: current[type].includes(name) ? current[type].filter((item) => item !== name) : [...current[type], name],
    }))
  }

  function togglePlatform(name) {
    setPlatforms((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]))
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
    saveOnboarding({ categories, platforms })
  }

  const categoriesReady = categories.expense.length > 0 && categories.income.length > 0

  return <div className="onboarding-page">
    <div className="login-language">
      <div className="language-switch" role="group" aria-label={t.language}>
        <button type="button" className={language === 'en' ? 'language-option selected-language' : 'language-option'} aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>EN</button>
        <button type="button" className={language === 'pt' ? 'language-option selected-language' : 'language-option'} aria-pressed={language === 'pt'} onClick={() => changeLanguage('pt')}>PT-PT</button>
      </div>
    </div>

    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <span className="login-brand-mark"><Flame size={22} fill="currentColor" /></span>
      <div className="onboarding-progress" aria-hidden="true">
        {[0, 1, 2].map((index) => <span key={index} className={step >= index ? 'onboarding-dot active-dot' : 'onboarding-dot'} />)}
      </div>
      <p className="onboarding-step">{t.stepLabel} {step + 1}/3</p>

      {step === 0 ? <>
        <h1 id="onboarding-title">{t.onboardingCategoriesTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingCategoriesSubtitle}</p>
        {['expense', 'income'].map((type) => <div className="onboarding-group" key={type}>
          <div className="onboarding-group-head"><strong>{type === 'expense' ? t.expense : t.income}</strong><span>{categories[type].length} {t.chosen}</span></div>
          <div className="onboarding-chips">
            {categorySuggestions(type).map((name) => <button type="button" key={name} className={categories[type].includes(name) ? 'onboarding-chip chip-on' : 'onboarding-chip'} aria-pressed={categories[type].includes(name)} onClick={() => toggleCategory(type, name)}>{t.categoryNames[name] || name}</button>)}
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
            return <button type="button" key={id} className={selected ? 'onboarding-animal animal-on' : 'onboarding-animal'} aria-pressed={selected} aria-label={label} title={label} onClick={() => setAvatar(selected ? '' : value)}><AnimalAvatar id={id} /></button>
          })}
        </div>
        <div className="onboarding-avatar-actions">
          <button type="button" className="ghost-button" onClick={() => fileInput.current?.click()}><Camera size={15} /> {avatar && !animalId(avatar) ? t.changePhoto : t.uploadPhoto}</button>
          {avatar && <button type="button" className="ghost-button" onClick={() => setAvatar('')}><X size={15} /> {t.removePhoto}</button>}
        </div>
        <input ref={fileInput} className="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadPhoto} />
        {photoError && <p className="form-error">{photoError}</p>}
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(1)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" onClick={finish}><Check size={16} /> {t.finishSetup}</button>
        </div>
      </>}
    </section>
  </div>
}
