// src/components/Sidebar/Sidebar.jsx
import TramBusPanel from './TramBusPanel'
import VCubPanel from './VCubPanel'
import SNCFPanel from './SNCFPanel'
import FlightPanel from './FlightPanel'
import './Sidebar.css'

export default function Sidebar({ open, onToggle, tbm, vcub, sncf, openSky, userPosition }) {
  return (
    <aside role="complementary" className={`sidebar ${open ? '' : 'closed'}`}>
      <button className="sidebar-toggle" title={open ? 'Fermer' : 'Ouvrir'} onClick={onToggle}>
        {open ? '›' : '‹'}
      </button>
      {open && (
        <div className="sidebar-content">
          <TramBusPanel stops={tbm.stops} userPosition={userPosition} />
          <VCubPanel stations={vcub.stations} userPosition={userPosition} />
          <SNCFPanel departures={sncf.departures} />
          <FlightPanel flights={openSky.flights} />
        </div>
      )}
    </aside>
  )
}
