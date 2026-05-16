import { createContext, useContext, useReducer } from 'react'
import { dashboardReducer, initialState } from './dashboardReducer'

const DashboardContext = createContext(null)

export function DashboardProvider({ domaine, children }) {
  const [state, dispatch] = useReducer(dashboardReducer, domaine, initialState)
  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard doit être utilisé dans un DashboardProvider')
  return ctx
}
