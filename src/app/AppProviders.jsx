import { LanguageProvider } from '../i18n/LanguageProvider.jsx'
import { SettingsProvider } from '../context/SettingsProvider.jsx'
import { FinanceProvider } from '../context/FinanceProvider.jsx'

/**
 * Composes the app-wide providers. Order matters: the finance layer reads
 * settings, and both read the active language.
 */
export default function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <FinanceProvider>{children}</FinanceProvider>
      </SettingsProvider>
    </LanguageProvider>
  )
}
