# AGENTS.md — CV Inspector

> Assistant IA de pré-sélection de CV (marché français). Guide de référence pour tout agent travaillant sur ce repo.
> Ce document est la source de vérité (single source of truth) pour les agents IA de ce repo.

## Vue d'ensemble

- **Produit** : « CV Inspector » — assistant IA pour l'élagage et l'analyse préliminaire des candidatures (recruteurs français).
- **Stack** : monorepo pnpm + Turborepo — `backend/` (Node.js + Express + TypeScript) + `frontend/` (Next.js 15 + React 19 + Tailwind 4).
- **LLM** : GPT-5.5 via l'API OpenAI officielle (Responses API, client `openai`).
- **Persistance** : MongoDB Atlas (mongoose 8) avec repli automatique en mémoire si Atlas est injoignable.
- **Langue** : interface et analyse en français ; conformité RGPD ; CV au format français.
- **Choix d'architecture assumé** : pipeline « extraire puis analyser » (orchestrator-worker), **pas de RAG** — un CV tient intégralement dans le contexte LLM, le retrieval n'apporterait rien.
- **Dépôt** : `github.com/laurentknauss/agentrecruteur` (**public**, revue CTO) — branche par défaut `main` protégée.

## Commandes

Depuis la racine du monorepo (`pnpm` obligatoire) :

| Commande | Rôle |
|---|---|
| `pnpm install` | Installer les dépendances (workspace) |
| `pnpm --filter backend run dev` | Backend API sur `:3001` (tsx) |
| `pnpm --filter frontend run dev` | Frontend Next.js sur `:3000` |
| `pnpm --filter backend run typecheck` | Typecheck backend (tsgo / TS 7) |
| `pnpm --filter backend run test:pdf` | Test extraction PDF |
| `node backend/testOrchestrator.js` | Test du pipeline complet |

## Architecture

```
PDF (upload) → extraction pdf2json → StructuringWorker (PDF→JSON)
  → SkillsAnalysisWorker → ExperienceWorker → ScreeningWorker → MatchingWorker (option)
  → CandidateRepository (Mongo Atlas | mémoire) → API Express → Frontend Next.js
```

- **Orchestrateur** : `backend/src/orchestrator/recruitingOrchestrator.js` (LangChain RunnableSequence).
- **Workers** : `backend/src/workers/` (structuringWorker, comprehensiveResumeAnalyzer).
- **Stockage** : interface `CandidateRepository` dans `backend/src/store.ts` ; implémentations :
  - `database/mongoCandidateStore.ts` — persistant (Atlas)
  - `store.ts` (in-memory) — fallback
  - Sélection au démarrage dans `server.ts` (`initStorage()`), exposée par `GET /health` (`storage`).
- **API** : `POST /api/upload-cv`, `POST /api/candidate/:id/ask`, `GET /api/candidates`, `GET /api/candidate/:id`, `DELETE /api/candidate/:id`, `GET /health`.

## Configuration (jamais commitée)

Variables requises dans `backend/.env` (et `.env` racine) :

```
OPENAI_API_KEY=…            # https://platform.openai.com/api-keys
GPT_MODEL=gpt-5.5           # optionnel, défaut : gpt-5.5
MONGODB_ATLAS_URI=…          # mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/
MONGODB_DATABASE=cv-inspector
```

Règles de sécurité :
- **Jamais** de credentials dans les fichiers trackés (`.env` est dans `.gitignore`).
- Tout secret exposé dans un fichier tracké doit être purgé **et** révoqué côté fournisseur.

## GitHub & workflow (process imposé — 2026-09-07)

- Remote : `origin → git@github.com:laurentknauss/agentrecruteur.git` — **repo public**.
- Branche `main` **protégée** : toute modif passe par une **Pull Request** + checks verts obligatoires : `Secret Scan`, `Typecheck (tsgo)`, `Build Frontend (Next.js)` (strict = branche à jour). Force-push et suppression de `main` interdits.
- CI GitHub Actions (`.github/workflows/ci.yml`, sur push & PR) : scan secrets (bloquant) → typecheck tsgo (backend+frontend) → build Next ; `pnpm audit` **informatif** (`continue-on-error`).
- Hooks Husky locaux : `pre-commit` = scan secrets (diff indexé) ; `pre-push` = scan secrets + typecheck tsgo + build Next + audit (non bloquant). Scanner : `node scripts/scan-secrets.mjs [--staged]`.
- **Aucun déploiement automatique en CI** — déploiement VPS manuel (build local → rsync → systemd), cf. `deploy/README.md`.
- Mode démo par défaut : `DEMO_LOCK=1` coupe les endpoints LLM (403) → zéro coût OpenAI en public.

### Workflow imposé aux agents IA

1. Toujours une branche : `git checkout -b feat/…`
2. Commits (hooks pre-commit/pre-push actifs — ne pas les contourner).
3. `git push origin feat/…` puis `gh pr create --fill`.
4. Attendre les checks verts puis `gh pr merge --squash --delete-branch` (0 review requise).

## État actuel (2026-09-07)

### ✅ Fait
- Migration `MongoCandidateStore` complète : CRUD, handlers API async, sélection au démarrage avec dégradation gracieuse.
- Typecheck TS 7 (tsgo) vert (`module: node16`, `moduleResolution: node16`).
- Credentials purgés du CLAUDE.md (supprimé) — jamais commités dans l'historique.
- **Repo GitHub public créé** (`agentrecruteur`) — historique secret-free vérifié ; README réécrit pour lectorat CTO.
- **CI + Husky + protection de branche `main`** (PR + checks verts) — voir section GitHub ci-dessus.
- **Mode démo vitrine** : `DEMO_LOCK=1` + header « Sign up / Login » (modal contact, aucune auth).
- **DNS** : zone `agentrecruteur.fr` créée chez DigitalOcean (via doctl) — A `@` + A `www` → 209.38.207.109 ; NS basculés chez GoDaddy vers ns1/ns2/ns3.digitalocean.com (propagation en cours).
- Docs déploiement VPS : `deploy/README.md`, `deploy/Caddyfile.agentrecruteur.example`, checklist `TODO.md`.

### ⚠️ À faire
- **Déploiement VPS** : Caddy + systemd + rsync (build local) — cf. `deploy/README.md` + `TODO.md` (convergence NS incluse).
- **Provisions** : cluster Atlas M0 + `OPENAI_API_KEY` pour sortir du mode démo (retirer `DEMO_LOCK`).
- Audit outil non bloquant : vulns transitives (Next→postcss, unpdf→canvas→tar) ; montées mineures (Next 16, LangChain 0.5) évaluées plus tard.

## Prochaines évolutions (non prioritaires pour la démo)

- Support multi-recruteurs / multi-sessions (historique par utilisateur) — auth sur invitation.
- Analytics avancés : scoring et comparaison de candidats.
- Recherche full-text sur les CV via les index textes déjà déclarés (`profile.name`, `profile.skills`).
