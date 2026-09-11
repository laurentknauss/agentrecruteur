# CV Inspector — Agent Recruteur

Assistant IA de pré-sélection de CV pour le marché français. Un recruteur dépose un PDF de CV ;
le système extrait, structure, analyse (compétences, expérience, screening), attribue un score et
permet un Q&A sur le candidat.

> Ce dépôt est public dans un but de **revue technique** (CTO / direction technique / prospects).
> Vous trouverez ici les décisions d'architecture, la posture sécurité et les garde-fous d'exploitation.

---

## TL;DR technique

| Sujet | Réponse |
|---|---|
| Type | App Next.js unique (UI + API `/api/*` sur le même serveur, port 3000) |
| Backend | Route handlers Next.js (App Router) + **TypeScript** (TS 7 natif / tsgo) |
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind CSS 4 |
| LLM | OpenAI **Responses API** (GPT-5.5), modèle piloté par `GPT_MODEL` |
| Extraction PDF | `pdf2json` (bornes pages/caractères avant tout appel LLM) |
| Orchestration | **Orchestrator-Worker** (pipeline extraction → structuration → analyse) |
| Persistance | MongoDB Atlas (mongoose 8) avec **repli mémoire non persistant, exposé dans les réponses** |
| Déduplication | Empreinte **SHA-256** du fichier : un CV déjà analysé n'est jamais repayé |
| Accès données | `ADMIN_TOKEN` **fail-closed** (`Bearer`) sur `/api/candidates`, `/api/candidate/:id*` |
| CI | GitHub Actions : scan secrets + typecheck + tests vitest + build (main protégée) |

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
   Au démarrage, le serveur tente MongoDB Atlas ; si injoignable, il bascule en mémoire
   (`GET /api/health` expose le backend actif). La démo ne dépend d'aucun service payant.

4. **LLM derrière une variable de modèle.**
   `frontend/src/server/clients/openaiClient.js` centralise l'appel OpenAI (Responses API, sortie JSON structurée).
   `GPT_MODEL` permet de changer de modèle sans toucher au code.

5. **Frontend en cours de qualification.**
   L'UI Next.js est un client de démonstration de l'API (upload + visualisation + Q&A) :
   toute la logique métier vit côté serveur (`frontend/src/server/`), l'UI est remplaçable.

---

## Architecture

```
PDF (upload) → extraction pdf2json → StructuringWorker (PDF → JSON)
  → SkillsAnalysisWorker → ExperienceWorker → ScreeningWorker → MatchingWorker (option)
  → CandidateRepository (Mongo Atlas | mémoire) → route handlers App Router (même serveur Next.js)
```

- **Orchestrateur** : `frontend/src/server/orchestrator/recruitingOrchestrator.js` (LangChain `RunnableSequence`).
- **Workers** : `frontend/src/server/workers/` (structuring, comprehensiveResumeAnalyzer).
- **Stockage** : interface `CandidateRepository` (`frontend/src/server/store.ts`) ;
  implémentations `frontend/src/server/database/mongoCandidateStore.ts` (Atlas) et mémoire.
- **Répertoire** : `frontend/` uniquement (app Next.js mono-port, UI + API ; imports `@/components/*`).
  L'ancien répertoire `backend/` (Express) a été absorbé dans `frontend/src/server/`.

---

## Qualité & sécurité (posture « code lisible par un CTO »)

- **Aucun secret dans l'historique git.** Vérifié par scan (`sk-…`, clés AWS/Google/GitHub/Slack,
  URI MongoDB, clés privées PEM, fichiers `.env`). Le pattern est **ré-enforcé** par :
  - hooks Husky `pre-commit`/`pre-push` (voir `.husky/`) ;
  - job CI `security` (scan secrets bloquant) ;
  - `.gitignore` strict (`*.env*` sauf `*.env.example`).
- **Environnement** : seuls des fichiers `.env.example` sont commités (cf. `frontend/.env.example`).
  Le `.env.local` vit sur le serveur ou localement, jamais en CI.
- **Routes de données protégées** : `/api/candidates`, `/api/candidate/:id` (GET/DELETE) et
  `/api/candidate/:id/ask` exigent `Authorization: Bearer ${ADMIN_TOKEN}`. Si `ADMIN_TOKEN`
  n'est pas configuré **en production**, ces routes répondent **503** (fail-closed) : jamais
  d'ouverture silencieuse. Le modèle porte un champ `ownerId` indexé, et les lectures/suppressions
  sont filtrées par propriétaire quand un contexte est fourni — base qui sera reprise par **Clerk**.
