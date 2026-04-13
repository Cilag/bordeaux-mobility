import { useState } from 'react'
import MapView from './components/Map/MapView'
import Sidebar from './components/Sidebar/Sidebar'
import { useTBM } from './hooks/useTBM'
import { useVCub } from './hooks/useVCub'
import { useSNCF } from './hooks/useSNCF'
import { useOpenSky } from './hooks/useOpenSky'
import { useTrafficLights } from './hooks/useTrafficLights'
import { useGeolocation } from './hooks/useGeolocation'
import './App.css'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [visibleLayers, setVisibleLayers] = useState({
    tram: true, bus: true, vcub: true, sncf: true, flights: true, traffic: true, lights: true,
  })

  const tbm = useTBM()
  const vcub = useVCub()
  const sncf = useSNCF()
  const openSky = useOpenSky()
  const trafficLights = useTrafficLights()
  const userPosition = useGeolocation()

  function toggleLayer(key) {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="map-container">
        <MapView
          tbm={tbm}
          vcub={vcub}
          sncf={sncf}
          openSky={openSky}
          trafficLights={trafficLights}
          visibleLayers={visibleLayers}
          onToggleLayer={toggleLayer}
          userPosition={userPosition}
        />
      </div>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        tbm={tbm}
        vcub={vcub}
        sncf={sncf}
        openSky={openSky}
        userPosition={userPosition}
      />
    </div>
  )
}
