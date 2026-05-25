import FreshnessBadge from './FreshnessBadge'

// Carte titrée générique. status ∈ 'chargement' | 'pret' | 'erreur' | 'vide'.
// Utilisée pour les diagrammes et la carte du dashboard.
export default function ChartCard({ title, status = 'pret', date = null, children }) {
  return (
    <section className="chart-card">
      <header className="chart-card-head">
        <h3>{title}</h3>
        {status === 'pret' && <FreshnessBadge date={date} />}
      </header>
      <div className="chart-card-body">
        {status === 'chargement' && <p className="state-msg">Chargement…</p>}
        {status === 'erreur' && <p className="state-msg state-error">Source indisponible</p>}
        {status === 'vide' && <p className="state-msg">Aucune donnée pour cette zone/période</p>}
        {status === 'pret' && children}
      </div>
    </section>
  )
}
