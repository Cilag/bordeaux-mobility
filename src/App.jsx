import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from './dashboard/DashboardPage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/mobilite" replace />} />
      <Route path="/dashboard/:domaine" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/dashboard/mobilite" replace />} />
    </Routes>
  )
}
