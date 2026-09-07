# CV Inspector — Agent Recruteur

Assistant IA de pré-sélection de CV pour le marché français. Un recruteur dépose un PDF de CV ;
le système extrait, structure, analyse (compétences, expérience, screening), attribue un score et
permet un Q&A sur le candidat.

> Ce dépôt est public dans un but de **revue technique** (CTO / direction technique / prospects).
> Vous trouverez ici les décisions d'architecture, la posture sécurité et le mode démo protégé.

---

## TL;DR technique

| Sujet | Réponse |
|---|---|
| Type | Monorepo pnpm + Turborepo (2 workspaces : `backend`, `frontend`) |
| Backend | Node.js + Express + **TypeScript** (TS 7 natif / tsgo), ESM |
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind CSS 4 |
| LLM | OpenAI **Responses API** (GPT-5.5), modèle piloté par `GPT_MODEL` |
| Extraction PDF | `pdf2json` + `unpdf` (tolérance aux PDF malformés) |
| Orchestration | **Orchestrator-Worker** (LangChain `RunnableSequence`) |
| Persistance | MongoDB Atlas (mongoose 8) avec **fallback mémoire automatique** |
| Démo publique | **`DEMO_LOCK=1`** : endpoints LLM coupés (403) → zéro coût OpenAI |
| CI | GitHub Actions : scan secrets + typecheck + build (main protégée, PR + checks verts requis) |

---

## Décisions d'architecture (et pourquoi)

1. **Pipeline « extraire puis analyser », pas de RAG.**
   Un CV tient intégralement dans le contexte LLM : un pipeline de retrieval ajouterait de la
   complexité (indexation, chunking, embeddings) sans gain de qualité mesurable sur ce cas d'usage.
   Le coût d'infra et d'ops reste minimal.

2. **Orchestrator-Worker (chaîne de responsabilités).**
   Chaque étape produit un artefact typé consommé par la suivante :
   `PDF → extraction → structuration (PDF → JSON) → analyse compétences → expérience → screening → matching (option)`.
   Bénéfices : debuggabilité (chaque worker est isolé), scalabilité indépendante, observabilité du pipeline.

3. **Storage avec dégradation gracieuse.**
   Au démarrage, le backend tente MongoDB Atlas ; si injoignable, il bascule en mémoire
   (`GET /health` expose le backend actif). La démo ne dépend d'aucun service payant.

4. **LLM derrière une variable de modèle.**
   `backend/src/clients/openaiClient.js` centralise l'appel OpenAI (Responses API, sortie JSON structurée).
   `GPT_MODEL` permet de changer de modèle sans toucher au code.

5. **Frontend en cours de qualification.**
   Le frontend Next.js est un client de démonstration de l'API (upload + visualisation + Q&A) :
   toute la logique métier vit côté backend, l'UI est remplaçable.

---

## Architecture

```
PDF (upload) → extraction pdf2json → StructuringWorker (PDF → JSON)
  → SkillsAnalysisWorker → ExperienceWorker → ScreeningWorker → MatchingWorker (option)
  → CandidateRepository (Mongo Atlas | mémoire) → API Express → Frontend Next.js
```

- **Orchestrateur** : `backend/src/orchestrator/recruitingOrchestrator.js` (LangChain `RunnableSequence`).
- **Workers** : `backend/src/workers/` (structuring, comprehensiveResumeAnalyzer).
- **Stockage** : interface `CandidateRepository` (`backend/src/store.ts`) ;
  implémentations `database/mongoCandidateStore.ts` (Atlas) et mémoire.
- **Répertoire backend** : `backend/`, **frontend** : `frontend/` (imports `@/components/*`).

---

## Qualité & sécurité (posture « code lisible par un CTO »)

- **Aucun secret dans l'historique git.** Vérifié par scan (`sk-…`, clés AWS/Google/GitHub/Slack,
  URI MongoDB, clés privées PEM, fichiers `.env`). Le pattern est **ré-enforcé** par :
  - hooks Husky `pre-commit`/`pre-push` (voir `.husky/`) ;
  - job CI `security` (scan secrets bloquant) ;
  - `.gitignore` strict (`*.env*` sauf `*.env.example`).
