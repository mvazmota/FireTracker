import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Flame } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import { categorySuggestions } from '../../data/categories.js'
import { PLATFORM_SUGGESTIONS } from '../../lib/constants.js'

/**
 * First-run setup: a new account has no categories and no platforms, so we ask
 * for them before the app is usable. Both steps are suggestion-driven to keep
 * it quick; custom entries can be added later from the normal forms.
 */
export default function OnboardingPage() {
  const { t, language, changeLanguage } = useI18n()
  const { saveOnboarding } = useSettings()
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState({ expense: [], income: [] })
  const [platforms, setPlatforms] = useState([])

  function toggleCategory(type, name) {
    setCategories((current) => ({
      ...current,
      [type]: current[type].includes(name) ? current[type].filter((item) => item !== name) : [...current[type], name],
    }))
  }

  function togglePlatform(name) {
    setPlatforms((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]))
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
        <span className={step >= 0 ? 'onboarding-dot active-dot' : 'onboarding-dot'} />
        <span className={step >= 1 ? 'onboarding-dot active-dot' : 'onboarding-dot'} />
      </div>
      <p className="onboarding-step">{t.stepLabel} {step + 1}/2</p>

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
      </> : <>
        <h1 id="onboarding-title">{t.onboardingPlatformsTitle}<span>.</span></h1>
        <p className="onboarding-sub">{t.onboardingPlatformsSubtitle}</p>
        <div className="onboarding-chips onboarding-chips-platforms">
          {PLATFORM_SUGGESTIONS.map((name) => <button type="button" key={name} className={platforms.includes(name) ? 'onboarding-chip chip-on' : 'onboarding-chip'} aria-pressed={platforms.includes(name)} onClick={() => togglePlatform(name)}>{name}</button>)}
        </div>
        <div className="onboarding-actions">
          <button type="button" className="ghost-button" onClick={() => setStep(0)}><ArrowLeft size={16} /> {t.back}</button>
          <button type="button" className="submit-button" onClick={() => saveOnboarding({ categories, platforms })}><Check size={16} /> {t.finishSetup}</button>
        </div>
      </>}
    </section>
  </div>
}
