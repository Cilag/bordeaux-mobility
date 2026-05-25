import { useState } from 'react'
import { themeForEntry } from './themes'
import { formatFreshness } from './freshness'

// Affiche la liste des jeux de données du domaine actif avec leur état :
// pastille de couleur du thème, nom, date de dernière MAJ, comptage / statut.
// Panneau rétractable pour libérer la carte.
// items: [{ id, libelle, entry, status, count, date }]
export default function LayerLegend({ items }) {
  const [open, setOpen] = useState(true)

  if (!items.length) return null

  const pret = items.filter((i) => i.status === 'pret').length
  const errored = items.filter((i) => i.status === 'erreur').length

  return (
    <aside className={`layer-legend ${open ? 'open' : 'closed'}`}>
      <header className="layer-legend-head">
        <button
          type="button"
          className="layer-legend-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Réduire la légende' : 'Afficher la légende'}
          title={open ? 'Réduire la légende' : 'Afficher la légende'}
        >
          <span className="layer-legend-chevron">{open ? '▾' : '▸'}</span>
          <h3>Jeux de données</h3>
        </button>
        <span className="layer-legend-counts">
          <span className="layer-count pret" title="Sources chargées">{pret}</span>
          {errored > 0 && <span className="layer-count erreur" title="Sources en erreur">{errored}</span>}
          <span className="layer-count total" title="Total">{items.length}</span>
        </span>
      </header>
      {open && (
        <ul className="layer-legend-list">
          {items.map((it) => {
            const color = themeForEntry(it.entry).color
            return (
              <li key={it.id} className={`layer-legend-row layer-${it.status}`} title={it.libelle}>
                <span className="layer-dot" style={{ background: color }} />
                <div className="layer-text">
                  <span className="layer-name">{it.libelle}</span>
                  <span className="layer-date">MAJ {formatFreshness(it.date)}</span>
                </div>
                <span className="layer-meta">{statusLabel(it)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}

function statusLabel({ status, count }) {
  if (status === 'pret') return count != null ? count.toLocaleString('fr-FR') : '—'
  if (status === 'chargement') return '…'
  if (status === 'erreur') return 'erreur'
  return ''
}
