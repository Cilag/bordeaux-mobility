import { formatFreshness } from '../freshness'

export default function FreshnessBadge({ date }) {
  return (
    <span className="freshness-badge" title="Date du jeu de données">
      📅 {formatFreshness(date)}
    </span>
  )
}
