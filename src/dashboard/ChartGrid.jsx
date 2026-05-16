import ChartCard from './components/ChartCard'
import FeaturesByDatasetChart from './FeaturesByDatasetChart'

// charts: [{ key, title, status, date, type, data }]
// Pour l'instant un seul type de diagramme : 'features-par-jeu'.
export default function ChartGrid({ charts }) {
  return (
    <div className="chart-grid">
      {charts.map((c) => (
        <ChartCard key={c.key} title={c.title} status={c.status} date={c.date}>
          {c.type === 'features-par-jeu' && <FeaturesByDatasetChart data={c.data} />}
        </ChartCard>
      ))}
    </div>
  )
}