- **Upload borné** : pré-contrôle `Content-Length` (413 avant tamponnage), 10 Mo max, signature
  `%PDF` vérifiée, 20 pages / 60 000 caractères max transmis au LLM, **5 dépôts par IP et par heure**.
  Le proxy ajoute une limite de corps (`deploy/Caddyfile.agentrecruteur.example`).
- **Erreurs explicites, sans fuite** : 422 (PDF chiffré / scanné / illisible), 502 (LLM ou base
  indisponible), 500 générique porteur d'un **identifiant de corrélation** ; aucun message interne
  n'est renvoyé au client.
- **CI sur tout push/PR** : scan secrets (bloquant), typecheck tsgo, tests vitest, build Next.js.
  `pnpm audit` et le scan Snyk sont bloquants pour les vulnérabilités high+.
- **Branche `main` protégée** : PR obligatoire + checks verts requis + pas de force-push.

---

## Démarrage rapide

```bash
pnpm install

# 1. Configuration locale (jamais commitée)
cp frontend/.env.example frontend/.env.local   # renseigner OPENAI_API_KEY (+ ADMIN_TOKEN)

# 2. Serveur unique (UI + API)
pnpm dev   # http://localhost:3000
```

- Ouvrir `http://localhost:3000` et déposer un CV à tester.
- Sans `OPENAI_API_KEY`, l'upload échoue proprement en **502** (service d'analyse indisponible).

> Stockage : le serveur tente MongoDB Atlas puis bascule en mémoire (`GET /api/health` → `storage: mongodb | memory`).
> Le repli mémoire **n'est pas figé** : chaque requête retente Atlas, et le mode utilisé est renvoyé
> dans la réponse d'upload (`storage`). En mémoire, les candidats sont perdus au redémarrage.
> ⚠️ En production l'état réel est visible via `curl -s https://agentrecruteur.fr/api/health` (cf. `TODO.md` §2).

### Données de démo

Il n'y a **pas** de script de seed dans le repo : le jeu de démo (`candidatesCount: 0` en mémoire)
se remplit en uploadant un CV réel depuis l'UI.

CV de test réel : `resumes/Sophie_Martin_Marketing.pdf` (format français : âge, situation familiale…).

---

## API

| Méthode | Route | Rôle | Accès |
|---|---|---|---|
| POST | `/api/upload-cv` | Upload PDF (multipart `cv`) → analyse complète | Public, rate-limité (5/h/IP) |
| POST | `/api/candidate/:id/ask` | Q&A sur un candidat (`{ question }`) | `Bearer ADMIN_TOKEN` |
| GET | `/api/candidates` | Liste synthétique des candidats | `Bearer ADMIN_TOKEN` |
| GET | `/api/candidate/:id` | Détail complet | `Bearer ADMIN_TOKEN` |
| DELETE | `/api/candidate/:id` | Suppression | `Bearer ADMIN_TOKEN` |
| GET | `/api/health` | Statut + backend de stockage actif | Public |

Codes d'erreur d'upload : `400` requête/signature invalide · `413` fichier ou corps trop gros ·
`422` PDF chiffré / sans couche texte / illisible · `429` quota d'IP · `502` service d'analyse
indisponible · `500` générique (identifiant de corrélation renvoyé, détail uniquement côté journaux).

---

## Scripts

```bash
pnpm typecheck
pnpm build
pnpm test   # 70 tests vitest — voir frontend/tests/README.md
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
  request_body {
    max_size 11MB           # première barrière avant Next.js (413 côté app au-delà)
  }
  reverse_proxy 127.0.0.1:3004   # app Next.js mono-port (UI + API)
}
```

---

## Évolutions / chantiers ouverts

- **Authentification réelle (Clerk)** : remplacer le garde-fou `ADMIN_TOKEN` par des sessions
  multi-recruteurs ; le champ `ownerId` et le filtrage par propriétaire sont déjà en place.
- **Quota par compte** : remplacer le rate-limit par IP de l'upload par un quota lié au compte authentifié.
- **OCR** : les PDF scannés sont aujourd'hui refusés en 422 (aucune couche texte) ; l'OCR est un chantier séparé.
- **Persistance active en prod** : ajouter l'IP du droplet dans l'IP Access List Atlas — bloquant, cf. `TODO.md` §2.
- Analytics : scoring comparatif, recherche full-text sur les CV (index textes déjà déclarés).

---

## Contact & accès

- Auteur : Laurent Knauss (créateur) — les accès de test s'obtiennent sur demande.
- Démonstration publique : <https://agentrecruteur.fr>.
