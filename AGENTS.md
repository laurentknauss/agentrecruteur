# AGENTS.md — CV Inspector

> Assistant IA de pré-sélection de CV (marché français). Guide de référence pour tout agent travaillant sur ce repo.
> Ce document est la source de vérité (single source of truth) pour les agents IA de ce repo.

## Vue d'ensemble

- **Produit** : « CV Inspector » — assistant IA pour l'élagage et l'analyse préliminaire des candidatures (recruteurs français).
- **Stack** : app **unique Next.js 16** (React 19.2 + Tailwind 4, **Turbopack** par défaut, ESLint **flat config**) — l'UI **et** l'API (`/api/*`) vivent dans le même serveur (App Router) ; un seul process : port 3000 en dev, **3004 en production** (`agentrecruteur.service` sur le VPS).
- **LLM** : GPT-5.5 via l'API OpenAI officielle (Responses API, client `openai`).
- **Persistance** : MongoDB Atlas (mongoose 8) avec repli automatique en mémoire si Atlas est injoignable.
- **Langue** : interface et analyse en français ; conformité RGPD ; CV au format français.
- **Choix d'architecture assumé** : pipeline « extraire puis analyser », **pas de RAG** — un CV tient intégralement dans le contexte LLM, le retrieval n'apporterait rien. L'ancien orchestrateur LangChain (`RunnableSequence`) a été supprimé le 2026-09-10 : orphelin depuis la refonte mono-port (#3), il ne servait qu'à tirer `langchain`/`langsmith` (1 vuln *high* + 3 *moderate*).
- **Dépôt** : `github.com/laurentknauss/agentrecruteur` (**public**, revue CTO) — branche par défaut `main` protégée.

## Commandes

Depuis la racine du monorepo (`pnpm` obligatoire) :

| Commande | Rôle |
|---|---|
| `pnpm dev` | Serveur unique Next.js sur `:3000` (UI + API) |
| `pnpm build` / `pnpm start` | Build / prod (port 3000) |
| `pnpm typecheck` | Typecheck (tsgo / TS 7) |
| `pnpm lint` | ESLint (flat config) — `next lint` a été retiré en Next 16 |
| `pnpm test` | Vitest (stores, handlers API) |

## Architecture

```
PDF (upload) → extractPDFText (pdf2json) → structuringWorker (PDF→JSON)
  → comprehensiveResumeAnalyzer (runGPT5Model, GPT-5.5 : compétences, expérience, screening)
  → CandidateRepository (Mongo Atlas | mémoire) → route handlers App Router → UI Next.js
```

- **Domaine (ex-backend)** : `frontend/src/server/` (workers `workers/` — `comprehensiveResumeAnalyzer.js`, `structuringWorker.js` ; `pdf.ts`, `llm.ts`, `clients/openaiClient.js`, `store.ts`, `database/`, `models/`, `utils/`).
- **API** : route handlers App Router dans `frontend/src/app/api/` (`upload-cv`, `candidate/[id]`, `candidate/[id]/ask`, `candidates`, `health`) — plus de serveur Express séparé.
- **Stockage** : interface `CandidateRepository` (`frontend/src/server/store.ts`) ; sélection Atlas/mémoire via `frontend/src/server/storage-init.ts`, exposée par `GET /api/health` (`storage`).

## Configuration (jamais commitée)

Variables lues par Next (fichier local `frontend/.env.local`, jamais commité) :

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
- Branche `main` **protégée** : toute modif passe par une **Pull Request** + checks verts obligatoires : `Secret Scan`, `Typecheck (tsgo)`, `Tests (vitest)`, `Build Frontend (Next.js)` (strict = branche à jour). Force-push et suppression de `main` interdits.
- CI GitHub Actions (`.github/workflows/ci.yml`, sur push & PR) : scan secrets (bloquant) → typecheck tsgo → **tests vitest (`pnpm test`)** → build Next → **`pnpm audit --audit-level=high` bloquant** depuis le 2026-09-10 (il était `continue-on-error`, ce qui a laissé passer la CVE-2025-55182) → job **Snyk** (effectif dès que le secret `SNYK_TOKEN` est posé sur le repo).
- **Dependabot** (`.github/dependabot.yml`) : PR hebdomadaires groupées (`next`+`react`+`eslint-config-next` ensemble, correctifs/minor prod), canaries Next exclues — c'est le maillon qui manquait : aucun correctif de sécurité ne pouvait arriver tout seul.
- Hooks Husky locaux : `pre-commit` = scan secrets (diff indexé) ; `pre-push` = scan secrets + typecheck tsgo + build Next + **audit bloquant** (high+). Scanner : `node scripts/scan-secrets.mjs [--staged]`.
- **Aucun déploiement automatique en CI** — déploiement VPS manuel : build local → rsync du **bundle standalone** → systemd (cf. `deploy/README.md` §5).
- Exploitation en mode production commerciale : upload et Q&A actifs, bornés (taille, pages, caractères, rate-limit IP) et dédupliqués par empreinte SHA-256. L'accès aux données est gardé par `ADMIN_TOKEN` (fail-closed en production).

