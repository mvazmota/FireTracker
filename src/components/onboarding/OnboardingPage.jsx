import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Check, ExternalLink, Flame, Plus, X } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import { categorySuggestions } from '../../data/categories.js'
import { INVESTMENT_TYPES } from '../../data/investmentTypes.js'
import { PLATFORM_SUGGESTIONS } from '../../lib/constants.js'
import { resizeImageFile } from '../../lib/image.js'
import { fireCalculator } from '../../lib/fire.js'
import { ageFromBirthYear, countryOptions } from '../../lib/personal.js'
import { formatCurrency } from '../../lib/format.js'
import Avatar from '../ui/Avatar.jsx'
import AnimalAvatar, { ANIMAL_LABEL_KEYS, ANIMAL_PRESETS, animalAvatarValue, animalId } from '../ui/AnimalAvatar.jsx'

/** How many categories each group needs before the step can continue. */
const MIN_CATEGORIES = { expense: 3, income: 2 }

/** Pre-selected so the step never starts from an empty screen. */
const DEFAULT_CATEGORIES = { expense: ['Food & dining'], income: ['Salary'] }

/** Pre-selected defaults for the platform and investment steps. */
const DEFAULT_SELECTED_PLATFORMS = ['Bank account']
const DEFAULT_SELECTED_INVESTMENTS = { etfs: true, crypto: false, p2p: false, bonds: false, savings: false }

/**
 * First-run setup. It opens on the FIRE calculator, because the number it works
 * out is the point of the app, then asks for the categories, platforms and
 * investment spaces the rest of the app needs, and finally for a profile
 * picture. The choice steps are suggestion-driven to keep it quick, and
 * categories and platforms can be typed in as well.
 */
