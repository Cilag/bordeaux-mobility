import { Link } from 'react-router-dom'
import { formatFreshness } from './freshness'

const DOMAINE_LABELS = { mobilite: 'Mobilité', stationnement: 'Stationnement' }

export default function TopBar({ domaine, oldestDate }) {
  return (
    <header className="topbar">
      <span className="topbar-title">Observatoire Mobilité & Stationnement</span>
      <nav className="domaine-toggle">
        {Object.entries(DOMAINE_LABELS).map(([key, label]) => (
          <Link
            key={key}
            to={`/dashboard/${key}`}
            className={key === domaine ? 'active' : ''}
          >
            {label}
          </Link>
        ))}
      </nav>
      <span className="topbar-freshness">
        Données les plus anciennes : {formatFreshness(oldestDate)}
      </span>
    </header>
  )
}
