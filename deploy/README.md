# Déploiement sur VPS (Caddy + systemd)

Ce projet se déploie sur un VPS (DigitalOcean) avec Caddy en reverse proxy TLS.
Objectif: vitrine démo protégée (pas de consommation OpenAI en prod démo).

## 1) DNS — DigitalOcean Nameservers

Si votre domaine `agentrecruteur.fr` pointe chez GoDaddy/Namecheap mais **utilise les NS DigitalOcean**
(`ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com`) :
- Ajoutez la zone DNS dans le dashboard DO → Networking → Domains
- Créez les enregistrements:
  - A `agentrecruteur.fr` → <IP_VPS>
  - A `www.agentrecruteur.fr` → <IP_VPS>

Sinon, remplacez les nameservers du domaine par ceux de DigitalOcean puis ajoutez la zone.

## 2) Disposition côté VPS

Cible: `/srv/agentrecruteur/`

```
/srv/agentrecruteur
├─ frontend/           # Next.js (.next/ en prod)
└─ backend/            # Express (TypeScript via tsx)
```

Prérequis sur le VPS:
- Node.js >= 20 (fnm/nvm ou apt) + pnpm
- Caddy installé (service systemd actif)

## 3) Services systemd

Copiez les unit-files suivants (adapter `User`, `Group`, chemins Node/pnpm si besoin):

- `/etc/systemd/system/agentrecruteur-backend.service`
```
[Unit]
Description=Agent Recruteur API (Express)
After=network.target

[Service]
WorkingDirectory=/srv/agentrecruteur
Environment=NODE_ENV=production
Environment=DEMO_LOCK=1
# Pas d'OPENAI_API_KEY en démo → DEMO_LOCK protège les endpoints coûteux
ExecStart=/usr/bin/env pnpm --filter backend run dev
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

- `/etc/systemd/system/agentrecruteur-frontend.service`
```
[Unit]
Description=Agent Recruteur Frontend (Next.js)
After=network.target

[Service]
WorkingDirectory=/srv/agentrecruteur/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/env pnpm --filter frontend run start -- -p 3000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Activez-les:
```
sudo systemctl daemon-reload
sudo systemctl enable --now agentrecruteur-backend.service agentrecruteur-frontend.service
sudo systemctl status agentrecruteur-*.service
```

> Note: `backend` tourne via `tsx` (script `dev`). Pour une prod stricte, on peut ajouter une étape build TS → JS puis `node dist/server.js`.

## 4) Caddy (TLS + reverse proxy)

Ajoutez ce bloc dans `/etc/caddy/Caddyfile`:

```
agentrecruteur.fr, www.agentrecruteur.fr {
  encode gzip

  @api path /api/*
  handle @api {
    reverse_proxy 127.0.0.1:3001
  }

  handle {
    reverse_proxy 127.0.0.1:3000
  }
}
```

Rechargez Caddy:
```
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
```

## 5) Déploiement (rsync)

Depuis votre machine locale (adapter l'hôte):

```
rsync -avz --delete \
  --exclude=node_modules \
  --exclude=.next \
  ./frontend/ user@<IP_VPS>:/srv/agentrecruteur/frontend/

rsync -avz --delete \
  --exclude=node_modules \
  ./backend/ user@<IP_VPS>:/srv/agentrecruteur/backend/

ssh user@<IP_VPS> 'cd /srv/agentrecruteur && pnpm install -w && cd frontend && pnpm run build && sudo systemctl restart agentrecruteur-frontend agentrecruteur-backend'
```

## 6) Mode démo (protection crédits)

- `DEMO_LOCK=1` côté backend → bloque `POST /api/upload-cv` et `POST /api/candidate/:id/ask` (renvoie 403 avec message de contact)
- Le frontend affiche “Sign up / Login” dans le header et un modal “Contactez Laurent Knauss …” (aucune logique d'auth réelle)

## 7) Backend .env (si vous levez le verrou plus tard)

Voir `backend/.env.example`.

- Pour la démo: **ne définissez pas** OPENAI_API_KEY (gardez `DEMO_LOCK=1`).
- En full-feature: ajoutez `OPENAI_API_KEY`, `MONGODB_ATLAS_URI`, `MONGODB_DATABASE` et retirez `DEMO_LOCK`.
