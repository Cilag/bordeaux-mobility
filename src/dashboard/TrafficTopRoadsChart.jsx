import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// data: [{ nom_voie, mjo, hpm, hps }, ...] déjà trié, top N
// mjo = trafic journalier moyen ouvrable
// hpm = trafic heure de pointe matin
// hps = trafic heure de pointe soir
export default function TrafficTopRoadsChart({ data }) {
  if (!data.length) {
    return <p className="state-msg">Données de comptage du trafic non chargées.</p>
  }
  const height = Math.max(260, data.length * 26 + 60)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8EE" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#5A6B7D' }} />
        <YAxis type="category" dataKey="nom_voie" width={180} tick={{ fontSize: 10.5, fill: '#1F2933' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          formatter={(v, name) => {
            const label = name === 'mjo' ? 'Trafic journalier moyen'
              : name === 'hpm' ? 'Heure de pointe matin'
              : name === 'hps' ? 'Heure de pointe soir' : name
            return [v != null ? v.toLocaleString('fr-FR') : '—', label]
          }}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
        />
        <Bar dataKey="mjo" fill="#1E3A5F" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
