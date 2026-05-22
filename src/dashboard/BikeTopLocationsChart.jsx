import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// data: [{ libelle, total }, ...] déjà trié desc, top N
export default function BikeTopLocationsChart({ data }) {
  if (!data.length) {
    return <p className="state-msg">Données vélo indisponibles.</p>
  }
  const height = Math.max(260, data.length * 26 + 60)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8EE" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#5A6B7D' }} tickFormatter={(v) => v.toLocaleString('fr-FR')} />
        <YAxis type="category" dataKey="libelle" width={200} tick={{ fontSize: 10.5, fill: '#1F2933' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          formatter={(v) => [v.toLocaleString('fr-FR'), 'Passages cumulés']}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
        />
        <Bar dataKey="total" fill="#2C8C5C" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
