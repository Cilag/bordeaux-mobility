import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// data: [{ zone: 'Bordeaux', count: 1234 }, ...] déjà trié, top N
export default function FeaturesByZoneChart({ data }) {
  if (!data.length) {
    return <p className="state-msg">Carte des contours non chargée ou aucun rattachement possible.</p>
  }
  const height = Math.max(220, data.length * 26 + 40)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8EE" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#5A6B7D' }} />
        <YAxis type="category" dataKey="zone" width={150} tick={{ fontSize: 11, fill: '#1F2933' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          formatter={(v) => v.toLocaleString('fr-FR')}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
        />
        <Bar dataKey="count" fill="#1E3A5F" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
