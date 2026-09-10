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

- [ ] Audit outil : vulns transitives (Next→postcss, unpdf→canvas→tar) ; montées mineures (Next 16, LangChain 0.5) — évaluées plus tard.
- [ ] (Le cas échéant) base `backend/` : `backend/.env` existe encore alors que le serveur Express a été supprimé (§ _Architecture_ de `AGENTS.md`) — vérifier qu'il n'est plus référencé et le retirer du disque local.

## 8) Rappels ops

- Ne **jamais** committer sur `main` : branche + PR + checks verts, puis `gh pr merge --squash --delete-branch`.
- Déploiement : build **local** → rsync → `systemctl restart agentrecruteur.service` (pas de déploiement CI).
- Secrets : jamais dans un fichier tracké (`.env.local` uniquement) ; un secret exposé doit être purgé **et** révoqué.
