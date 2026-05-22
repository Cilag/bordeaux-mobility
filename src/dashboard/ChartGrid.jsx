import ChartCard from './components/ChartCard'
import FeaturesByDatasetChart from './FeaturesByDatasetChart'
import ModeDistributionChart from './ModeDistributionChart'

// charts: [{ key, title, status, date, type, data }]
export default function ChartGrid({ charts }) {
  return (
    <div className="chart-grid">
      {charts.map((c) => (
        <ChartCard key={c.key} title={c.title} status={c.status} date={c.date}>
          {c.type === 'features-par-jeu' && <FeaturesByDatasetChart data={c.data} />}
          {c.type === 'mode-distribution' && <ModeDistributionChart data={c.data} />}
        </ChartCard>
      ))}
    </div>
  )
}
