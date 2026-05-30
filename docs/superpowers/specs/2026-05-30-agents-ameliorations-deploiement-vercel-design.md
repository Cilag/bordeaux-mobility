# Spec — Équipe d'agents → améliorations bordeaux-mobility → déploiement Vercel

Date : 2026-05-30
Statut : validé (design approuvé par l'utilisateur)

## Contexte

`bordeaux-mobility` est un dashboard React 19 / Vite (mobilité & stationnement
Bordeaux Métropole). Les données open-data sont consommées via un proxy
serverless (`api/datahub/[...path].js`) qui garde la clé `DATAHUB_API_KEY` côté
serveur. Le projet est déjà avancé : routing dashboard, carte Leaflet, charts
Recharts, TanStack Query, ~38 fichiers de tests, `vercel.json` configuré.

Remote GitHub : `Cilag/bordeaux-mobility`. Déploiement cible : Vercel.

### État de la baseline (mesuré le 2026-05-30)

- `npm run build` : **OK**.
- `npx vitest run` : 163 passent / 6 échouent — mais les 6 échecs proviennent
  d'un **worktree git abandonné** (`.claude/worktrees/magical-sinoussi-e9de43/`)
  que vitest scanne encore. Le code applicatif réel est sain. → point de
  nettoyage, pas un bug applicatif.

## Objectif

Faire auditer le projet par l'équipe de personas (PAPERCLISERVER), implémenter
un **lot borné** d'améliorations prioritaires, vérifier, puis déployer sur
Vercel via l'outil direct (`deploy_to_vercel`).

Axes d'amélioration retenus par l'utilisateur :
1. Corriger bugs / fiabilité des données (charts vides, datasets, proxy).
2. Design / UX (lisibilité, responsive, ergonomie).
3. Audit puis les agents proposent eux-mêmes la liste priorisée.

## Non-objectifs (YAGNI)

- Pas de réécriture ni de nouvelle feature majeure.
- Pas de persona « réseau » dédié (peu de valeur sur une app web → fondu dans cloud).
- Pas de push GitHub : le déploiement se fait via l'outil Vercel direct. Les
  commits restent locaux.
- Pas de traitement des findings P2 (différés).

## Architecture de l'orchestration

Workflow multi-agents piloté manuellement (l'utilisateur reste dans la boucle
entre les phases).

### Phase 0 — Préparation (inline)

- Déployer les 7 personas dans `bordeaux-mobility1/.claude/agents/` via
  `scripts/deploy.ps1` (PAPERCLISERVER).
- Capturer la baseline build + tests (cf. ci-dessus).

### Phase 1 — Audit (fan-out parallèle)

Un persona = une dimension. Chaque agent rend un rapport **structuré**
(findings : titre, sévérité P0/P1/P2, fichiers concernés, recommandation).

- **web / frontend** : UX/design, responsive, charts vides, chargement données React.
- **cloud** : `vercel.json`, proxy serverless `api/datahub`, env `DATAHUB_API_KEY`, config build.
- **devops / sre** : tests, qualité, perf build, worktree mort.
- **security** : headers de sécurité, fuite de clé côté client, audit deps.

### Phase 2 — Synthèse (tech-lead)

Déduplique et priorise les findings en backlog **P0 / P1 / P2**.

### Phase 3 — Implémentation

Traiter **P0 + P1 uniquement** (lot borné). Édition séquentielle sur le repo,
commits atomiques par item.

### Phase 4 — Revue + vérification

Revue adversariale des changements → corrections.

**Gate dur avant déploiement** : `npm run build` OK **ET** `npx vitest run` vert.

### Phase 5 — Déploiement Vercel

- Déploiement via `deploy_to_vercel` (outil direct).
- `DATAHUB_API_KEY` fournie côté serveur (jamais exposée au client).
- Retour de l'URL d'aperçu + smoke test : carte peuplée, clé non exposée dans
  le réseau/les chunks JS, headers de sécurité présents.

## Flux de données

```
personas (audit) ──► rapports structurés
        │
        ▼
   tech-lead (synthèse) ──► backlog P0/P1/P2
        │
        ▼ (P0+P1)
   implémentation ──► commits locaux
        │
        ▼
   revue + build + tests (gate)
        │
        ▼ (vert)
   deploy_to_vercel ──► URL + smoke test
```

## Gestion d'erreur

- **Build cassé ou tests rouges** → on ne déploie pas. Remontée du rapport
  d'audit + état partiel à l'utilisateur.
- **DataHub down** → le proxy renvoie 502, le client dégrade (déjà géré). Non
  bloquant pour le déploiement.
- **Persona qui échoue en audit** → son rapport est traité comme vide ;
  l'orchestration continue avec les autres dimensions.

## Critères de succès

1. Worktree mort retiré du scope de test ; `npx vitest run` vert.
2. `npm run build` OK.
3. Findings P0 + P1 traités et vérifiés.
4. Déploiement Vercel réussi, URL fonctionnelle, clé non exposée, headers de
   sécurité présents.
