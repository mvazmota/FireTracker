import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_FIRE_GOAL, DEFAULT_VISIBILITY } from '../lib/constants.js'
import { dateKey } from '../lib/dates.js'
import { api } from '../lib/api.js'
import { useAuth } from './AuthProvider.jsx'
import { useData } from './DataProvider.jsx'
import { useSync } from './SyncProvider.jsx'

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
  fireEstimate: null,
  firePlan: null,
})

/**
 * Profile, FIRE goal, investment visibility and the per-user lists of
 * categories and platforms.
 */
export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const { data } = useData()
  const { run } = useSync()
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
    setProfile({
      // The settings row is created by the first save (often onboarding) with a
      // blank name, so fall back to the account name rather than showing none.
      name: data.profile?.name || user?.name || '',
      avatar: data.profile?.avatar ?? '',
      createdAt: data.profile?.createdAt || dateKey(new Date()),
    })
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
      fireEstimate: stored.fireEstimate ?? null,
      firePlan: stored.firePlan ?? null,
    })
    setHydrated(true)
  }, [data, user?.name, applySettings])

  /** Applies a settings patch locally, then persists the whole object. */
  const persist = useCallback((patch) => {
    const next = { ...settingsRef.current, ...patch }
    applySettings(next)
    run(() => api.putSettings({ settings: next }))
  }, [applySettings, run])

  const saveProfile = useCallback((next) => {
    setProfile(next)
    run(() => api.putSettings({ profile: next }))
  }, [run])

  const saveFireGoal = useCallback((next) => persist({ fireGoal: next }), [persist])

  const saveFirePlan = useCallback((next) => persist({ firePlan: next }), [persist])

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

  const removeCategory = useCallback((type, value) => {
    const current = settingsRef.current.categories
    persist({ categories: { ...current, [type]: current[type].filter((item) => item !== value) } })
  }, [persist])

  const removePlatform = useCallback((value) => {
    persist({ platforms: settingsRef.current.platforms.filter((item) => item !== value) })
  }, [persist])

  /** Finishes onboarding with everything the user picked. */
  const saveOnboarding = useCallback(({ categories, platforms, investmentVisibility, fireGoal, fireMeterVisible, fireEstimate }) => {
    persist({
      categories,
      platforms,
      ...(investmentVisibility ? { investmentVisibility } : {}),
      ...(Number.isFinite(fireGoal) && fireGoal > 0 ? { fireGoal } : {}),
      ...(typeof fireMeterVisible === 'boolean' ? { fireMeterVisible } : {}),
      ...(fireEstimate ? { fireEstimate } : {}),
      onboarded: true,
    })
  }, [persist])

  const value = useMemo(() => ({
    profile,
    fireGoal: settings.fireGoal,
    fireMeterVisible: settings.fireMeterVisible,
    investmentVisibility: settings.investmentVisibility,
    platforms: settings.platforms,
    categories: settings.categories,
    onboarded: settings.onboarded,
    fireEstimate: settings.fireEstimate,
    firePlan: settings.firePlan,
    hydrated,
    saveProfile,
    saveFireGoal,
    saveFirePlan,
    toggleFireMeter,
    toggleInvestmentVisibility,
    rememberPlatform,
    rememberCategory,
    removeCategory,
    removePlatform,
    saveOnboarding,
  }), [
    profile, settings, hydrated,
    saveProfile, saveFireGoal, saveFirePlan, toggleFireMeter, toggleInvestmentVisibility,
    rememberPlatform, rememberCategory, removeCategory, removePlatform, saveOnboarding,
  ])

  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>')
  return context
}
