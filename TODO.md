# TODO — agentrecruteur.fr (état vérifié le 2026-09-10)

> Doc de suivi opérationnel (DNS, VPS, provisions, dettes). Périmètre : ce repo uniquement.
> Toute ligne « ✅ » ci-dessous a été vérifiée en direct (commande indiquée), pas déduite.

## 0) État vérifié

| Sujet | État | Preuve |
|---|---|---|
| NS `agentrecruteur.fr` | ✅ DO autorité | `dig NS agentrecruteur.fr +short` → ns1/ns2/ns3.digitalocean.com |
| A `@` + `www` | ✅ `209.38.207.109` | `dig A agentrecruteur.fr +short` / `dig A www.agentrecruteur.fr +short` |
| TLS + reverse proxy | ✅ Caddy | `curl -I https://agentrecruteur.fr` → `HTTP/2 200`, `server: Caddy` (idem www) |
| Service prod | ✅ `agentrecruteur.service` (actif) | `systemctl is-active agentrecruteur.service` |
| Port prod | ✅ **3004** (dev local : 3000) | `ss -ltnp` sur le VPS ; `ExecStart … next start -p 3004` |
| Racine déployée | ✅ `/srv/agentrecruteur` (**pas** un clone git, déploiement rsync) | `ls /srv` |
| Verrou démo (API) | ✅ 403 | `POST /api/upload-cv`, `POST /api/candidate/:id/ask` → 403 « Accès restreint en démo » |
| Branches distantes | ✅ `main` uniquement | `git ls-remote --heads origin` |

Ancienne doc (sections DNS/Caddy/verrou démo) archivée : tout est fait. Rappel des commandes utiles :

```bash
dig NS agentrecruteur.fr +short
dig A  agentrecruteur.fr +short
curl -I https://agentrecruteur.fr | grep -i ^server
curl -s https://agentrecruteur.fr/api/health
ssh root@209.38.207.109 'systemctl status agentrecruteur.service --no-pager'
```

## 1) 🔴 P0 — `next` 15.4.6 en prod : RCE critique (CVSS 10.0)

Constaté par le job CI `pnpm audit (high)` (et confirmé localement, 2026-09-10) :

| Advisory | Sévérité | Portée | Corrigé en |
|---|---|---|---|
| RCE protocole React flight (CVE-2025-55182, GHSA-9qr9-h5gf-34mp) | **critical 10.0** | `next >=15.4.0-canary.0 <15.4.8` | 15.4.8 / 15.4.10 |
| 2 advisories `next` supplémentaires | critical | `next >=13.4.0 <15.5.24` | **15.5.24** |
| `tar <=7.5.18` | critical | transitif | 7.5.19 |

- Version installée : `next 15.4.6`, `react`/`react-dom` **19.1.0** (React affecté : 19.0.0–19.2.0, corrigé en 19.2.1).
- Version **déployée en prod** : `next 15.4.6` (vérifié sur le VPS) → site public exposé, exploitation **sans authentification** (`AV:N/AC:L/PR:N/UI:N`, CWE-502 désérialisation).
- Le verrou démo (`DEMO_LOCK`) ne protège **pas** de cette faille : elle est dans le protocole RSC, pas dans les endpoints LLM.

**Actions** :
- [ ] Monter `next` à **≥15.5.24** (dernière 15.5.x : 15.5.25) et `react`/`react-dom` à **19.2.1** (lire les notes de version 15.4 → 15.5 avant, cf. règle « pas de dépréciation laissée »).
- [ ] Traiter `tar <=7.5.18` (transitif, probablement via `unpdf`→`canvas`) — `override` pnpm ou retrait de la dépendance.
- [ ] Repasser `pnpm audit --audit-level=high` à zéro critical, typecheck + build + smoke test local, puis redéployer.
- Note : le job CI `pnpm audit (high)` est en `continue-on-error` (informatif) → il **ne bloque pas** les merges, donc un CVE critique peut passer en prod sans gate. À reprendre (le rendre bloquant sur `critical`).

## 2) 🔴 P1 — Atlas injoignable depuis le VPS → prod tourne en mémoire

