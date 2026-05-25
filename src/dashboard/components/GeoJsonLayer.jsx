import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'

// ----------------- Vocabulaire métier (lisible) -----------------

// Libellés français pour les champs techniques rencontrés dans les jeux DataHub
// / Opendatasoft. Si un champ ne figure pas ici, on dégrade en remplaçant les
// underscores par des espaces.
const LABELS = {
  // Dates
  mdate: 'Dernière mise à jour', cdate: 'Création',
  date_debut: 'Début', date_fin: 'Fin', debut: 'Début', fin: 'Fin',
  datedebut: 'Début', datefin: 'Fin', datetime: 'Date',
  an: 'Année', annee: 'Année', an_serv: 'Mise en service',
  // Identification
  nom: 'Nom', libelle: 'Libellé', ident: 'Identifiant',
  adresse: 'Adresse', localisation: 'Localisation',
  commune: 'Commune', insee: 'Code INSEE', code_commune: 'Code commune', code_postal: 'Code postal',
  nom_com: 'Commune', nom_voie: 'Voie', sens_cir: 'Sens',
  type: 'Type', description: 'Description', url: 'Lien',
  // Trafic / comptage
  mjo_val: 'Trafic moyen jour ouvrable', mjo: 'Trafic moyen (%)',
  hpm_val: 'Trafic pointe matin', hpm: 'Pointe matin (%)',
  hps_val: 'Trafic pointe soir', hps: 'Pointe soir (%)',
  pl_val: 'Poids lourds', pl: 'Poids lourds (%)',
  vit_val: 'Vitesse moyenne', vit_evo: 'Évolution vitesse',
  v85_vl: 'Vitesse 85e percentile VL', v85_pl: 'Vitesse 85e percentile PL',
  comptage_1h: 'Passages / heure', comptage_5m: 'Passages / 5 min',
  // Parkings
  total: 'Capacité totale', np_total: 'Places totales', np_global: 'Capacité globale',
  np_pr: 'Places parc-relais', np_pmr: 'Places PMR',
  np_2rmot: 'Places 2-roues motorisés', np_2rele: 'Places 2-roues électriques',
  np_velec: 'Places véhicules électriques', np_veltot: 'Places vélo', np_velec_total: 'Places EV total',
  np_covoit: 'Places covoiturage', np_mobalt: 'Places mobilités alternatives',
  np_stlav: 'Places lavage', np_hginf: 'Hauteur min.', np_hgsup: 'Hauteur max.',
  np_fourr: 'Places fourrière', nb_niv: 'Nombre de niveaux',
  gabari_std: 'Gabarit standard', gabari_max: 'Gabarit maximal',
  exploit: 'Exploitant', propr: 'Propriétaire', typgest: 'Type de gestion',
  etat: 'État', libres: 'Places libres', prepaye: 'Prépayé', connecte: 'Connecté',
  titul: 'Titulaire', ta_titul: 'Tarif titulaire', ta_ntitul: 'Tarif non-titulaire',
  th_quar: 'Tarif horaire 1/4 h', th_demi: 'Tarif horaire 1/2 h',
  th_heur: 'Tarif horaire', th_2: 'Tarif 2 h', th_3: 'Tarif 3 h', th_4: 'Tarif 4 h',
  th_10: 'Tarif 10 h', th_24: 'Tarif 24 h', th_nuit: 'Tarif nuit',
  ta_resmoi: 'Abonnement mensuel résident', ta_nres7j: 'Forfait 7 jours non-résident',
  ta_moimot: 'Abonnement mensuel moto', ta_moivel: 'Abonnement mensuel vélo',
  ta_type: 'Type de tarif', ta_handi: 'Tarif PMR', tv_1h: 'Tarif vélo 1 h',
  secteur: 'Secteur',
  // IRVE
  prise_type_ef: 'Prise E/F', prise_type_2: 'Prise Type 2',
  prise_type_combo: 'Combo CCS', prise_type_chademo: 'CHAdeMO',
  prise_type_3c: 'Prise Type 3C', prise_type_autre: 'Autre prise',
  puiss_max: 'Puissance max (kW)', nbpdc: 'Nb points de charge',
  accessibilite: 'Accessibilité', gratuit: 'Gratuit',
  // Accidents
  grav: 'Gravité', catv: 'Véhicule', catu: 'Usager',
  col: 'Type de collision', lum: 'Luminosité', atm: 'Météo',
  agg: 'Agglomération', int: 'Intersection',
  nbv: 'Nombre de voies', surf: 'État de la chaussée', circ: 'Circulation',
  catr: 'Catégorie de route', plan: 'Tracé', prof: 'Profil', infra: 'Infrastructure', situ: 'Situation',
  an_nais: 'Année de naissance', sexe: 'Sexe',
  secu1: 'Équipement de sécurité', actp: 'Action piéton', etatp: 'État piéton',
  trajet: 'Motif du trajet', choc: 'Point de choc', manv: 'Manœuvre',
  obsm: 'Obstacle mobile', place: 'Place du véhicule',
  num_acc: "N° d'accident", num_veh: 'N° de véhicule',
  // Voirie / réseau
  typamena: "Type d'aménagement",
  alias_nature_n1: 'Type', alias_nature_n2: 'Détail',
  type_emprise: "Type d'emprise", localisation_emprise: "Emprise",
  zone: 'Zone',
  // VCub
  nbvelos: 'Vélos disponibles', nbplaces: 'Places libres',
  nbelec: 'Vélos électriques', nbclassiq: 'Vélos classiques',
  // Arrêts / SAEIV
  vehicule: 'Mode de transport',
  // Arceaux et autres dénombrements
  typologie: 'Typologie', nombre: 'Nombre',
}

