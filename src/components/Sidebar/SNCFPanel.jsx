// src/components/Sidebar/SNCFPanel.jsx
export default function SNCFPanel({ departures }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span>🚆 SNCF — Bordeaux St-Jean</span>
      </div>
      <div className="panel-body">
        {departures.slice(0, 15).map((d, i) => {
          const name = d.route?.name ?? d.display_informations?.direction ?? '?'
          const time = d.stop_date_time?.departure_date_time?.slice(9, 13) ?? '----'
          const hh = time.slice(0, 2)
          const mm = time.slice(2, 4)
          return (
            <div key={i} className="panel-row">
              <span style={{ fontWeight: 600 }}>{hh}:{mm}</span>
              <span style={{ color: '#444', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </span>
            </div>
          )
        })}
        {departures.length === 0 && <div className="panel-row" style={{ color: '#888' }}>Aucun départ</div>}
      </div>
    </div>
  )
}
