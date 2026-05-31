import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// data: [{ zone, count }, ...] trié par count desc (max 15)
export default function BikeTrafficChart({ data }) {
  if (!data?.length) return <p className="state-msg">Aucune mesure de trafic vélo disponible.</p>
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8EE" />
        <XAxis
          dataKey="zone"
          tick={{ fontSize: 10, fill: '#1F2933' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#5A6B7D' }}
          tickFormatter={(v) => v.toLocaleString('fr-FR')}
        />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
          formatter={(v) => [v.toLocaleString('fr-FR'), 'Passages']}
        />
        <Bar dataKey="count" fill="#2C8C5C" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
