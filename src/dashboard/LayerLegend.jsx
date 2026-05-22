import { themeForEntry } from './themes'

// Affiche la liste des jeux de données du domaine actif avec leur état :
// pastille de couleur du thème, nom, nombre de features affichées, statut.
// items: [{ id, libelle, entry, status, count }]
export default function LayerLegend({ items }) {
  if (!items.length) return null
  return (
    <aside className="layer-legend">
      <header className="layer-legend-head">
        <h3>Jeux de données</h3>
        <span className="layer-legend-count">{items.length}</span>
      </header>
      <ul className="layer-legend-list">
        {items.map((it) => {
          const color = themeForEntry(it.entry).color
          return (
            <li key={it.id} className={`layer-legend-row layer-${it.status}`} title={it.libelle}>
              <span className="layer-dot" style={{ background: color }} />
              <span className="layer-name">{it.libelle}</span>
              <span className="layer-meta">{statusLabel(it)}</span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function statusLabel({ status, count }) {
  if (status === 'pret') return count != null ? `${count.toLocaleString('fr-FR')}` : '—'
  if (status === 'chargement') return '…'
  if (status === 'erreur') return 'erreur'
  return ''
}