export default function OnboardingPage() {
  const { t, language, changeLanguage } = useI18n()
  const { profile, saveProfile, saveOnboarding } = useSettings()
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState(() => ({ expense: [...DEFAULT_CATEGORIES.expense], income: [...DEFAULT_CATEGORIES.income] }))
  const [customCategories, setCustomCategories] = useState({ expense: [], income: [] })
  const [categoryDrafts, setCategoryDrafts] = useState({ expense: '', income: '' })
  const [platforms, setPlatforms] = useState(() => [...DEFAULT_SELECTED_PLATFORMS])
  const [customPlatforms, setCustomPlatforms] = useState([])
  const [platformDraft, setPlatformDraft] = useState('')
  const [visibility, setVisibility] = useState(() => ({ ...DEFAULT_SELECTED_INVESTMENTS }))
  const [incomeInput, setIncomeInput] = useState('')
  const [spendingInput, setSpendingInput] = useState('')
  const [netWorthInput, setNetWorthInput] = useState('')
  const [birthYearInput, setBirthYearInput] = useState('')
  const [countryInput, setCountryInput] = useState('')
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

  /** Adds a typed platform, or just selects it when it already exists. */
  function addCustomPlatform() {
    const name = platformDraft.trim()
    if (!name) return
    const existing = [...PLATFORM_SUGGESTIONS, ...customPlatforms].find((item) => item.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!platforms.includes(existing)) setPlatforms((current) => [...current, existing])
    } else {
      setCustomPlatforms((current) => [...current, name])
      setPlatforms((current) => [...current, name])
    }
    setPlatformDraft('')
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
    const hasEstimate = incomeInput.trim() !== '' || spendingInput.trim() !== ''
    saveOnboarding({
      categories,
      platforms,
      investmentVisibility: visibility,
      // The net worth is left out on purpose: it is a sketch of the journey, not
      // something the app tracks, so it must not follow the user into the FIRE tab.
      fireEstimate: hasEstimate ? {
        income,
        spending: annualSpending,
        savingsRate: canProject ? Math.round(savingsRate) : 0,
      } : undefined,
      birthYear: Number(birthYearInput) || null,
      country: countryInput || null,
    })
  }

  const categoriesReady = categories.expense.length >= MIN_CATEGORIES.expense && categories.income.length >= MIN_CATEGORIES.income
  const platformsReady = platforms.length > 0
  const investmentsReady = Object.values(visibility).some(Boolean)

  // Everything the calculator shows, including the 25× rule behind the goal.
  const {
    annualIncome: income,
    annualSpending,
    netWorth,
    target: suggestedGoal,
    savings: annualSavings,
    savingsRate,
    years,
    covered,
    canProject,
  } = fireCalculator({ income: incomeInput, monthlySpending: spendingInput, netWorth: netWorthInput })
  const hasSpending = annualSpending > 0
  const wholeYears = years == null ? null : Math.ceil(years)
  const verdict = !canProject
    ? t.fireCalculatorNeedIncome
    : years == null
      ? t.fireCalculatorNever
      : wholeYears === 1 ? t.fireCalculatorYear : t.fireCalculatorYears.replace('{years}', wholeYears)

  // Only the year is asked for, so the age shown is the difference in years.
  const age = ageFromBirthYear(birthYearInput)

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
        {[0, 1, 2, 3, 4, 5].map((index) => <span key={index} className={step >= index ? 'onboarding-dot active-dot' : 'onboarding-dot'} />)}
      </div>
      <p className="onboarding-step">{t.stepLabel} {step + 1}/6</p>

      {step === 0 ? <>
        <h1 id="onboarding-title">{t.onboardingFireTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingFireSubtitle}</p>
        <a className="onboarding-learn-more" href="https://www.investopedia.com/terms/f/financial-independence-retire-early-fire.asp" target="_blank" rel="noopener noreferrer">{t.learnMore} <ExternalLink size={13} /></a>
        <div className="onboarding-fire">
          <div className="form-row">
            <div><label className="field-label" htmlFor="onboarding-fire-income">{t.fireIncomeLabel}</label><div className="amount-input"><span>€</span><input id="onboarding-fire-income" type="number" min="0" step="1000" placeholder="30000" value={incomeInput} onChange={(event) => setIncomeInput(event.target.value)} /></div></div>
            <div><label className="field-label" htmlFor="onboarding-fire-spend">{t.fireSpendLabel}</label><div className="amount-input"><span>€</span><input id="onboarding-fire-spend" type="number" min="0" step="50" placeholder="1500" value={spendingInput} onChange={(event) => setSpendingInput(event.target.value)} /></div></div>
          </div>
          <p className="onboarding-hint onboarding-units-hint">{t.fireUnitsHint}</p>
          <label className="field-label" htmlFor="onboarding-fire-networth">{t.fireNetWorthLabel}</label>
          <div className="amount-input"><span>€</span><input id="onboarding-fire-networth" type="number" min="0" step="1000" placeholder="0" value={netWorthInput} onChange={(event) => setNetWorthInput(event.target.value)} /></div>
          <p className="onboarding-hint">{t.fireNetWorthHint}</p>

          <div className="fire-calculator">
            {!hasSpending ? <p className="fire-calculator-empty">{t.fireCalculatorEmpty}</p> : <>
              <div className="fire-calculator-head">
                <span>{t.fireCalculatorNumber}</span>
                <strong>{formatCurrency(suggestedGoal, language)}</strong>
                <small>{t.fireTargetNote.replace('{amount}', formatCurrency(annualSpending, language))}</small>
              </div>
              {canProject && <div className="fire-calculator-rows">
                <div className="fire-calculator-row"><span>{t.fireCalculatorSaving}</span><strong>{formatCurrency(annualSavings, language)}</strong></div>
                <div className="fire-calculator-row"><span>{t.fireCalculatorRate}</span><strong>{savingsRate.toFixed(0)}%</strong></div>
                {netWorth > 0 && <div className="fire-calculator-row"><span>{t.fireCalculatorCovered}</span><strong>{covered.toFixed(0)}%</strong></div>}
              </div>}
              <p className={canProject && years == null ? 'fire-calculator-verdict verdict-alert' : 'fire-calculator-verdict'}>{verdict}</p>
            </>}
          </div>
          {hasSpending && <p className="onboarding-hint onboarding-units-hint">{t.fireStartingPoint}</p>}
        </div>
        <button type="button" className="submit-button onboarding-wide" onClick={() => setStep(1)}>{t.continue} <ArrowRight size={16} /></button>
      </> : step === 1 ? <>
        <h1 id="onboarding-title">{t.onboardingCategoriesTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingCategoriesSubtitle}</p>
        {['expense', 'income'].map((type) => <div className="onboarding-group" key={type}>
          <div className="onboarding-group-head"><strong>{type === 'expense' ? t.expense : t.income}</strong><span>{categories[type].length} / {MIN_CATEGORIES[type]}</span></div>
          <div className="onboarding-chips">
            {[...categorySuggestions(type), ...customCategories[type]].map((name) => <button type="button" key={name} className={categories[type].includes(name) ? 'onboarding-chip chip-on' : 'onboarding-chip'} aria-pressed={categories[type].includes(name)} onClick={() => toggleCategory(type, name)}>{t.categoryNames[name] || name}</button>)}
          </div>
          <div className="add-row">
            <input value={categoryDrafts[type]} placeholder={t.addOwnCategory} aria-label={t.addOwnCategory} onChange={(event) => setCategoryDraft(type, event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomCategory(type) } }} />
            <button type="button" onClick={() => addCustomCategory(type)} disabled={!categoryDrafts[type].trim()} aria-label={t.addCategory} title={t.addCategory}><Plus size={15} /></button>
          </div>
        </div>)}
        {!categoriesReady && <p className="onboarding-hint">{t.onboardingCategoriesHint}</p>}
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(0)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" disabled={!categoriesReady} onClick={() => setStep(2)}>{t.continue} <ArrowRight size={16} /></button>
        </div>
      </> : step === 2 ? <>
        <h1 id="onboarding-title">{t.onboardingPlatformsTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingPlatformsSubtitle}</p>
        <div className="onboarding-chips onboarding-chips-platforms">
          {[...PLATFORM_SUGGESTIONS, ...customPlatforms].map((name) => <button type="button" key={name} className={platforms.includes(name) ? 'onboarding-chip chip-on' : 'onboarding-chip'} aria-pressed={platforms.includes(name)} onClick={() => togglePlatform(name)}>{name}</button>)}
        </div>
        <div className="add-row add-row-platforms">
          <input value={platformDraft} placeholder={t.addOwnPlatform} aria-label={t.addOwnPlatform} onChange={(event) => setPlatformDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomPlatform() } }} />
          <button type="button" onClick={addCustomPlatform} disabled={!platformDraft.trim()} aria-label={t.addPlatform} title={t.addPlatform}><Plus size={15} /></button>
        </div>
        {!platformsReady && <p className="onboarding-hint">{t.onboardingPlatformsHint}</p>}
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(1)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" disabled={!platformsReady} onClick={() => setStep(3)}>{t.continue} <ArrowRight size={16} /></button>
        </div>
      </> : step === 3 ? <>
        <h1 id="onboarding-title">{t.onboardingInvestmentsTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingInvestmentsSubtitle}</p>
        <div className="onboarding-chips onboarding-chips-investments">
          {INVESTMENT_TYPES.map(({ key, icon: Icon }) => <button type="button" key={key} className={visibility[key] ? 'onboarding-chip chip-on' : 'onboarding-chip'} aria-pressed={visibility[key]} onClick={() => toggleInvestment(key)}><Icon size={15} /> {t[key]}</button>)}
        </div>
        {!investmentsReady && <p className="onboarding-hint">{t.onboardingInvestmentsHint}</p>}
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(2)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" disabled={!investmentsReady} onClick={() => setStep(4)}>{t.continue} <ArrowRight size={16} /></button>
        </div>
      </> : step === 4 ? <>
        <h1 id="onboarding-title">{t.onboardingAboutTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingAboutSubtitle}</p>
        <div className="onboarding-fire">
          <label className="field-label" htmlFor="onboarding-birth-year">{t.birthYearLabel}</label>
          <div className="amount-input"><input id="onboarding-birth-year" type="number" min="1900" max="2100" step="1" placeholder="1990" value={birthYearInput} onChange={(event) => setBirthYearInput(event.target.value)} /></div>
          {age != null && <p className="onboarding-hint onboarding-units-hint">{t.birthYearHint.replace('{age}', age)}</p>}
          <label className="field-label" htmlFor="onboarding-country">{t.countryLabel}</label>
          <select className="select-input" id="onboarding-country" value={countryInput} onChange={(event) => setCountryInput(event.target.value)}>
            <option value="">{t.countryNone}</option>
            {countryOptions(locale).map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
          </select>
          <p className="onboarding-hint onboarding-units-hint">{t.onboardingAboutHint}</p>
        </div>
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(3)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" onClick={() => setStep(5)}>{t.continue} <ArrowRight size={16} /></button>
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
          <button type="button" className="ghost-button" onClick={() => setStep(4)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" onClick={finish}><Check size={16} /> {t.finishSetup}</button>
        </div>
      </>}
    </section>
  </div>
}
