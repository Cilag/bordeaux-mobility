import BaseMap from '../shared/BaseMap'
import GeoJsonLayer from './components/GeoJsonLayer'

const COLORS = ['#1e3a5f', '#b5651d', '#3a7d44', '#7a3b8f', '#aa2e4a', '#2e7d8f']

// layers: [{ id, features }]
export default function DashboardMap({ layers }) {
  return (
    <BaseMap>
      {layers.map((layer, i) => (
        <GeoJsonLayer
          key={`${layer.id}-${layer.features.length}`}
          features={layer.features}
          color={COLORS[i % COLORS.length]}
        />
      ))}
    </BaseMap>
  )
}
