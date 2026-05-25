#!/usr/bin/env node
// Smoke test des 31 endpoints DataHub.
// Lit la clé depuis .env (VITE_DATAHUB_API_KEY).
// Usage: node scripts/audit-datahub.mjs
//
// Exit 0 si tout OK, 1 si au moins un FAIL.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { REGISTRY } from '../src/datasets/registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Codes ANSI bruts (pas de chalk).
const C = { dim: '\x1b[2m', reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m' }

function readEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return {}
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eq = trimmed.indexOf('=')
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

function buildUrl(source, key) {
  if (source.type === 'datahub-geojson') {
    return `https://data.bordeaux-metropole.fr/geojson/features/${source.datahubId}?key=${key}`
  }
  if (source.type === 'opendatasoft') {
    return `https://opendata.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets/${source.datasetId}/exports/geojson`
  }
  throw new Error(`type de source non supporté: ${source.type}`)
}

function pad(s, n) { return String(s).padEnd(n) }

async function auditOne(entry, key, index, total) {
  const url = buildUrl(entry.source, key)
  const t0 = Date.now()
  const prefix = `[${String(index).padStart(2)}/${total}] ${pad(entry.id, 28)}`
  try {
    const res = await fetch(url)
    const ms = Date.now() - t0
    if (!res.ok) {
      console.log(`${prefix} ${C.red}FAIL${C.reset}  HTTP ${res.status}  ${C.dim}${ms} ms${C.reset}`)
      return { id: entry.id, ok: false, empty: false }
    }
    const json = await res.json()
    const features = json?.features?.length ?? 0
    const sizeKB = (JSON.stringify(json).length / 1024).toFixed(1)
    if (features === 0) {
      console.log(`${prefix} ${C.yellow}OK  ${C.reset}  ${pad(`${ms} ms`, 7)}  ${pad(features, 5)} features  ${pad(`${sizeKB} KB`, 8)}  ${C.yellow}⚠ empty${C.reset}`)
      return { id: entry.id, ok: true, empty: true }
    }
    console.log(`${prefix} ${C.green}OK  ${C.reset}  ${pad(`${ms} ms`, 7)}  ${pad(features, 5)} features  ${pad(`${sizeKB} KB`, 8)}`)
    return { id: entry.id, ok: true, empty: false }
  } catch (err) {
    const ms = Date.now() - t0
    console.log(`${prefix} ${C.red}FAIL${C.reset}  ${err.message}  ${C.dim}${ms} ms${C.reset}`)
    return { id: entry.id, ok: false, empty: false }
  }
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function main() {
  const env = readEnv()
  const key = process.env.VITE_DATAHUB_API_KEY || env.VITE_DATAHUB_API_KEY
  if (!key) {
    console.error(`${C.red}Erreur : VITE_DATAHUB_API_KEY introuvable (cherchée dans process.env et .env)${C.reset}`)
    process.exit(2)
  }

  const datahubEntries = REGISTRY.filter((e) => e.source.type === 'datahub-geojson')
  console.log(`${C.cyan}DataHub audit · ${new Date().toISOString()}${C.reset}\n`)

  const t0 = Date.now()
  const results = []
  for (let i = 0; i < datahubEntries.length; i++) {
    results.push(await auditOne(datahubEntries[i], key, i + 1, datahubEntries.length))
    await sleep(200) // rate-limit poli
  }

  const okCount = results.filter((r) => r.ok).length
  const failCount = results.filter((r) => !r.ok).length
  const emptyCount = results.filter((r) => r.empty).length
  const totalSec = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`\n${C.dim}─────────────────────────────────────${C.reset}`)
  console.log(`${okCount}/${results.length} OK · ${failCount > 0 ? C.red : ''}${failCount} FAIL${C.reset} · ${emptyCount} EMPTY · ${totalSec} s total`)
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(`${C.red}Erreur fatale : ${err.message}${C.reset}`)
  process.exit(2)
})
