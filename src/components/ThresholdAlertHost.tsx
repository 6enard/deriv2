import { useBotRunnerContext } from '../context/BotRunnerContext'
import { ThresholdAlert } from './ThresholdAlert'

export default function ThresholdAlertHost() {
  const { thresholdAlert, clearThresholdAlert } = useBotRunnerContext()

  if (!thresholdAlert) return null

  return (
    <ThresholdAlert
      key={`${thresholdAlert.type}-${thresholdAlert.profit}`}
      alert={thresholdAlert}
      onDismiss={clearThresholdAlert}
    />
  )
}
