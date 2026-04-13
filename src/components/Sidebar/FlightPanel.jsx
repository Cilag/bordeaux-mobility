// src/components/Sidebar/FlightPanel.jsx
export default function FlightPanel({ flights }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span>✈️ Vols</span>
        <span style={{ color: '#888', fontWeight: 400 }}>{flights.length} en vol</span>
      </div>
      <div className="panel-body">
        {flights.slice(0, 15).map((f) => (
          <div key={f.icao24} className="panel-row">
            <span style={{ fontWeight: 600 }}>{f.callsign || f.icao24}</span>
            <span style={{ color: '#888' }}>
              {f.altitude ? Math.round(f.altitude) + ' m' : '?'}
              {' · '}
              {f.velocity ? Math.round(f.velocity * 3.6) + ' km/h' : '?'}
            </span>
          </div>
        ))}
        {flights.length === 0 && <div className="panel-row" style={{ color: '#888' }}>Aucun vol détecté</div>}
      </div>
    </div>
  )
}
