import { useState, useEffect } from 'react'
import './RefreshTimer.css'

export default function RefreshTimer({ lastUpdate, intervalSeconds }) {
  const [countdown, setCountdown] = useState(intervalSeconds)

  useEffect(() => {
    setCountdown(intervalSeconds)
    const t = setInterval(() => {
      setCountdown((c) => (c <= 1 ? intervalSeconds : c - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [lastUpdate, intervalSeconds])

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '...'

  return (
    <div className="refresh-timer">
      <span>MAJ: {timeStr}</span>
      <span className="countdown">{countdown}s</span>
    </div>
  )
}