**Symptôme** : `GET /api/health` → `{"storage":"memory","candidatesCount":0}` alors que
`MONGODB_ATLAS_URI` est bien renseignée dans `/srv/agentrecruteur/.env.local`.
Conséquence : **aucune persistance** — les candidatures disparaissent à chaque restart du service.

**Cause racine (isolée, pas déduite)** :

- Depuis le VPS, connexion Atlas → `SSL alert 80 (tlsv1 internal error)` (handshake TLS refusé).
- Depuis le poste de Laurent, **même URI** → connexion + `ping` OK.
- Cluster vivant : `resolveSrv _mongodb._tcp.<cluster>` + TXT `authSource=admin&replicaSet=…` OK depuis le VPS.
- ⇒ ce n'est ni DNS, ni credentials, ni cluster éteint : **l'IP du droplet (`209.38.207.109`) n'est pas dans l'IP Access List Atlas** (Atlas ferme alors le handshake).
- `storage-init.ts` avale l'erreur et bascule en mémoire (repli voulu) → la panne est **silencieuse** en prod (juste un `console.warn`).

**Actions** :
- [ ] Atlas → Network Access → ajouter `209.38.207.109` (ou une entrée temporaire, puis restreindre).
- [ ] `ssh root@209.38.207.109 'systemctl restart agentrecruteur.service'`
- [ ] Vérifier : `curl -s https://agentrecruteur.fr/api/health` → `"storage":"atlas"`.
- [ ] (Robustesse, à discuter) rendre la dégradation **visible** : `/api/health` ne doit pas renvoyer `OK` quand le stockage est mémoire, et le warning doit remonter (log d'erreur, pas `console.warn`).

Notes : la clé API Atlas n'est pas sur la machine et `mongosh` n'est pas installé → l'ajout d'IP se fait dans le dashboard Atlas (côté Laurent).

## 3) 🔴 P1 — Prod en retard sur le code + branche non poussée

- [ ] **`feat/conversation-page` (commit `05378a7`, 2026-09-09) — jamais poussée** (pas d'upstream, aucune PR).
  412 lignes : page `/conversation/[id]`, `RecruiterConversation.tsx`, `navbar.tsx`, `llm.ts`,
  `mongoCandidateStore.ts`, `types.ts`. Travail local **non sauvegardé côté GitHub**.
- [ ] `docs/braintrust-backlog` (`895440d`) non poussée non plus — c'est un **ancêtre** de `05378a7` :
  un seul push/PR porte les deux.
- [ ] **Déploiement prod** : build en ligne = `BUILD_ID QXWnvnKoOQUnffF96fcFs`, daté **2026-09-07 13:37**,
  routes server = `index` + `api` seulement → `https://agentrecruteur.fr/conversation/<id>` → **404**.
  Rebuild local + rsync + restart après merge.

Séquence (workflow imposé) :

```bash
git push -u origin feat/conversation-page
gh pr create --fill                      # checks : Secret Scan, Typecheck tsgo, Build Next
gh pr merge --squash --delete-branch
# déploiement : cf. deploy/README.md (build local → rsync → systemctl restart agentrecruteur.service)
```

## 4) 🟡 Provisions & sortie du mode démo

- [x] `OPENAI_API_KEY` présente dans `/srv/agentrecruteur/.env.local`
- [x] `DEMO_LOCK=1` + `NEXT_PUBLIC_DEMO_LOCK=1` actifs (403 en prod, vérifié)
- [ ] Atlas utilisable **depuis le VPS** (bloquant, cf. §2) — sans lui, sortir du mode démo enverrait
  les candidatures dans un stockage volatil.
- [ ] Décider de la sortie de démo (auth / invitation) — non planifié, cf. « Prochaines évolutions » de `AGENTS.md`.

## 5) 🟡 Branches

- [x] Distant = `main` seulement (`git ls-remote --heads origin`) — les 9 branches de travail
  (`docs/agents-github-workflow`, `docs/branches-roles`, `docs/okf-bilan-session`, `feat/components-json`,
  `feat/logo-sergent-loupe`, `feat/prod-clean-ui`, `feat/tests-edge-cases`, `feat/vitest-tests`,
  `refactor/mono-port-next`) ont été supprimées au merge de leur PR ; il restait des refs fantômes
  locales, purgées par `git fetch --prune`.
- [ ] Locales à traiter :
  - `feat/conversation-page`, `docs/braintrust-backlog` → pousser puis merger (§3), sinon perdues.
  - `feat/ui-header-footer-fr`, `non-locked-features` → **à conserver** (rôles dev documentés dans `AGENTS.md`).

## 6) 🟡 Backlog — Observabilité / évals LLM (Braintrust)

Pas posé dans le code, inscription faite le 2026-09-08. Aucun engagement de code pour l'instant.

- [ ] Évals du pipeline d'analyse de CV (workers GPT) avec Braintrust
- [ ] Contexte disponible :
  - Org `45391ed5-80cb-4db4-86f5-a8fa6965daf8` — projet `a6a8b2f7-72c0-48d6-bd4d-865b6061b85d` (endpoint `api-eu.braintrust.dev`)
  - CLI : `~/.local/bin/braintrust-setup` ; config locale `.braintrust.json` (gitignorée, contient la clé API Braintrust)
  - Provider OpenAI : clé depuis l'env `$OPENAI_API_KEY` à recoller dans « configure provider » de Braintrust — **jamais** écrite dans un fichier du repo

## 7) 🟡 Dettes non bloquantes

- [x] Audit outil — **0 vulnérabilité** au 2026-09-10 (avant : 12, dont 2 *critical* et 6 *high*). Traitement : `next` 15.4.6 → **16.3.4** (résout `postcss` + `sharp`), `unpdf` supprimé (`canvas → node-pre-gyp → tar@6.2.1`), `langchain`/`@langchain/core`/`@langchain/openai` supprimés avec l'orchestrateur mort qu'ils servaient (résout `langsmith` + `uuid`), `js-yaml` forcé en `^4.3.2`, `@types/node` 20 → 24.
- [ ] `eslint@9.39.5` : npm le marque « no longer supported » (eslint 10 est sorti). Bloqué **en amont** (vérifié 2026-09-10) : `typescript-eslint@8.46`, `eslint-plugin-react-hooks@7`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y` plafonnent leur peer à `^9` — `eslint-config-next@16.3.4` accepte `>=9` mais la chaîne de plugins ne suit pas encore.
- [ ] (Le cas échéant) base `backend/` : `backend/.env` existe encore alors que le serveur Express a été supprimé (§ _Architecture_ de `AGENTS.md`) — vérifier qu'il n'est plus référencé et le retirer du disque local.

## 8) Rappels ops

- Ne **jamais** committer sur `main` : branche + PR + checks verts, puis `gh pr merge --squash --delete-branch`.
- Déploiement : build **local** → rsync → `systemctl restart agentrecruteur.service` (pas de déploiement CI).
- Secrets : jamais dans un fichier tracké (`.env.local` uniquement) ; un secret exposé doit être purgé **et** révoqué.

## 9) 🔴 SÉCURITÉ — intrusion confirmée sur le droplet (07/09/2026, CVE-2025-55182)

**Ce qui s'est passé** (preuves : journal systemd, `auth.log`, état disque — copie des pièces dans
`/root/incident-2026-09-10/` sur le VPS) :

- **07/09 13:13** — déploiement de l'app en **Next 15.4.6** (vulnérable) servir `agentrecruteur.fr`, **en root**.
- **07/09 19:42–19:43** — RCE non authentifiée (protocole React flight) : `useradd pakchoi` (UID 0, mot de passe fixe, `NOPASSWD:ALL`), `apt install docker.io containerd`, 9 conteneurs `amco_*`, écriture du crontab root, unité déguisée `sys-health.service`, reverse shell `/tmp/.n` → `185.177.72.3:20053`. Les commandes s'exécutent dans le cgroup `/system.slice/agentrecruteur.service` en `_UID=0`.
- La charge utile n'a **jamais tourné** (images privées → `pull access denied`) mais root était acquis, avec persistance triple (cron + `.bashrc` + unité systemd).
- Entrée **par l'app web**, pas par SSH (`auth.log` : 47 connexions réussies ce jour-là = 27× `root` depuis l'IP de Laurent + 11× `digest` depuis les runners GitLab CI, toutes légitimes ; aucune escalade `sudo` vers les commandes hostiles).
- Les 3 autres sites tournent sous `digest` → non atteints. ActionArgent n'était pas encore déployé.

**Confinement (fait et vérifié le 2026-09-10)** :

- [x] crontab root nettoyé (12 → 1 ligne légitime), `sys-health.{service,timer}` supprimés
- [x] compte `pakchoi` + `/etc/sudoers.d/99-pakchoi` + `/home/pakchoi` supprimés
- [x] `/tmp/.n` supprimé ; `docker`/`containerd` **arrêtés et masqués** (outillage de l'attaquant, aucun usage légitime)
- [x] **reboot du droplet** : rien n'est revenu (compte absent, 0 unité `sys-health`, aucune connexion C2) ; caddy + 5 services et les 4 sites remontés seuls (200)

**Reste à faire (par ordre de priorité)** :

- [x] **Déploiement du correctif en production** (2026-09-10) : Next **16.3.4** en **bundle standalone** (`output: "standalone"`, 47 Mo, dépendances tracées incluses), service sur **127.0.0.1:3004**, `NRestarts=0`, endpoints vérifiés (accueil/candidates 200, upload 403, 404).
- [x] **Garde-fous dépendances** (2026-09-10) : `pnpm audit --audit-level=high` **bloquant** (CI + pre-push) et ajouté aux checks obligatoires de `main` ; **Dependabot** (`.github/dependabot.yml`, alertes + correctifs de sécurité automatiques activés sur le repo) ; job **Snyk** en CI (effectif dès que le secret `SNYK_TOKEN` est posé).
- [ ] **Rotation des secrets exposés** (~3 jours de root) : clé OpenAI, credentials Atlas ; token Sentry + bot Telegram (`/root/.sentry-alert.env`) ; clés providers Hermes (`/root/.hermes/`)
- [ ] `agentrecruteur.service` : passer du service **root** à un utilisateur dédié + durcissement systemd (`NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`, `RestrictSUIDSGID`)
- [ ] Activer les **access logs Caddy** (aucun log HTTP conservé → vecteur non prouvé à 100 %)
- [ ] En-têtes de sécurité + **CSP à nonce** (Next 16 permet de le faire dans `proxy.ts`) et **SRI** expérimental — à intégrer au durcissement app
- [ ] sshd : `PermitRootLogin yes` + `PasswordAuthentication yes` → clés uniquement
- [ ] Purger les paquets `docker.io`/`containerd` (aujourd'hui masqués, pas désinstallés)
- [ ] Trancher : **rebuild complet du droplet** (recommandé après une compromission root) vs durcissement sur place
- [ ] Signalements : IP C2 `185.177.72.3:20053` (FR, netname `FR-FBW-NETWORKS-20161110`, abuse `bucklog@tutamail.com`, tutanota = hébergeur tolérant) → DigitalOcean + hébergeur
- [ ] Revérifier périodiquement : `getent passwd` inconnus, `crontab -l`, unités hors périmètre, connexions sortantes

**Correctif appliqué** (branche `security/next-16`) : Next `15.4.6` → **`16.3.4`** (Turbopack par défaut, ESLint flat config native, `next lint` retiré → `eslint`), React/React-DOM `19.1.0` → `19.2.8`, `js-yaml` → `^4.3.2`, `@types/node` 20 → 24, purge des dépendances mortes `unpdf` (`canvas → node-pre-gyp → tar@6.2.1`) et `langchain`/`@langchain/*` avec l'orchestrateur orphelin (`langsmith`, `uuid`), correction du seul défaut de code remonté par le nouveau lint (`setState` synchrone dans un effet — `SparklesCore`). **Audit : 12 vulnérabilités → 0.** Vérifications : lint 0 erreur, typecheck tsgo vert, 29 tests, build Turbopack, smoke test sur serveur de production (accueil 200, `storage: mongodb` + 5 candidats, upload vide 400, 404).