### Workflow imposé aux agents IA

1. Toujours une branche : `git checkout -b feat/…`
2. Commits (hooks pre-commit/pre-push actifs — ne pas les contourner).
3. `git push origin feat/…` puis `gh pr create --fill`.
4. Attendre les checks verts puis `gh pr merge --squash --delete-branch` (0 review requise).

### Rôle des branches

| Branche | Rôle |
|---|---|
| `main` | **Production** — protégée (PR + checks verts, pas de force-push). Toujours déployable (agentrecruteur.fr). |
| `feat/ui-header-footer-fr` | **Itération UI dev** — contient les annotations dev (noms rouges `data-devbox`) pour régler visuellement le design. Contenu à porter sur `main` via branches propres (annotations retirées). |
| `non-locked-features` | **Dev local déverrouillé (obsolète)** — verrous démo coupés à la main pour tester upload/Q&A réels. Remplacée par `sans-verrou-demo-pour-production` (retrait propre du verrou, correctifs d'exploitation). **Ne pas pousser en production.** |

- **Distant** : `main` uniquement (vérifié `git ls-remote --heads origin`, 2026-09-10). Les branches de travail
  (`docs/*`, `feat/*`, `refactor/mono-port-next`) sont supprimées au merge de leur PR (`--delete-branch`) ;
  si `git branch -r` en montre encore, ce sont des refs fantômes locales → `git fetch origin --prune`.
- **En attente** : `feat/conversation-page` et `docs/braintrust-backlog` sont locales, **jamais poussées** (cf. `TODO.md` §3).

Règles :
- Ne **jamais** committer directement sur `main` : passer par une branche `feat/*` ou `docs/*` puis PR.
- `non-locked-features` et `feat/ui-header-footer-fr` servent uniquement au travail local — attention à ne pas les pousser/merger accidentellement en prod.

## État actuel (2026-09-07)

### ✅ Fait
- Migration `MongoCandidateStore` complète : CRUD, handlers API async, sélection au démarrage avec dégradation gracieuse.
- Typecheck TS 7 (tsgo) vert (`module: node16`, `moduleResolution: node16`).
- Credentials purgés du CLAUDE.md (supprimé) — jamais commités dans l'historique.
- **Repo GitHub public créé** (`agentrecruteur`) — historique secret-free vérifié ; README réécrit pour lectorat CTO.
- **CI + Husky + protection de branche `main`** (PR + checks verts) — voir section GitHub ci-dessus.
- **Mode production commerciale** (branche `sans-verrou-demo-pour-production`) : verrou démo retiré, bornes LLM, déduplication sha256, garde-fou `ADMIN_TOKEN`, rate-limit IP, tests vitest + job CI.
- **DNS** : zone `agentrecruteur.fr` chez DigitalOcean (via doctl) — A `@` + A `www` → 209.38.207.109 ; NS basculés chez GoDaddy vers ns1/ns2/ns3.digitalocean.com (**convergence terminée, vérifié 2026-09-10**).
- Docs déploiement VPS : `deploy/README.md`, `deploy/Caddyfile.agentrecruteur.example`, checklist `TODO.md`.

### ⚠️ À faire (état vérifié 2026-09-10 — détail et commandes dans `TODO.md`)

- **🔴 Persistance HS en prod** : `/api/health` → `storage: memory`. Cause isolée : l'IP du droplet
  (`209.38.207.109`) n'est pas dans l'IP Access List Atlas (même URI OK depuis le poste local ; depuis le VPS →
  `SSL alert 80`). Fix : ajouter l'IP côté Atlas, puis restart du service. `storage-init.ts` bascule en mémoire
  silencieusement (`console.warn`) → la panne ne casse pas la prod mais aucune candidature n'est conservée.
- **🔴 Code non déployé** : `feat/conversation-page` (+ `docs/braintrust-backlog`) locales, jamais poussées ;
  build prod du 2026-09-07 → `https://agentrecruteur.fr/conversation/<id>` = 404.
- **🟡 Backlog** : évals LLM Braintrust (aucun code engagé).
- **Audit dépendances : 0 vulnérabilité connue** (2026-09-10, `pnpm audit`) — 12 auparavant (2 *critical*, 6 *high*), corrigées par Next 16, suppression de `unpdf` (`canvas → node-pre-gyp → tar`) et de `langchain`/`@langchain/*` (`langsmith`, `uuid`).

### ✅ État vérifié (2026-09-10)

- `agentrecruteur.fr` + `www` : DNS DO, TLS Caddy, `HTTP/2 200` ; unité `agentrecruteur.service` — port **3004** sur **127.0.0.1** (Caddy seul en frontal), racine `/srv/agentrecruteur/frontend`, **bundle standalone** (`output: "standalone"`, 47 Mo, dépendances tracées incluses), `NRestarts=0`.
- **Piège déploiement (2026-09-10)** : ne **jamais** rsync le `node_modules` du poste de build ni installer les dépendances côté serveur. Turbopack référence les externes via `.next/node_modules/<pkg>-<hash> → ../../../node_modules/.pnpm/<pkg>@<version>_<peer>/…`, chemin **relatif au poste de build** : un `pnpm install` serveur résout autrement (`mongoose@8.24.4` au lieu de `8.24.3_supports-color@8.1.1`) → `Cannot find module mongoose-<hash>` → **500 sur toutes les routes API**. `output: "standalone"` supprime la classe de panne.
- Verrou démo (avant retrait, 2026-09-10) : `POST /api/upload-cv` et `POST /api/candidate/:id/ask` → **403** — retiré par la branche `sans-verrou-demo-pour-production`.
- Distant git = `main` seulement.
- **Sécurité (2026-09-10)** : intrusion confirmée le 07/09 via la RCE Next 15.4.6 (service exécuté **en root**) — confinement et reboot vérifiés, correctif **Next 16.3.4** ; post-mortem, décisions et travaux restants (rotation des secrets, service non-root, access logs Caddy, durcissement du droplet) dans `TODO.md` §9.

## Bilan de session (2026-09-07)

## Prochaines évolutions (non prioritaires pour la démo)

- Support multi-recruteurs / multi-sessions (historique par utilisateur) — auth sur invitation.
- Analytics avancés : scoring et comparaison de candidats.
- Recherche full-text sur les CV via les index textes déjà déclarés (`profile.name`, `profile.skills`).

## Bilan de session (2026-09-07)

### Environnement & outils
- pnpm mondial actif : 12.3.4 (`corepack prepare pnpm@12.3.4 --activate`) — « Update available 10.9.0 → 12.3.4 » de pi update corrigé (pi n'utilisait pas encore la bonne version Corepack).
- MCP pi : config déplacée de `~/.claude.json` vers `~/.pi/agent/mcp.json` (`mcpServers`, 20 serveurs, dont `gemini-media` — binaire `/home/laurent/professionnel/gemini-media-mcp/`). Aucune dépendance « claude ».
- Moonshot/Kimi : providers intègrent `moonshotai`/`moonshotai-cn`/`opencode` ; auth via `MOONSHOT_API_KEY` (env) ou `auth.json`. Clef Gemini validée (modèles image dispo : `nano-banana-pro-preview`…).

### Produit (agentrecruteur)
- Identité « sergent instructeur » : logo à la loupe (fond transparent), hero camouflage + voile kaki, CTA orange Cialdini (`#E8601C`), footer épuré, header FR (« Inscription »/« Connexion » → LinkedIn).
- Fusion mono-port : **app unique Next.js** (route handlers API, domaine dans `frontend/src/server/`, Express supprimé, workspace `[frontend]`) — un seul process/port.
- Verrou démo double (retiré depuis) : variables d'environnement côté API (403) et côté UI → `FileUpload` verrouillé + popup « Contactez Laurent via LinkedIn ».
- Production : `agentrecruteur.fr` live (VPS DO Caddy + systemd port 3004, Let's Encrypt, DNS DO via doctl). GitHub public `laurentknauss/agentrecruteur`, CI + Husky + protection `main`.