// Champs purement techniques — masqués dans la popup.
const HIDDEN_FIELDS = new Set([
  'gid', 'objectid', 'fid', 'gml_id', 'gid_acte', 'gid_emprise',
  'geo_point_2d', 'geo_shape', 'geo_shape_type', 'coordonnees',
  'geom_o', 'geom_err', 'geom',
  'reg_code', 'reg_name', 'dep_code', 'dep_name', 'epci_code', 'epci_name', 'com_name',
  'year_georef', 'dep', 'com', 'mois', 'jour', 'hrmn',
  // Codes redondants (les alias_* sont déjà affichés en clair)
  'nature_n1', 'nature_n2',
  // Identifiants techniques internes
  'numordre', 'groupe', 'source', 'actif',
  // Identifiant interne du jeu (déjà partiellement couvert par 'ident' mais souvent inutile)
])

// Champs date prioritaires (affichés en premier).
const DATE_FIELDS = new Set([
  'mdate', 'cdate', 'date_debut', 'date_fin', 'debut', 'fin',
  'datedebut', 'datefin', 'datetime', 'an', 'annee', 'an_serv',
])

// Champs identifiants — affichés en premier, en gras.
const HEADER_FIELDS = ['nom', 'libelle', 'adresse', 'localisation', 'nom_voie', 'description']

function formatDateValue(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number' && v >= 1900 && v <= 2200) return String(v)
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('fr-FR')
  }
  return s
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function labelize(k) {
  if (LABELS[k]) return LABELS[k]
  // Repli : remplace les underscores par des espaces, met la première lettre en capitale.
  return k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function isHidden(key) {
  if (HIDDEN_FIELDS.has(key)) return true
  if (/^rg_/.test(key)) return true
  return false
}

function isMeaninglessValue(v) {
  if (v == null || v === '') return true
  if (v === -1 || v === '-1') return true
  if (typeof v === 'string') {
    const low = v.trim().toLowerCase()
    if (['inconnu', 'non renseigne', 'non renseigné', 'nr', 'na', 'n/a'].includes(low)) return true
  }
  return false
}

function isBooleanLike(v) {
  return typeof v === 'boolean' || v === 'true' || v === 'false' || v === 'oui' || v === 'non' || v === 'Oui' || v === 'Non'
}

function isTruthy(v) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const low = v.trim().toLowerCase()
    return low === 'true' || low === 'oui' || low === '1'
  }
  return Boolean(v)
}

