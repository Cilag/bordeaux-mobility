import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

// data: [{ categorie, count, color }, ...] trié desc par count
export default function AccidentsByVehicleChart({ data }) {
  if (!data.length) return <p className="state-msg">Aucun accident sur la période.</p>
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8EE" />
        <XAxis dataKey="categorie" tick={{ fontSize: 11, fill: '#5A6B7D' }} angle={-25} textAnchor="end" interval={0} height={60} />
        <YAxis tick={{ fontSize: 11, fill: '#5A6B7D' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          formatter={(v) => [v.toLocaleString('fr-FR'), 'Accidents']}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d) => <Cell key={d.categorie} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
