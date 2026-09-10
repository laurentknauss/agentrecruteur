# Déploiement sur VPS (Caddy + systemd) — état vérifié le 2026-09-10

App **unique Next.js 16** : l'UI **et** l'API (`/api/*`) sont servies par le même serveur (App Router).
Pas de backend Express, pas de second process.

- **Dev local** : `pnpm dev` → port **3000**
- **Production** : `agentrecruteur.service` → port **3004**, écoute **127.0.0.1 seulement** (Caddy fait le frontal)
- **Cible** : `/srv/agentrecruteur` — bundle **standalone** produit par le build local
- **Droplet** : 2 Go RAM / 1 vCPU → **le build se fait toujours en local**, jamais sur le serveur

## 1) DNS — DigitalOcean

Vérifié : zone `agentrecruteur.fr` chez DigitalOcean (NS `ns1/ns2/ns3.digitalocean.com`),
A `@` et A `www` → `209.38.207.109`.

```bash
dig NS agentrecruteur.fr +short
dig A  agentrecruteur.fr +short
```

## 2) Prérequis VPS

Node.js >= 20.9 (Next 16) + Caddy (service actif). **pnpm n'est pas requis en production** :
le bundle standalone embarque ses dépendances.

## 3) Service systemd (unité unique, telle que déployée)

`/etc/systemd/system/agentrecruteur.service` :

```ini
[Unit]
Description=Agent Recruteur (Next.js standalone - UI + API)
After=network.target

[Service]
WorkingDirectory=/srv/agentrecruteur/frontend
Environment=NODE_ENV=production
Environment=PORT=3004
Environment=HOSTNAME=127.0.0.1
EnvironmentFile=-/srv/agentrecruteur/.env.local
ExecStart=/usr/bin/env node /srv/agentrecruteur/frontend/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now agentrecruteur
```

> Le serveur standalone est `server.js` (pas `next start`). `HOSTNAME=127.0.0.1` est **obligatoire** :
> sans lui, le serveur standalone écoute sur `0.0.0.0` et court-circuite le frontal Caddy.

## 4) Caddy

Bloc réellement actif dans `/etc/caddy/Caddyfile` (identique à `deploy/Caddyfile.agentrecruteur.example`) :

```caddyfile
agentrecruteur.fr, www.agentrecruteur.fr {
  reverse_proxy 127.0.0.1:3004
}
```

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Le TLS (Let's Encrypt) est géré automatiquement par Caddy.

## 5) Déploiement (build local → rsync du bundle → restart)

`next.config.ts` active `output: "standalone"` avec `outputFileTracingRoot` sur la racine du
monorepo : le build produit un bundle **auto-suffisant** (47 Mo, dépendances tracées incluses,
`mongoose` compris) sous `frontend/.next/standalone/`.

```bash
# 1. Build local (à la racine du dépôt)
pnpm build

# 2. Assemblage de la layout de production (Next n'embarque ni static ni public)
cd frontend
cp -r .next/static .next/standalone/frontend/.next/static
cp -r public      .next/standalone/frontend/public
cd ..

# 3. Envoi du bundle (app + store embarqué)
cd /home/laurent/professionnel/agentrecruteur
rsync -az --delete frontend/.next/standalone/frontend/ \
  root@209.38.207.109:/srv/agentrecruteur/frontend/
rsync -az --delete frontend/.next/standalone/node_modules/ \
  root@209.38.207.109:/srv/agentrecruteur/node_modules/

# 4. Restart
ssh root@209.38.207.109 'systemctl restart agentrecruteur.service'
```

- Le store embarqué est envoyé à `/srv/agentrecruteur/node_modules` : les liens du bundle
  (`frontend/node_modules/next → ../../node_modules/.pnpm/...`) se résolvent ainsi **à l'intérieur**
  du déployé.
- `.next/static` et `public` ne sont pas inclus dans le bundle par Next : la copie de l'étape 2 est
  indispensable (sinon CSS/JS 404).
- Le `.env.local` du serveur (`/srv/agentrecruteur/.env.local`) n'est **jamais** touché par ces
  rsync (hors des chemins synchronisés) ; il est lu par systemd via `EnvironmentFile`.

## 6) Mode démo (protection crédits OpenAI)

- `DEMO_LOCK=1` + `NEXT_PUBLIC_DEMO_LOCK=1` dans `/srv/agentrecruteur/.env.local`
  → `POST /api/upload-cv` et `POST /api/candidate/:id/ask` renvoient **403** (aucune dépense OpenAI).
- UI : header « Sign up / Login » → modal « Contactez Laurent Knauss… » (aucune auth réelle).

## 7) Variables d'environnement

`frontend/.env.example` liste les clés ; côté serveur `/srv/agentrecruteur/.env.local` contient :
`OPENAI_API_KEY`, `GPT_MODEL`, `MONGODB_ATLAS_URI`, `MONGODB_DATABASE`, `DEMO_LOCK`, `NEXT_PUBLIC_DEMO_LOCK`.

## 8) Vérifications post-déploiement

```bash
curl -s https://agentrecruteur.fr/api/health            # status OK (storage: mongodb attendu — cf. TODO.md §2)
curl -s -o /dev/null -w '%{http_code}\n' https://agentrecruteur.fr/                     # 200
curl -s -o /dev/null -w '%{http_code}\n' https://agentrecruteur.fr/api/candidates        # 200
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://agentrecruteur.fr/api/upload-cv # 403 en démo
ssh root@209.38.207.109 'systemctl is-active agentrecruteur.service; systemctl show -p NRestarts --value agentrecruteur.service'
```

`NRestarts` doit rester à **0** : une valeur qui grimpe = crash-loop (lire `journalctl -u agentrecruteur`).

## 9) Pièges (incident du 2026-09-10)

**Ne jamais** déployer le `node_modules` du poste de build ni installer les dépendances côté serveur.
Turbopack référence les externes du serveur via des alias créés au build :
`.next/node_modules/<pkg>-<hash> → ../../../node_modules/.pnpm/<pkg>@<version>_<peer>/…`.
Ce chemin est **relatif au poste de build** :

- rsync de `frontend/` (symlinks pnpm inclus) → liens cassés sur le serveur ;
- `pnpm install` côté serveur → résolution différente (`mongoose@8.24.4` au lieu de
  `8.24.3_supports-color@8.1.1`) → `Cannot find module mongoose-<hash>` → **500 sur toutes les routes API**.

`output: "standalone"` supprime la classe entière de panne : Next trace et copie les dépendances
réellement utilisées, avec des chemins qui se résolvent à l'intérieur du bundle déployé.
Le mode standalone est donc **requis**, pas une optimisation.
