import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

// data: [{ commune, disponibles, occupes, total }, ...] trié par total desc (max 15)
// disponibles = sum(nbvelos), occupes = sum(nbplaces - nbvelos) clamped ≥0
export default function VcubOccupancyChart({ data }) {
  if (!data?.length) return <p className="state-msg">Aucune station VCub disponible.</p>
  const height = Math.max(280, data.length * 32 + 60)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8EE" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#5A6B7D' }}
          tickFormatter={(v) => v.toLocaleString('fr-FR')}
        />
        <YAxis
          type="category"
          dataKey="commune"
          width={150}
          tick={{ fontSize: 11, fill: '#1F2933' }}
        />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
          formatter={(v, name) => [v.toLocaleString('fr-FR'), name]}
        />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="disponibles" name="Vélos disponibles" stackId="vcub" fill="#2C8C5C" />
        <Bar dataKey="occupes" name="Docks occupés" stackId="vcub" fill="#9CA3AF" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
