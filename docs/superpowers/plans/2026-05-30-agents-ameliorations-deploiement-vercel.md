# Plan — Mission Paperclip : améliorations bordeaux-mobility → déploiement Vercel

> **For agentic workers:** mission confiée à l'équipe Paperclip (serveur MSI) via
> l'API REST. Ce plan décrit ce que MOI (Claude, control plane Windows) je fais
> pour préparer, lancer et suivre la mission — PAS du TDD local.

**Goal :** faire améliorer le dashboard bordeaux-mobility par l'équipe d'agents
Paperclip (audit → corrections P0/P1 → re-audit Cyber /10), puis déployer sur
Vercel depuis le MSI.

**Architecture :** les agents tournent sur le MSI (`192.168.1.16`), pilotés via
l'API Paperclip (`http://127.0.0.1:3100/api`, company "Guigui Lab"). On poste UNE
issue de mission au CEO ; il délègue en cascade (CTO → Web Lead / Infra Lead /
Cybersecurity Lead → spécialistes). Le code arrive sur le MSI via `git clone`
depuis GitHub (`Cilag/bordeaux-mobility`). Déploiement Vercel par l'Infra Lead.

**Tech Stack :** Paperclip API, SSH vers MSI, GitHub (compte Cilag déjà auth sur
MSI), Node 20 / npm 10 (nvm, login shell), Vercel CLI via `npx` + token.

## Metadata

- **Spec :** [../specs/2026-05-30-agents-ameliorations-deploiement-vercel-design.md](../specs/2026-05-30-agents-ameliorations-deploiement-vercel-design.md)
- **CEO agent id :** `eafb79a9-f7f0-4d8b-b28d-af5d8d949f51`
- **Company id (Guigui Lab) :** `f7e677f1-a742-4876-a930-b6ac9c0ff13c`
- **API :** `http://127.0.0.1:3100/api` (depuis le MSI uniquement)
- **SSH :** `ssh -i ~/.ssh/paperclip_msi guigui@192.168.1.16`
- **post-issue :** `scripts/test/post-issue.js <descFile> <title> <assigneeId> [status] [priority]` (à exécuter SUR le MSI)

### Org Paperclip (ids résolus le 2026-05-30)

| Rôle | id |
|------|-----|
| CEO | eafb79a9-f7f0-4d8b-b28d-af5d8d949f51 |
| CTO (Tech Lead) | 0a9766a6-90f7-494d-8674-270a267f5501 |
| Web Lead | c335b267-51f3-43c4-9040-8e18206533ff |
| Infra Lead | ba74f5ad-89fe-4ff9-bc5c-b4dc42dbdce7 |
| Cybersecurity Lead | ac3330c6-87d0-49d1-9850-3d63eb4a6c60 |
| Frontend / Backend / QA | 70ac348d… / 7694ffc7… / f542916a… |

## Décisions utilisateur

- Objectif : **améliorer puis déployer** (bugs/données + UX + audit-driven).
- Code → MSI : **push GitHub d'abord**, les agents clonent.
- Déploiement : **Infra Lead sur le MSI**, avec **token Vercel fourni par l'utilisateur**.

---

## Phase 0 : Préparation (control plane — moi)

### Task 0.1 : Pousser le code à jour sur GitHub
- [ ] Vérifier l'état git local (le commit de spec `08d89a2` n'est pas poussé).
- [ ] `git push origin main` depuis `C:\Users\ozoux\bordeaux-mobility1`.
- [ ] Verify : `git ls-remote origin HEAD` == HEAD local.

### Task 0.2 : Poser le token Vercel sur le MSI
- [ ] Créer `~/.config/paperclip/vercel.env` sur le MSI : `VERCEL_TOKEN=<token>`.
- [ ] `chmod 600` ; vérifier qu'il n'est PAS dans un dossier git.
- [ ] Verify : `ssh … 'test -f ~/.config/paperclip/vercel.env && echo OK'`.

### Task 0.3 : Rédiger le brief de mission
- [ ] Écrire `scripts/test/bordeaux-mobility-kickoff.md` (brief complet, cf. structure ci-dessous).
- [ ] Copier le brief sur le MSI (scp).

---

## Phase 1 : Lancer la mission

### Task 1.1 : Poster l'issue de mission au CEO
- [ ] Sur le MSI : `node ~/work/_bootstrap/post-issue.js <kickoff.md> "Améliorations bordeaux-mobility + déploiement Vercel" eafb79a9-f7f0-4d8b-b28d-af5d8d949f51 todo high`.
- [ ] Verify : la commande renvoie `created: GUI-XX … assignee=eafb79a9`.

