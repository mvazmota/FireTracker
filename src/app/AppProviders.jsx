import { LanguageProvider } from '../i18n/LanguageProvider.jsx'
import { AuthProvider } from '../context/AuthProvider.jsx'
import { SyncProvider } from '../context/SyncProvider.jsx'
import { DataProvider } from '../context/DataProvider.jsx'
import { SettingsProvider } from '../context/SettingsProvider.jsx'
import { FinanceProvider } from '../context/FinanceProvider.jsx'

/**
 * Composes the app-wide providers. Order matters: auth first, then the sync
 * tracker the data layers report their writes to, then the data, settings and
 * finance layers.
 */
export default function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SyncProvider>
          <DataProvider>
            <SettingsProvider>
              <FinanceProvider>{children}</FinanceProvider>
            </SettingsProvider>
          </DataProvider>
        </SyncProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
