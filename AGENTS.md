# AGENTS.md — CV Inspector

> Assistant IA de pré-sélection de CV (marché français). Guide de référence pour tout agent travaillant sur ce repo.
> Source : CLAUDE.md (déprécié — AGENTS.md fait foi).

## Vue d'ensemble

- **Produit** : « CV Inspector » — assistant IA pour l'élagage et l'analyse préliminaire des candidatures (recruteurs français).
- **Stack** : monorepo pnpm + Turborepo — `backend/` (Node.js + Express + TypeScript) + `frontend/` (Next.js 15 + React 19 + Tailwind 4).
- **LLM** : GPT-5.5 via l'API OpenAI officielle (Responses API, client `openai`).
- **Persistance** : MongoDB Atlas (mongoose 8) avec repli automatique en mémoire si Atlas est injoignable.
- **Langue** : interface et analyse en français ; conformité RGPD ; CV au format français.
- **Choix d'architecture assumé** : pipeline « extraire puis analyser » (orchestrator-worker), **pas de RAG** — un CV tient intégralement dans le contexte LLM, le retrieval n'apporterait rien.

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

## État actuel (2026-08-11)

### ✅ Fait
- Migration `MongoCandidateStore` complète : CRUD (upsert/get/has/delete/list/listSummary/count/clear), handlers API async, sélection du backend au démarrage avec dégradation gracieuse.
- Typecheck TS 7 (tsgo) vert : `module: node16`, `moduleResolution: node16` (anciens `baseUrl`/`paths` supprimés), `bufferMaxEntries` (obsolète mongoose 8) retiré.
- Credentials purgés du CLAUDE.md — jamais commités dans l'historique.

### ⚠️ À faire
- **Provisions** : recréer un cluster Atlas M0 gratuit (l'ancien `testcluster` est supprimé — DNS NXDOMAIN) et mettre à jour `MONGODB_ATLAS_URI`.
- Vérifier/régénérer `OPENAI_API_KEY` (à créer sur platform.openai.com).
- Mise à jour des versions mineures (voir `pnpm outdated`) ; Next 15 → 16 et LangChain 0.3 → 0.5 à évaluer avec leurs breaking changes.
- Repo local sans remote : pousser sur GitHub/GitLab (privé ou public) une fois la vérif credentials faite.
- README racine à rédiger ; seed de démo (Sophie Martin) à automatiser.

## Prochaines évolutions (non prioritaires pour la démo)

- Support multi-recruteurs / multi-sessions (historique par utilisateur).
- Analytics avancés : scoring et comparaison de candidats.
- Recherche full-text sur les CV via les index textes déjà déclarés (`profile.name`, `profile.skills`).
