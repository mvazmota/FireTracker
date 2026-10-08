import { useMemo } from 'react'
import { useFinance } from '../context/FinanceProvider.jsx'
import { useSettings } from '../context/SettingsProvider.jsx'
import { estimateProjection, fireProjection } from '../lib/fire.js'

/**
 * The one FIRE projection the app runs.
 *
 * Both the FIRE tab and the sidebar meter read it, so they can never disagree
 * about the goal. Real numbers once there is history to average; the onboarding
 * answers until then. The caller supplies the position, because the app shell
 * tracks the month the user has selected while the FIRE tab always means today.
 */
export function useFireProjection(currentPosition) {
  const { transactions } = useFinance()
  const { fireEstimate, firePlan } = useSettings()
  const today = useMemo(() => new Date(), [])

  const fromData = useMemo(
    () => fireProjection({ transactions, currentPosition, plan: firePlan, today }),
    [transactions, currentPosition, firePlan, today],
  )
  const fromEstimate = useMemo(
    () => estimateProjection({ estimate: fireEstimate, currentPosition, plan: firePlan, today }),
    [fireEstimate, currentPosition, firePlan, today],
  )

  return fromData.target > 0 ? fromData : fromEstimate
}
