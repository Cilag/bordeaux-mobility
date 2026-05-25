import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const MODE_LABELS = {
  pieton: 'Piéton', velo: 'Vélo', bus_tram: 'Bus / Tram',
  voiture: 'Voiture', autopartage: 'Autopartage', freefloating: 'Freefloating',
}
const MODE_COLORS = {
  pieton: '#2C8C5C', velo: '#3F8F3F', bus_tram: '#1E3A5F',
  voiture: '#B5651D', autopartage: '#7C5DC3', freefloating: '#0EA5B6',
}

// data: [{ mode: 'velo', count: 1200 }]
export default function ModeDistributionChart({ data }) {
  if (!data.length) return <p className="state-msg">Aucune donnée à répartir</p>
  const total = data.reduce((n, d) => n + d.count, 0)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="mode" innerRadius={55} outerRadius={88} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.mode} fill={MODE_COLORS[d.mode] || '#6B7280'} />
          ))}
        </Pie>
        <Tooltip formatter={(v, name) => [`${v.toLocaleString('fr-FR')} (${Math.round(100 * v / total)}%)`, MODE_LABELS[name] || name]} />
        <Legend formatter={(value) => MODE_LABELS[value] || value} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
