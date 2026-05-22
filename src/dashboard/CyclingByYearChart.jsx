import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// data: [{ an: 2008, count: 12 }, ...] trié par an asc
export default function CyclingByYearChart({ data }) {
  if (!data.length) return <p className="state-msg">Aucun aménagement cyclable daté.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8EE" />
        <XAxis dataKey="an" tick={{ fontSize: 11, fill: '#5A6B7D' }} />
        <YAxis tick={{ fontSize: 11, fill: '#5A6B7D' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          formatter={(v) => [v.toLocaleString('fr-FR'), 'Tronçons installés']}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
          labelFormatter={(an) => `Année ${an}`}
        />
        <Bar dataKey="count" fill="#2C8C5C" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
