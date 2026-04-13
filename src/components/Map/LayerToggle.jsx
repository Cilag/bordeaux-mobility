import './LayerToggle.css'

const LAYERS = [
  { key: 'tram',    label: '🚋', title: 'Tram' },
  { key: 'bus',     label: '🚌', title: 'Bus' },
  { key: 'vcub',    label: '🚲', title: 'VCub' },
  { key: 'sncf',    label: '🚆', title: 'SNCF' },
  { key: 'flights', label: '✈️', title: 'Vols' },
  { key: 'traffic', label: '🚗', title: 'Trafic' },
  { key: 'lights',  label: '🚦', title: 'Feux' },
]

export default function LayerToggle({ visibleLayers, onToggleLayer }) {
  return (
    <div className="layer-toggle">
      {LAYERS.map(({ key, label, title }) => (
        <button
          key={key}
          title={title}
          className={`layer-btn ${visibleLayers[key] ? 'active' : ''}`}
          onClick={() => onToggleLayer(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
