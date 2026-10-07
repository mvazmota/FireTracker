import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { LANGUAGE_KEY } from '../lib/constants.js'
import { localeFor } from '../lib/dates.js'
import { messages } from './messages.jsx'

const LanguageContext = createContext(null)

/**
 * Owns the active language and exposes the matching copy.
 * React 19 allows rendering the context itself as the provider.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem(LANGUAGE_KEY) === 'pt' ? 'pt' : 'en'
    } catch {
      return 'en'
    }
  })

  const changeLanguage = useCallback((next) => {
    setLanguage(next)
    try {
      localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // Language still applies for this session.
    }
  }, [])

  const value = useMemo(() => ({
    language,
    locale: localeFor(language),
    t: messages[language] ?? messages.en,
    changeLanguage,
  }), [language, changeLanguage])

  return <LanguageContext value={value}>{children}</LanguageContext>
}

export function useI18n() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useI18n must be used inside <LanguageProvider>')
  return context
}
