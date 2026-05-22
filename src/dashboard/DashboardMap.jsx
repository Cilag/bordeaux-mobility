import BaseMap from '../shared/BaseMap'
import GeoJsonLayer from './components/GeoJsonLayer'
import { themeForEntry } from './themes'

// Adapte le rendu (épaisseur, rayon) au type de géométrie pour rester lisible
// quand beaucoup de couches sont superposées.
function styleFor(geometrie) {
  if (geometrie === 'ligne') return { weight: 2.5, radius: 5 }
  if (geometrie === 'polygone') return { weight: 1.5, radius: 5 }
  return { weight: 1.5, radius: 4 }
}

// layers: [{ id, libelle, entry, features }]
export default function DashboardMap({ layers }) {
  return (
    <BaseMap>
      {layers.map((layer) => {
        const color = themeForEntry(layer.entry).color
        const st = styleFor(layer.entry?.geometrie)
        return (
          <GeoJsonLayer
            key={`${layer.id}-${layer.features.length}`}
            features={layer.features}
            color={color}
            libelle={layer.libelle}
            weight={st.weight}
            radius={st.radius}
          />
        )
      })}
    </BaseMap>
  )
}
