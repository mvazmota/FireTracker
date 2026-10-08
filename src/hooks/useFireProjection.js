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
export function useFireProjection(currentPosition, plan) {
  const { transactions } = useFinance()
  const { fireEstimate, firePlan } = useSettings()
  const today = useMemo(() => new Date(), [])
  // A draft plan being edited wins over the saved one, so the FIRE tab can show
  // the effect of a change before it is written.
  const effectivePlan = plan ?? firePlan

  const fromData = useMemo(
    () => fireProjection({ transactions, currentPosition, plan: effectivePlan, today }),
    [transactions, currentPosition, effectivePlan, today],
  )
  const fromEstimate = useMemo(
    () => estimateProjection({ estimate: fireEstimate, currentPosition, plan: effectivePlan, today }),
    [fireEstimate, currentPosition, effectivePlan, today],
  )

  return fromData.target > 0 ? fromData : fromEstimate
}
