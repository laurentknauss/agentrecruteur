# Déploiement sur VPS (Caddy + systemd) — état vérifié le 2026-09-10

App **unique Next.js** : l'UI **et** l'API (`/api/*`) sont servies par le même serveur (App Router).
Pas de backend Express, pas de second process.

- **Dev local** : `pnpm dev` → port **3000**
- **Production** : `agentrecruteur.service` → port **3004** (le VPS héberge d'autres sites sur 3000–3003)
- **Cible** : `/srv/agentrecruteur` — **copie rsync** du contenu de `frontend/` (ce n'est pas un clone git)

## 1) DNS — DigitalOcean

Vérifié : zone `agentrecruteur.fr` chez DigitalOcean (NS `ns1/ns2/ns3.digitalocean.com`),
A `@` et A `www` → `209.38.207.109`.

```bash
dig NS agentrecruteur.fr +short
dig A  agentrecruteur.fr +short
```

## 2) Prérequis VPS

Node.js >= 20 + pnpm + Caddy (service actif).

## 3) Service systemd (unité unique, telle que déployée)

`/etc/systemd/system/agentrecruteur.service` :

```ini
[Unit]
Description=Agent Recruteur (Next.js UI + API)
After=network.target

[Service]
WorkingDirectory=/srv/agentrecruteur
Environment=NODE_ENV=production
EnvironmentFile=-/srv/agentrecruteur/.env.local
ExecStart=/usr/bin/env node /srv/agentrecruteur/node_modules/next/dist/bin/next start -p 3004
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

## 5) Déploiement (build local → rsync → restart)

Le build se fait **hors VPS** (pas de build dans la CI, pas de build sur le serveur) :

```bash
# 1. Build local
pnpm build                      # à la racine du repo (fait le build de frontend/)

# 2. Envoi du contenu de frontend/ (build + node_modules inclus, .env.local préservé)
rsync -avz --delete \
  --exclude=.env.local --exclude=.git \
  frontend/ root@209.38.207.109:/srv/agentrecruteur/

# 3. Restart
ssh root@209.38.207.109 'systemctl restart agentrecruteur.service'
```

Le `.env.local` du serveur n'est copié **qu'une fois** (jamais en CI, jamais commité) ; l'exclusion
ci-dessus évite de l'écraser.

## 6) Mode démo (protection crédits OpenAI)

- `DEMO_LOCK=1` + `NEXT_PUBLIC_DEMO_LOCK=1` dans `/srv/agentrecruteur/.env.local`
  → `POST /api/upload-cv` et `POST /api/candidate/:id/ask` renvoient **403** (aucune dépense OpenAI).
- UI : header « Sign up / Login » → modal « Contactez Laurent Knauss… » (aucune auth réelle).

## 7) Variables d'environnement

`frontend/.env.example` liste les clés ; côté serveur `/srv/agentrecruteur/.env.local` contient :
`OPENAI_API_KEY`, `GPT_MODEL`, `MONGODB_ATLAS_URI`, `MONGODB_DATABASE`, `DEMO_LOCK`, `NEXT_PUBLIC_DEMO_LOCK`.

## 8) Vérifications post-déploiement

```bash
curl -s https://agentrecruteur.fr/api/health      # storage: mongodb attendu (cf. TODO.md §1)
curl -I https://agentrecruteur.fr | grep -i ^server   # server: Caddy
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://agentrecruteur.fr/api/upload-cv  # 403 en démo
ssh root@209.38.207.109 'systemctl is-active agentrecruteur.service'
```
