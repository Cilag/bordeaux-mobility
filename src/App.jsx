import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from './dashboard/DashboardPage'
import LivePage from './live/LivePage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/mobilite" replace />} />
      <Route path="/dashboard/:domaine" element={<DashboardPage />} />
      <Route path="/live" element={<LivePage />} />
      <Route path="*" element={<Navigate to="/dashboard/mobilite" replace />} />
    </Routes>
  )
}