function formatValue(v) {
  if (typeof v === 'number') return v.toLocaleString('fr-FR')
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return s.length > 100 ? s.slice(0, 97) + '…' : s
}

function buildPopup(libelle, properties) {
  if (!properties) return `<div style="font-weight:600;color:#1F2933">${escapeHtml(libelle)}</div>`

  // Entrées d'identification (nom, adresse…) — affichées en bandeau d'en-tête.
  const headerLines = []
  for (const key of HEADER_FIELDS) {
    const v = properties[key]
    if (!isMeaninglessValue(v)) headerLines.push(escapeHtml(String(v)))
  }
  const headerHtml = headerLines.length
    ? `<div style="margin-bottom:6px;font-size:11.5px;color:#3A4554">${headerLines.join(' · ')}</div>`
    : ''

  // Dates (toutes celles présentes).
  const dateLines = []
  for (const key of DATE_FIELDS) {
    const v = properties[key]
    if (isMeaninglessValue(v)) continue
    dateLines.push(`<div><span style="color:#5C6B7A">${escapeHtml(labelize(key))}</span> : <strong>${escapeHtml(formatDateValue(v))}</strong></div>`)
  }
  const dateBanner = dateLines.length
    ? `<div style="background:#F1F4F7;border-left:3px solid #1E3A5F;padding:4px 8px;border-radius:3px;margin-bottom:6px;font-size:11px">${dateLines.join('')}</div>`
    : ''

  // Autres propriétés.
  const skip = new Set([...HEADER_FIELDS, ...DATE_FIELDS])
  const positiveBools = []
  const otherEntries = []
  for (const [k, v] of Object.entries(properties)) {
    if (skip.has(k) || isHidden(k) || isMeaninglessValue(v)) continue
    if (isBooleanLike(v)) {
      if (isTruthy(v)) positiveBools.push(labelize(k))
      // Booléens « false » : on les masque (absence d'info).
      continue
    }
    otherEntries.push([k, v])
  }

  // Affichage des propriétés positives en chips groupées (utile pour IRVE).
  const boolHtml = positiveBools.length
    ? `<div style="margin-bottom:6px;display:flex;flex-wrap:wrap;gap:3px">${
        positiveBools.map((b) => `<span style="background:#2C8C5C22;color:#2C8C5C;border-radius:8px;padding:1px 6px;font-size:10.5px">✓ ${escapeHtml(b)}</span>`).join('')
      }</div>`
    : ''

  const linesHtml = otherEntries
    .slice(0, 10)
    .map(([k, v]) => `<div><span style="color:#5C6B7A">${escapeHtml(labelize(k))}</span> : ${escapeHtml(formatValue(v))}</div>`)
    .join('')

  // Si la popup ne contient que le titre + nom, ajouter un petit hint.
  const body = dateBanner + boolHtml + linesHtml
  const hint = !body ? '<div style="color:#9AA5B1;font-size:10.5px">Aucune information complémentaire renseignée.</div>' : ''

  return `<div style="font-family:system-ui;font-size:12px;max-width:300px">
    <div style="font-weight:600;color:#1F2933;margin-bottom:4px">${escapeHtml(libelle)}</div>
    ${headerHtml}
    ${body}
    ${hint}
  </div>`
}

// Rend les features d'un jeu (point/ligne/polygone). La prop `key` du parent
// doit changer quand les données changent, car <GeoJSON> ne re-rend pas seul.
export default function GeoJsonLayer({ features, color = '#1e3a5f', libelle = '', weight = 2, radius = 5 }) {
  if (!features || features.length === 0) return null
  const filtered = features.filter((f) => f.geometry) // exclut features sans géométrie
  if (filtered.length === 0) return null
  const data = { type: 'FeatureCollection', features: filtered }
  return (
    <GeoJSON
      data={data}
      style={{ color, weight, fillColor: color, fillOpacity: 0.15 }}
      pointToLayer={(feature, latlng) =>
        L.circleMarker(latlng, { radius, color, fillColor: color, fillOpacity: 0.7, weight: 1.5 })}
      onEachFeature={(feature, layer) => {
        layer.bindPopup(buildPopup(libelle, feature.properties))
      }}
    />
  )
}
