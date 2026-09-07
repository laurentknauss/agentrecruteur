# Déploiement sur VPS (Caddy + systemd)

App **unique Next.js** : l'UI **et** l'API (`/api/*`) sont servies par le même serveur sur le **port 3000**
(App Router). Pas de backend Express séparé → un seul process, un seul port.

## 1) DNS — DigitalOcean Nameservers

La zone `agentrecruteur.fr` est gérée chez DigitalOcean (NS ns1/2/3.digitalocean.com) :
- A `agentrecruteur.fr` → <IP_VPS>
- A `www.agentrecruteur.fr` → <IP_VPS>

## 2) Prérequis VPS

Node.js >= 20 + pnpm + Caddy (service actif). Cible : `/srv/agentrecruteur`.

## 3) Service systemd (unique)

`/etc/systemd/system/agentrecruteur.service` :
```ini
[Unit]
Description=Agent Recruteur (Next.js UI + API)
After=network.target

[Service]
WorkingDirectory=/srv/agentrecruteur
Environment=NODE_ENV=production
ExecStart=/usr/bin/env pnpm start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now agentrecruteur
```

## 4) Caddy

Ajouter dans `/etc/caddy/Caddyfile` le bloc de `deploy/Caddyfile.agentrecruteur.example` :
```caddyfile
agentrecruteur.fr, www.agentrecruteur.fr {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
```
```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 5) Déploiement (rsync)

```bash
rsync -avz --delete \
  --exclude=node_modules --exclude=.next --exclude=.env* \
  ./frontend/ user@<IP_VPS>:/srv/agentrecruteur/

ssh user@<IP_VPS> 'cd /srv/agentrecruteur && pnpm install && pnpm build && sudo systemctl restart agentrecruteur'
```

## 6) Mode démo (protection crédits OpenAI)

- `DEMO_LOCK=1` dans `/srv/agentrecruteur/.env.local` → `POST /api/upload-cv` et
  `POST /api/candidate/:id/ask` renvoient **403** (aucune dépense OpenAI). Le `.env.local` est copié
  une seule fois sur le VPS (jamais en CI, jamais commité).
- Frontend : header « Sign up / Login » → modal « Contactez Laurent Knauss… » (aucune auth réelle).

## 7) Envoyer le fichier d'environnement

`frontend/.env.local` doit exister côté serveur (voir `frontend/.env.example`-équivalent dans le repo
si besoin) : `OPENAI_API_KEY`, `GPT_MODEL`, `MONGODB_ATLAS_URI`, `MONGODB_DATABASE`, `DEMO_LOCK`.
