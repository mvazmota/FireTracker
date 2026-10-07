import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_FIRE_GOAL, DEFAULT_VISIBILITY } from '../lib/constants.js'
import { dateKey } from '../lib/dates.js'
import { api } from '../lib/api.js'
import { useAuth } from './AuthProvider.jsx'
import { useData } from './DataProvider.jsx'

const SettingsContext = createContext(null)

/** Every account starts with nothing chosen; onboarding fills these in. */
const emptySettings = () => ({
  language: 'en',
  fireGoal: DEFAULT_FIRE_GOAL,
  fireMeterVisible: true,
  investmentVisibility: { ...DEFAULT_VISIBILITY },
  platforms: [],
  categories: { expense: [], income: [] },
  onboarded: false,
})

/**
 * Profile, FIRE goal, investment visibility and the per-user lists of
 * categories and platforms.
 */
export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const { data } = useData()
  const [profile, setProfile] = useState(() => ({ name: '', avatar: '', createdAt: dateKey(new Date()) }))
  const [settings, setSettings] = useState(emptySettings)
  const [hydrated, setHydrated] = useState(false)
  // Mirrors `settings` synchronously so several patches in one tick compose
  // (a save calls rememberPlatform and rememberCategory back to back).
  const settingsRef = useRef(settings)

  const applySettings = useCallback((next) => {
    settingsRef.current = next
    setSettings(next)
  }, [])

  useEffect(() => {
    if (!data) {
      setHydrated(false)
      return
    }
    const stored = data.settings || {}
    setProfile(data.profile ?? { name: user?.name ?? '', avatar: '', createdAt: dateKey(new Date()) })
    applySettings({
      language: stored.language ?? 'en',
      fireGoal: stored.fireGoal ?? DEFAULT_FIRE_GOAL,
      fireMeterVisible: stored.fireMeterVisible ?? true,
      investmentVisibility: { ...DEFAULT_VISIBILITY, ...(stored.investmentVisibility || {}) },
      platforms: stored.platforms ?? [],
      categories: {
        expense: stored.categories?.expense ?? [],
        income: stored.categories?.income ?? [],
      },
      onboarded: stored.onboarded ?? false,
    })
    setHydrated(true)
  }, [data, user?.name, applySettings])

  /** Applies a settings patch locally, then persists the whole object. */
  const persist = useCallback((patch) => {
    const next = { ...settingsRef.current, ...patch }
    applySettings(next)
    api.putSettings({ settings: next }).catch(() => {})
  }, [applySettings])

  const saveProfile = useCallback((next) => {
    setProfile(next)
    api.putSettings({ profile: next }).catch(() => {})
  }, [])

  const saveFireGoal = useCallback((next) => persist({ fireGoal: next }), [persist])

  const toggleFireMeter = useCallback(() => persist({ fireMeterVisible: !settingsRef.current.fireMeterVisible }), [persist])

  const toggleInvestmentVisibility = useCallback((type) => {
    const current = settingsRef.current.investmentVisibility
    persist({ investmentVisibility: { ...current, [type]: !current[type] } })
  }, [persist])

  const rememberPlatform = useCallback((value) => {
    const platform = value?.trim()
    if (!platform) return
    const current = settingsRef.current.platforms
    if (current.some((item) => item.toLowerCase() === platform.toLowerCase())) return
    persist({ platforms: [...current, platform] })
  }, [persist])

  const rememberCategory = useCallback((type, value) => {
    const category = value?.trim()
    if (!category) return
    const current = settingsRef.current.categories
    if (current[type].some((item) => item.toLowerCase() === category.toLowerCase())) return
    persist({ categories: { ...current, [type]: [...current[type], category] } })
  }, [persist])

  /** Finishes onboarding with the categories and platforms the user picked. */
  const saveOnboarding = useCallback(({ categories, platforms }) => {
    persist({ categories, platforms, onboarded: true })
  }, [persist])

  const value = useMemo(() => ({
    profile,
    fireGoal: settings.fireGoal,
    fireMeterVisible: settings.fireMeterVisible,
    investmentVisibility: settings.investmentVisibility,
    platforms: settings.platforms,
    categories: settings.categories,
    onboarded: settings.onboarded,
    hydrated,
    saveProfile,
    saveFireGoal,
    toggleFireMeter,
    toggleInvestmentVisibility,
    rememberPlatform,
    rememberCategory,
    saveOnboarding,
  }), [
    profile, settings, hydrated,
    saveProfile, saveFireGoal, toggleFireMeter, toggleInvestmentVisibility,
    rememberPlatform, rememberCategory, saveOnboarding,
  ])

  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>')
  return context
}
