import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

// data: [{ commune, totales, pmr, vele, motot }, ...] trié desc par totales
const SERIES = [
  { key: 'standard', label: 'Places voitures',    color: '#1E3A5F' },
  { key: 'pmr',      label: 'Places PMR',         color: '#7C5DC3' },
  { key: 'motot',    label: 'Places 2-roues mot.', color: '#C0772A' },
  { key: 'velo',     label: 'Places vélo',        color: '#2C8C5C' },
]

export default function ParkingCapacityByCommuneChart({ data }) {
  if (!data.length) return <p className="state-msg">Aucune capacité de stationnement rattachable à une commune.</p>
  const height = Math.max(280, data.length * 32 + 60)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8EE" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#5A6B7D' }} tickFormatter={(v) => v.toLocaleString('fr-FR')} />
        <YAxis type="category" dataKey="commune" width={150} tick={{ fontSize: 11, fill: '#1F2933' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          formatter={(v, name) => {
            const s = SERIES.find((x) => x.key === name)
            return [v.toLocaleString('fr-FR'), s ? s.label : name]
          }}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
        />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} formatter={(v) => {
          const s = SERIES.find((x) => x.key === v)
          return s ? s.label : v
        }} />
        {SERIES.map((s) => (
          <Bar key={s.key} dataKey={s.key} stackId="cap" fill={s.color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