---

## Phase 2 : Suivi de la mission (control plane — moi)

### Task 2.1 : Suivre l'avancement
- [ ] Poller les issues/sous-issues via l'API (`/companies/<cid>/issues`) et l'état du repo sur le MSI.
- [ ] Vérifier que la délégation a bien lieu (Tech Lead crée ≥2 sous-issues parallèles : Web Lead + Infra Lead ; pas de « L2=0 »).
- [ ] Remonter l'avancement à l'utilisateur aux jalons (audit v1, corrections, note ≥8, deploy).

---

## Contenu du brief de mission (scripts/test/bordeaux-mobility-kickoff.md)

Le brief confié au CEO devra contenir :

1. **Contexte projet** : dashboard React 19 / Vite (mobilité & stationnement
   Bordeaux Métropole), proxy serverless `api/datahub/[...path].js` qui garde
   `DATAHUB_API_KEY` côté serveur, déjà ~38 fichiers de tests, `vercel.json`
   configuré. Repo `https://github.com/Cilag/bordeaux-mobility.git`.

2. **Setup attendu** : cloner dans `/home/guigui/work/bordeaux-mobility`,
   `npm ci`, `npm run build`, `npx vitest run` pour établir la baseline.

3. **Baseline connue** : 6 tests « échouent » à cause d'un worktree mort
   `.claude/worktrees/magical-sinoussi-e9de43/` scanné par vitest — à exclure /
   nettoyer, ce n'est pas un bug applicatif.

4. **Axes d'amélioration (P0/P1 d'abord)** :
   - Fiabilité données & charts (charts vides, chargement React Query).
   - Polish UX / responsive / lisibilité.
   - Hygiène qualité (tests verts, lint) et sécu (headers, pas de fuite de clé, `npm audit`).

5. **Boucle qualité (cœur de la mission)** : Web Lead découpe en ownership
   non-chevauchant → Frontend/Backend/QA codent → Web Lead crée une sous-issue
   d'audit DIRECTE au Cybersecurity Lead → audit tooling-first noté **/10**
   (Critical −4, High −2, Medium −0.5, Low −0.1 ; plancher 0) dans
   `docs/security/audit-vN.md` → si < 8 : correction par l'owner + re-audit
   incrémental, max 3 itérations puis escalade au Tech Lead.

6. **Gate de déploiement** : `npm run build` OK ET `npx vitest run` vert ET note
   Cyber ≥ 8/10 AVANT tout déploiement.

7. **Déploiement (Infra Lead)** : `source ~/.config/paperclip/vercel.env` puis
   `npx vercel --prod --yes --token=$VERCEL_TOKEN` depuis le repo cloné. Fournir
   `DATAHUB_API_KEY` comme env Vercel de production (jamais exposée au client).
   Smoke test : `/dashboard/mobilite` peuplé, clé absente du réseau/chunks JS,
   headers `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` présents.

8. **Exigences de cohérence** : un fichier = un owner ; la Cyber n'édite jamais
   le code applicatif ; livrable final sur `main`, un seul jeu cohérent ; push
   sur `Cilag/bordeaux-mobility`.

9. **Critères de succès** :
   - [ ] Tech Lead a créé ≥2 sous-issues parallèles (Web + Infra).
   - [ ] Web Lead a délégué à Frontend/Backend/QA (fichiers distincts).
   - [ ] Sous-issue d'audit Web Lead → Cyber Lead (handoff direct).
   - [ ] `docs/security/audit-v1.md` avec note /10 + findings.
   - [ ] Si v1 < 8 : ≥1 itération + `audit-v2.md` note qui remonte.
   - [ ] Note finale ≥ 8/10 (ou escalade documentée).
   - [ ] Build + tests verts.
   - [ ] Déploiement Vercel en ligne, URL renvoyée, clé non exposée, headers présents.

---

## Verification (end-to-end)

1. Code à jour sur GitHub ; token Vercel posé sur le MSI (Phase 0).
2. Issue de mission créée et assignée au CEO (Phase 1).
3. Délégation en cascade observée ; pas de « L2=0 » (Phase 2).
4. Audit Cyber /10 ≥ 8 ; build + tests verts.
5. URL Vercel fonctionnelle, clé non exposée, headers de sécurité présents.
