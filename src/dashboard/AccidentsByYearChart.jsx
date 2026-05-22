import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'

// data: [{ an: 2012, indemne: n, leger: n, hospi: n, tue: n }, ...] trié par an asc.
const SERIES = [
  { key: 'indemne', label: 'Indemne',             color: '#86B956' },
  { key: 'leger',   label: 'Blessé léger',        color: '#E8B14F' },
  { key: 'hospi',   label: 'Blessé hospitalisé',  color: '#D67934' },
  { key: 'tue',     label: 'Tué',                 color: '#B83D2E' },
]

export default function AccidentsByYearChart({ data }) {
  if (!data.length) return <p className="state-msg">Aucun accident sur la période.</p>
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8EE" />
        <XAxis dataKey="an" tick={{ fontSize: 11, fill: '#5A6B7D' }} />
        <YAxis tick={{ fontSize: 11, fill: '#5A6B7D' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          formatter={(v, name) => {
            const s = SERIES.find((x) => x.key === name)
            return [v.toLocaleString('fr-FR'), s ? s.label : name]
          }}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
        />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} formatter={(v) => {
          const s = SERIES.find((x) => x.key === v)
          return s ? s.label : v
        }} />
        {SERIES.map((s) => (
          <Bar key={s.key} dataKey={s.key} stackId="grav" fill={s.color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
