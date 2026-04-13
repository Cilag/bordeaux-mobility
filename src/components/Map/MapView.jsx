import { MapContainer, TileLayer } from 'react-leaflet'
import { BORDEAUX_CENTER } from '../../services/api'
import LayerToggle from './LayerToggle'
import RefreshTimer from '../UI/RefreshTimer'
import TramBusLayer from './layers/TramBusLayer'
import VCubLayer from './layers/VCubLayer'
import SNCFLayer from './layers/SNCFLayer'
import FlightLayer from './layers/FlightLayer'
import TrafficLayer from './layers/TrafficLayer'
import TrafficLightLayer from './layers/TrafficLightLayer'
import UserMarker from './layers/UserMarker'
import 'leaflet/dist/leaflet.css'

export default function MapView({
  tbm, vcub, sncf, openSky, trafficLights,
  visibleLayers, onToggleLayer, userPosition,
}) {
  const lastUpdate = tbm.lastUpdate ?? vcub.lastUpdate

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={BORDEAUX_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {visibleLayers.traffic && <TrafficLayer />}
        {visibleLayers.lights && <TrafficLightLayer data={trafficLights.lights} />}
        {visibleLayers.tram && <TramBusLayer vehicles={tbm.vehicles} stops={tbm.stops} type="tram" />}
        {visibleLayers.bus && <TramBusLayer vehicles={tbm.vehicles} stops={tbm.stops} type="bus" />}
        {visibleLayers.vcub && <VCubLayer stations={vcub.stations} />}
        {visibleLayers.sncf && <SNCFLayer departures={sncf.departures} />}
        {visibleLayers.flights && <FlightLayer flights={openSky.flights} />}
        {userPosition && <UserMarker position={userPosition} />}
      </MapContainer>

      <LayerToggle visibleLayers={visibleLayers} onToggleLayer={onToggleLayer} />
      <RefreshTimer lastUpdate={lastUpdate} intervalSeconds={30} />
    </div>
  )
}
