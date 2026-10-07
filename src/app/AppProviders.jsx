import { LanguageProvider } from '../i18n/LanguageProvider.jsx'
import { AuthProvider } from '../context/AuthProvider.jsx'
import { SettingsProvider } from '../context/SettingsProvider.jsx'
import { FinanceProvider } from '../context/FinanceProvider.jsx'

/**
 * Composes the app-wide providers. Order matters: auth first, then the data
 * layers, which call the API with the session cookie.
 */
export default function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SettingsProvider>
          <FinanceProvider>{children}</FinanceProvider>
        </SettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
