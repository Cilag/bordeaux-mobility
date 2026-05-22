import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// Diagramme générique barres horizontales.
// data: [{ [labelKey]: '...', [valueKey]: n }, ...] (déjà trié/limité par l'appelant)
// formatter / tooltipFormatter pour les nombres ; valueLabel pour le tooltip.
export default function HorizontalBarChart({
  data, labelKey, valueKey,
  color = '#1E3A5F', valueLabel = '',
  formatter = (v) => v?.toLocaleString?.('fr-FR') ?? v,
  tooltipFormatter,
}) {
  if (!data?.length) return <p className="state-msg">Aucune donnée à afficher.</p>
  const height = Math.max(240, data.length * 26 + 60)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8EE" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#5A6B7D' }} tickFormatter={formatter} />
        <YAxis type="category" dataKey={labelKey} width={170} tick={{ fontSize: 11, fill: '#1F2933' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          formatter={(v, name, ctx) =>
            tooltipFormatter ? tooltipFormatter(v, ctx?.payload) : [formatter(v), valueLabel]
          }
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
        />
        <Bar dataKey={valueKey} fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
