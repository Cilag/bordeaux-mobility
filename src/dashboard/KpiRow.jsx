import KpiCard from './KpiCard'

export default function KpiRow({ kpis }) {
  return (
    <div className="kpi-row">
      {kpis.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} />)}
    </div>
  )
}
