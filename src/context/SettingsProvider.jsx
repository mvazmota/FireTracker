import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { categories } from '../data/categories.js'
import {
  CUSTOM_CATEGORIES_STORAGE_KEY,
  FIRE_GOAL_STORAGE_KEY,
  FIRE_METER_STORAGE_KEY,
  PLATFORMS_STORAGE_KEY,
  PROFILE_STORAGE_KEY,
  VISIBILITY_STORAGE_KEY,
} from '../lib/constants.js'
import {
  loadCustomCategories,
  loadFireGoal,
  loadFireMeterVisible,
  loadInvestmentVisibility,
  loadPlatforms,
  loadUserProfile,
  writeJSON,
} from '../lib/storage.js'

const SettingsContext = createContext(null)

/** Profile, FIRE goal, investment visibility, platforms and custom categories. */
export function SettingsProvider({ children }) {
  const [profile, setProfile] = useState(loadUserProfile)
  const [fireGoal, setFireGoal] = useState(loadFireGoal)
  const [fireMeterVisible, setFireMeterVisible] = useState(loadFireMeterVisible)
  const [investmentVisibility, setInvestmentVisibility] = useState(loadInvestmentVisibility)
  const [platforms, setPlatforms] = useState(loadPlatforms)
  const [customCategories, setCustomCategories] = useState(loadCustomCategories)

  const saveProfile = useCallback((next) => {
    setProfile(next)
    writeJSON(PROFILE_STORAGE_KEY, next)
  }, [])

  const saveFireGoal = useCallback((next) => {
    setFireGoal(next)
    writeJSON(FIRE_GOAL_STORAGE_KEY, next)
  }, [])

  const toggleFireMeter = useCallback(() => {
    setFireMeterVisible((current) => {
      const next = !current
      writeJSON(FIRE_METER_STORAGE_KEY, next)
      return next
    })
  }, [])

  const toggleInvestmentVisibility = useCallback((type) => {
    setInvestmentVisibility((current) => {
      const next = { ...current, [type]: !current[type] }
      writeJSON(VISIBILITY_STORAGE_KEY, next)
      return next
    })
  }, [])

  const rememberPlatform = useCallback((value) => {
    const platform = value?.trim()
    if (!platform) return
    setPlatforms((current) => {
      if (current.some((item) => item.toLowerCase() === platform.toLowerCase())) return current
      const next = [...current, platform]
      writeJSON(PLATFORMS_STORAGE_KEY, next)
      return next
    })
  }, [])

  const rememberCategory = useCallback((type, value) => {
    const category = value?.trim()
    if (!category) return
    setCustomCategories((current) => {
      const isBuiltIn = categories[type]?.some((item) => item.name.toLowerCase() === category.toLowerCase())
      const alreadyAdded = current[type].some((item) => item.toLowerCase() === category.toLowerCase())
      if (isBuiltIn || alreadyAdded) return current
      const next = { ...current, [type]: [...current[type], category] }
      writeJSON(CUSTOM_CATEGORIES_STORAGE_KEY, next)
      return next
    })
  }, [])

  const value = useMemo(() => ({
    profile,
    fireGoal,
    fireMeterVisible,
    investmentVisibility,
    platforms,
    customCategories,
    saveProfile,
    saveFireGoal,
    toggleFireMeter,
    toggleInvestmentVisibility,
    rememberPlatform,
    rememberCategory,
  }), [
    profile, fireGoal, fireMeterVisible, investmentVisibility, platforms, customCategories,
    saveProfile, saveFireGoal, toggleFireMeter, toggleInvestmentVisibility, rememberPlatform, rememberCategory,
  ])

  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>')
  return context
}
