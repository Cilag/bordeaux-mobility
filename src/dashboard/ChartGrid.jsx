import ChartCard from './components/ChartCard'
import FeaturesByDatasetChart from './FeaturesByDatasetChart'
import ModeDistributionChart from './ModeDistributionChart'
import FeaturesByZoneChart from './FeaturesByZoneChart'
import ParkingCapacityByCommuneChart from './ParkingCapacityByCommuneChart'
import HorizontalBarChart from './HorizontalBarChart'
import CyclingByYearChart from './CyclingByYearChart'
import SupplyDemandChart from './SupplyDemandChart'
import ParkingOccupancyChart from './ParkingOccupancyChart'
import BikeTrafficChart from './BikeTrafficChart'
import VcubOccupancyChart from './VcubOccupancyChart'

// charts: [{ key, title, status, date, type, data }]
export default function ChartGrid({ charts }) {
  return (
    <div className="chart-grid">
      {charts.map((c) => (
        <ChartCard key={c.key} title={c.title} status={c.status} date={c.date}>
          {c.type === 'features-par-jeu' && <FeaturesByDatasetChart data={c.data} />}
          {c.type === 'mode-distribution' && <ModeDistributionChart data={c.data} />}
          {c.type === 'features-par-zone' && <FeaturesByZoneChart data={c.data} />}
          {c.type === 'capacite-par-commune' && <ParkingCapacityByCommuneChart data={c.data} />}
          {c.type === 'horizontal-bar' && <HorizontalBarChart data={c.data} {...c.props} />}
          {c.type === 'cycling-by-year' && <CyclingByYearChart data={c.data} />}
          {c.type === 'supply-demand' && <SupplyDemandChart data={c.data} />}
          {c.type === 'parking-occupancy' && <ParkingOccupancyChart data={c.data} />}
          {c.type === 'velo-traffic-par-zone' && <BikeTrafficChart data={c.data} />}
          {c.type === 'vcub-occupancy' && <VcubOccupancyChart data={c.data} />}
        </ChartCard>
      ))}
    </div>
  )
}
