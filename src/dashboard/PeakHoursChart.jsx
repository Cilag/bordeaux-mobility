import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

// data: [{ nom_voie, hpm, hps }, ...] trié desc par max(hpm,hps), top N
export default function PeakHoursChart({ data }) {
  if (!data.length) return <p className="state-msg">Données heures de pointe indisponibles.</p>
  const height = Math.max(300, data.length * 32 + 60)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8EE" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#5A6B7D' }} tickFormatter={(v) => v.toLocaleString('fr-FR')} />
        <YAxis type="category" dataKey="nom_voie" width={180} tick={{ fontSize: 10.5, fill: '#1F2933' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
          formatter={(v, name) => {
            const label = name === 'hpm' ? 'Heure de pointe matin'
              : name === 'hps' ? 'Heure de pointe soir' : name
            return [v != null ? v.toLocaleString('fr-FR') : '—', label]
          }}
        />
        <Legend
          iconType="square"
          wrapperStyle={{ fontSize: 11 }}
          formatter={(v) => v === 'hpm' ? '🌅 Pointe matin' : v === 'hps' ? '🌇 Pointe soir' : v}
        />
        <Bar dataKey="hpm" fill="#E8B14F" />
        <Bar dataKey="hps" fill="#7C5DC3" />
      </BarChart>
    </ResponsiveContainer>
  )
}
