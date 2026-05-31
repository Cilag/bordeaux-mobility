import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

// data: [{ nom, occupancy, libres, total }, ...] trié par occupancy desc (max 20)
// occupancy = (total - libres) / total * 100 (0–100)
export default function ParkingOccupancyChart({ data }) {
  if (!data?.length) return <p className="state-msg">Aucune donnée d'occupation disponible.</p>
  const height = Math.max(280, data.length * 32 + 60)

  const getColor = (occupancy) => {
    if (occupancy >= 80) return '#DC2626'
    if (occupancy >= 50) return '#F59E0B'
    return '#16A34A'
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8EE" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#5A6B7D' }}
          tickFormatter={(v) => v + '%'}
        />
        <YAxis
          type="category"
          dataKey="nom"
          width={160}
          tick={{ fontSize: 11, fill: '#1F2933' }}
        />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const row = payload[0].payload
            const v = row.occupancy
            return (
              <div style={{ background: '#fff', border: '1px solid #d4d4d8', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: '#1E3A5F', marginBottom: 4 }}>{label}</div>
                <div>{`${v.toFixed(0)} % occupé (${row.libres} libres / ${row.total} places)`}</div>
              </div>
            )
          }}
        />
        <Bar dataKey="occupancy" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.occupancy)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
