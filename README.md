# CV Inspector

Assistant IA de pré-sélection de CV pour le marché français. Upload d'un PDF → extraction → structuration → analyse (compétences, expérience, screening) → score + Q&A sur le candidat.

**Stack** : monorepo pnpm + Turborepo · Backend Node.js/Express/TypeScript (GPT-5.5 via API OpenAI, LangChain) · Frontend Next.js 15 / React 19 / Tailwind 4 · Persistance MongoDB Atlas (fallback mémoire automatique).

## Démarrage rapide

```bash
pnpm install

# 1. Configuration (backend/.env — jamais commitée)
cp backend/.env.example backend/.env   # ou renseigner directement :
#   OPENAI_API_KEY=…                   # https://platform.openai.com/api-keys
#   GPT_MODEL=gpt-5.5                  # optionnel (défaut : gpt-5.5)
#   MONGODB_ATLAS_URI=…                # cluster MongoDB Atlas
#   MONGODB_DATABASE=cv-inspector

# 2. Backend API (port 3001)
pnpm --filter backend run dev

# 3. Frontend (port 3000)
pnpm --filter frontend run dev
```

> **Stockage** : au démarrage, le backend tente de se connecter à MongoDB Atlas. Si le cluster est injoignable, il bascule automatiquement en stockage mémoire (perte des données au redémarrage) — `GET /health` expose le backend actif (`storage: mongodb | memory`).

## API

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/upload-cv` | Upload PDF → analyse complète (multipart, champ `cv`) |
| POST | `/api/candidate/:id/ask` | Q&A sur un candidat (`{ question }`) |
| GET | `/api/candidates` | Liste synthétique des candidats |
| GET | `/api/candidate/:id` | Détail complet d'un candidat |
| DELETE | `/api/candidate/:id` | Suppression |
| GET | `/health` | Statut + backend de stockage actif |

## Données de démo

```bash
# Avec Atlas connecté : insère 3 candidats fictifs (Sophie Martin, Thomas Bernard, Claire Dubois)
cd backend && pnpm exec tsx scripts/seed-demo.ts
```

CV de test réel : `resumes/Sophie_Martin_Marketing.pdf` (format français : âge, situation familiale, etc.).

## Architecture

```
PDF → extraction (pdf2json) → StructuringWorker (PDF → JSON structuré, GPT-5.5)
   → SkillsAnalysis → Experience → Screening → Matching (option)
   → CandidateRepository (Mongo Atlas | mémoire) → API Express → Next.js
```

- **Orchestrateur** : `backend/src/orchestrator/recruitingOrchestrator.js` (LangChain RunnableSequence, pattern orchestrator-worker).
- **LLM** : `backend/src/clients/openaiClient.js` — GPT-5.5 (Responses API), modèle surchargeable via `GPT_MODEL`.
- **Stockage** : interface `CandidateRepository` (`backend/src/store.ts`) — implémentations `database/mongoCandidateStore.ts` (Atlas) et mémoire.
- **Choix assumé** : pipeline « extraire puis analyser », pas de RAG — un CV tient intégralement dans le contexte LLM, le retrieval n'apporte rien ici.

## Scripts

```bash
pnpm run typecheck        # tsgo (TypeScript 7 native) sur backend + frontend
pnpm --filter backend run test:pdf
node backend/testOrchestrator.js
```

## Déploiement

- Frontend : export statique Next.js (page unique) → Vercel / Netlify / nginx.
- Backend : Node 20+ (Express), 512 Mo de RAM suffisent → Render / Railway / VPS. Variables d'environnement : `OPENAI_API_KEY`, `MONGODB_ATLAS_URI`, `MONGODB_DATABASE`, `PORT`.
- CORS : le backend accepte toutes les origines en dev — restreindre en prod.

## État

- ✅ Pipeline complet, API, frontend, tests e2e (Playwright) — build et typecheck verts (2026-08-11).
- ✅ Stockage Atlas persistant + fallback mémoire (dégradation gracieuse).
- ⚠️ Next 15 → 16 et LangChain 0.3 → 1.x : montées volontairement différées (breaking changes, aucun bénéfice démo).
