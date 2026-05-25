import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Diagramme en barres : nombre de features retenues par jeu de données actif.
export default function FeaturesByDatasetChart({ data }) {
  if (data.length === 0) {
    return <p className="state-msg">Aucun jeu de données actif</p>
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="libelle" width={140} />
        <Tooltip />
        <Bar dataKey="count" fill="#1e3a5f" name="Features" />
      </BarChart>
    </ResponsiveContainer>
  )
}
