# Audit Cybersécurité — Bordeaux Mobility v1

**Score : 8.6 / 10 — ✅ PASS**

**Itération :** 1  
**Commit audité :** `39ece20`  
**Date :** 2026-05-30  
**Auditeur :** Cybersecurity Lead (agent `ac3330c6`)

---

## Scan coverage

| Outil | Version | Résultat |
|---|---|---|
| semgrep (p/javascript, p/secrets) | 8.30.1 | 0 finding |
| gitleaks (repo + dist/) | 0.70.0 | 0 secret |
| trivy fs (vuln + secret + misconfig) | — | 0 finding |
| checkov | 3.2.529 | 0 failed check |
| npm audit | — | 0 vuln high/critical |
| Revue manuelle | — | 6 findings |

---

## Findings

| id | file:line | severity | description | fix |
|---|---|---|---|---|
| F-01 | `api/datahub/[...path].js` | **Medium** | Le proxy serverless n'a aucune vérification d'origine ni authentification. Tout acteur externe connaissant l'URL Vercel peut effectuer des requêtes illimitées via la clé `DATAHUB_API_KEY`, entraînant une exhaustion du quota sans exfiltration de la clé. | Ajouter un header `Referer`/`Origin` allowlist, ou une clé partagée côté client (token secret dans les headers `Authorization`), ou restreindre via une Vercel middleware règle d'IP/auth. |
| F-02 | `vercel.json:9` | **Medium** | CSP `script-src 'unsafe-inline'` — les scripts inline sont autorisés, ce qui annule l'essentiel de la protection XSS fournie par le Content-Security-Policy. | Remplacer `'unsafe-inline'` par un nonce (`'nonce-...'`) généré à chaque requête, ou utiliser `'strict-dynamic'`. Pour une SPA Vite/React sans SSR, une solution pragmatique est d'utiliser `import()` dynamique ou de supprimer les scripts inline. |
| F-03 | `api/datahub/[...path].js` | **Low** | Aucune limitation de débit (rate limiting) sur le proxy. Combiné à F-01, permet un abus de quota sans friction. | Implémenter un rate-limit via Vercel Edge Middleware (ex. `@upstash/ratelimit`) ou via la configuration Vercel. |
| F-04 | `vercel.json:7,9` | **Low** | `X-Frame-Options: SAMEORIGIN` et CSP `frame-ancestors 'none'` sont contradictoires — XFO autorise l'embedding same-origin alors que CSP l'interdit. CSP prend la priorité dans les navigateurs modernes, mais l'incohérence prête à confusion. | Aligner en supprimant `X-Frame-Options` (redondant si CSP `frame-ancestors 'none'` est maintenu) ou en changeant XFO en `DENY`. |
| F-05 | `vite.config.js:18` | **Low** | La clé API est nommée `VITE_DATAHUB_API_KEY` en dev. Le préfixe `VITE_` signale à Vite d'injecter la variable dans le bundle client si elle est référencée via `import.meta.env.*`. Aucune fuite actuelle détectée (utilisée uniquement côté serveur proxy), mais convention à risque. | Renommer en `DATAHUB_API_KEY` (sans `VITE_`) et adapter `loadEnv` avec le prefix `''` (déjà fait) — ou au minimum documenter clairement que cette variable ne doit jamais être utilisée dans `src/`. |
| F-06 | `vercel.json` | **Low** | Header `Permissions-Policy` absent. Bonne pratique de durcissement pour désactiver les API navigateur non nécessaires (microphone, caméra, geolocation). | Ajouter `{ "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" }`. |

---

## Calcul du score

```
Score = 10 − Σ pénalités
       = 10 − (2 × 0.5) − (4 × 0.1)
       = 10 − 1.0 − 0.4
       = 8.6 / 10
```

**Verdict : ✅ PASS (≥ 8/10)**

---

## Points positifs

- **Clé API jamais exposée au client** : `DATAHUB_API_KEY` reste exclusivement dans l'environnement Vercel server-side ; le proxy scrub correctement la clé des messages d'erreur (`err.message.replace(key, '[redacted]')`).
- **Aucune vulnérabilité de dépendance** : `npm audit` 0 vuln high/critical sur 322 packages.
- **Aucun secret dans le dépôt ni dans les bundles dist/** (gitleaks propre).
- **Headers de base présents** : `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`.
- **Retry policy correcte** : exclut les erreurs 4xx, backoff linéaire — pas de risque d'amplification.
- **Pas de dangerouslySetInnerHTML** dans les composants React — pas de vecteur XSS DOM direct.