- **Environnement** : seuls des fichiers `.env.example` sont commités (cf. `backend/.env.example`).
  Le `.env` vit sur le serveur ou localement, jamais en CI.
- **Démo publique protégée** : `DEMO_LOCK=1` renvoie 403 sur `POST /api/upload-cv` et
  `POST /api/candidate/:id/ask` → aucune dépense OpenAI par des visiteurs inconnus.
  L'accès réel se fait sur invitation (contact).
- **CI sur tout push/PR** : scan secrets (bloquant), typecheck tsgo backend+frontend, build Next.js.
  `pnpm audit` est exécuté (informatif).
- **Branche `main` protégée** : PR obligatoire + checks verts requis + pas de force-push.

---

## Démarrage rapide

```bash
pnpm install

# 1. Configuration locale (jamais commitée)
cp backend/.env.example backend/.env   # DEMO_LOCK=1 par défaut ; OPENAI_API_KEY vide en démo

# 2. Backend API (port 3001) — vitrine sans coût LLM
pnpm --filter backend run dev

# 3. Frontend (port 3000)
pnpm --filter frontend run dev
```

- Ouvrir `http://localhost:3000`. En mode démo, l'upload et le Q&A renvoient un 403 avec message de contact.
- **Activer l'analyse IA réelle** : renseigner `OPENAI_API_KEY` dans `backend/.env` puis retirer `DEMO_LOCK=1`.

> Stockage : le backend tente MongoDB Atlas puis bascule en mémoire — `GET /health` → `storage: mongodb | memory`.

### Données de démo

```bash
# Avec Atlas connecté : insère des candidats fictifs (Sophie Martin, etc.)
cd backend && pnpm exec tsx scripts/seed-demo.ts
```

CV de test réel : `resumes/Sophie_Martin_Marketing.pdf` (format français : âge, situation familiale…).

---

## API

| Méthode | Route | Rôle | Démo |
|---|---|---|---|
| POST | `/api/upload-cv` | Upload PDF (multipart `cv`) → analyse complète | 🔒 403 sous DEMO_LOCK |
| POST | `/api/candidate/:id/ask` | Q&A sur un candidat (`{ question }`) | 🔒 403 sous DEMO_LOCK |
| GET | `/api/candidates` | Liste synthétique des candidats | ✅ |
| GET | `/api/candidate/:id` | Détail complet | ✅ |
| DELETE | `/api/candidate/:id` | Suppression | ✅ |
| GET | `/health` | Statut + backend de stockage actif | ✅ |

---

## Scripts

```bash
pnpm run typecheck            # tsgo (TS 7 natif) backend + frontend
pnpm --filter frontend run build
pnpm --filter backend run test:pdf
node backend/testOrchestrator.js   # test du pipeline complet
```

---

## Déploiement (VPS DigitalOcean — Caddy + systemd)

Même pattern que les autres sites Laurent (bullionradar.fr, streetbodies.com) :
**build hors VPS** (poste/runner) → `rsync` code + `.next` + `node_modules` → restart systemd.
Le `.env` est copié une fois sur le VPS, jamais en CI.

- Guide complet : [`deploy/README.md`](deploy/README.md)
- Bloc Caddy : [`deploy/Caddyfile.agentrecruteur.example`](deploy/Caddyfile.agentrecruteur.example)

```
agentrecruteur.fr, www.agentrecruteur.fr {
  encode gzip
  @api path /api/*
  handle @api { reverse_proxy 127.0.0.1:3001 }   # Express
  handle     { reverse_proxy 127.0.0.1:3000 }   # Next.js
}
```

---

## Évolutions / chantiers ouverts

- Provisionner un cluster MongoDB Atlas M0 et renseigner `MONGODB_ATLAS_URI` (persistance active).
- Ajouter de vraies sessions multi-recruteurs (auth sur invitation) quand le produit se paie.
- Analytics : scoring comparatif, recherche full-text sur les CV (index textes déjà déclarés).
- Montées mineures de versions (Next 16, LangChain 0.5) différées volontairement (breaking changes sans gain démo).

---

## Contact & accès démo

- Auteur : Laurent Knauss (créateur) — les accès de test s'obtiennent sur demande.
- Démonstration publique : <https://agentrecruteur.fr> (mode démo protégé).
