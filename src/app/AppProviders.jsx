import { LanguageProvider } from '../i18n/LanguageProvider.jsx'
import { AuthProvider } from '../context/AuthProvider.jsx'
import { DataProvider } from '../context/DataProvider.jsx'
import { SettingsProvider } from '../context/SettingsProvider.jsx'
import { FinanceProvider } from '../context/FinanceProvider.jsx'

/**
 * Composes the app-wide providers. Order matters: auth first, then the data
 * layer that loads the account, then the settings and finance layers that read
 * from it and write back through the API.
 */
export default function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DataProvider>
          <SettingsProvider>
            <FinanceProvider>{children}</FinanceProvider>
          </SettingsProvider>
        </DataProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
