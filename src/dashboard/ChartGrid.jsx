import ChartCard from './components/ChartCard'
import FeaturesByDatasetChart from './FeaturesByDatasetChart'
import ModeDistributionChart from './ModeDistributionChart'
import FeaturesByZoneChart from './FeaturesByZoneChart'
import TrafficTopRoadsChart from './TrafficTopRoadsChart'
import BikeTopLocationsChart from './BikeTopLocationsChart'

// charts: [{ key, title, status, date, type, data }]
export default function ChartGrid({ charts }) {
  return (
    <div className="chart-grid">
      {charts.map((c) => (
        <ChartCard key={c.key} title={c.title} status={c.status} date={c.date}>
          {c.type === 'features-par-jeu' && <FeaturesByDatasetChart data={c.data} />}
          {c.type === 'mode-distribution' && <ModeDistributionChart data={c.data} />}
          {c.type === 'features-par-zone' && <FeaturesByZoneChart data={c.data} />}
          {c.type === 'trafic-top-voies' && <TrafficTopRoadsChart data={c.data} />}
          {c.type === 'velo-top-capteurs' && <BikeTopLocationsChart data={c.data} />}
        </ChartCard>
      ))}
    </div>
  )
}
