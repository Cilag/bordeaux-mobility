import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

// data: [{ commune, offre, demande, ratio }, ...] trié par ratio desc
// offre = places de stationnement (np_total cumulé) par commune
// demande = nombre de carrefours à feux (proxy de densité du réseau routier)
// ratio = offre / demande (plus c'est élevé, plus la commune a de l'offre relativement à son trafic)
export default function SupplyDemandChart({ data }) {
  if (!data.length) return <p className="state-msg">Données insuffisantes pour calculer l'offre / demande.</p>
  const height = Math.max(280, data.length * 32 + 60)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8EE" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#5A6B7D' }} tickFormatter={(v) => v.toLocaleString('fr-FR')} />
        <YAxis type="category" dataKey="commune" width={150} tick={{ fontSize: 11, fill: '#1F2933' }} />
        <Tooltip
          cursor={{ fill: '#F1F4F7' }}
          labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
          formatter={(v, name) => {
            if (name === 'offre') return [`${v.toLocaleString('fr-FR')} places`, 'Offre stationnement']
            if (name === 'demande') return [`${v} carrefours`, 'Densité routière (proxy)']
            return [v, name]
          }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return (
              <div style={{ background: '#fff', border: '1px solid #d4d4d8', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: '#1E3A5F', marginBottom: 4 }}>{label}</div>
                <div style={{ color: '#1E3A5F' }}>● Offre : {p.offre.toLocaleString('fr-FR')} places</div>
                <div style={{ color: '#C0772A' }}>● Demande (proxy) : {p.demande} carrefours</div>
                <div style={{ color: '#5A6B7D', marginTop: 4 }}>Ratio : {p.ratio.toFixed(1)} places/carrefour</div>
              </div>
            )
          }}
        />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="offre" stackId="a" fill="#1E3A5F" name="Offre (places)" />
        <Bar dataKey="demande" stackId="b" fill="#C0772A" name="Demande (carrefours)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
