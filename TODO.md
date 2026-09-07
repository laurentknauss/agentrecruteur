# TODO — DNS & Déploiement agentrecruteur.fr (VPS Caddy)

## 0) Rappels (faits vérifiés)
- [x] bullionradar.fr — NS: ns1/ns2/ns3.digitalocean.com (DO autorité), A: 209.38.207.109 (VPS), Server: Caddy.
- [x] agentrecruteur.fr — NS: ns81/ns82.domaincontrol.com (GoDaddy autorité), A: 3.33.130.190, 15.197.148.33 (AWS), DO: aucune zone.

Commandes de vérif (références):
```bash
# BullionRadar
 dig NS bullionradar.fr +short
 dig A  bullionradar.fr +short
 curl -I https://bullionradar.fr | grep -i ^server
 # Preuve DO autoritatif
 dig @ns1.digitalocean.com bullionradar.fr A +short

# AgentRecruteur
 dig NS agentrecruteur.fr +short
 dig A  agentrecruteur.fr +short
 curl -I https://agentrecruteur.fr | grep -i ^server
 # Preuve que DO n’a pas de zone
 dig @ns1.digitalocean.com agentrecruteur.fr A +short
```

## 1) Choisir la voie DNS (une seule)
- [ ] Option A — Garder GoDaddy comme autorité DNS (simple & rapide)
- [ ] Option B — Reproduire le schéma BullionRadar (NS DigitalOcean + zone DO)

## 2) Option A — GoDaddy uniquement (DSN géré chez GoDaddy)
- [ ] Mettre à jour les enregistrements A chez GoDaddy (zone agentrecruteur.fr)
  - [ ] A agentrecruteur.fr → 209.38.207.109 (TTL 300s recommandé)
  - [ ] A www.agentrecruteur.fr → 209.38.207.109 (TTL 300s recommandé)
  - [ ] Supprimer/écraser les A existants: 3.33.130.190, 15.197.148.33
- [ ] Attendre la propagation DNS (typiquement 5–30 min selon TTL et résolveurs)
- [ ] Vérifier:
  - [ ] `dig A agentrecruteur.fr +short` → 209.38.207.109
  - [ ] `curl -I https://agentrecruteur.fr | grep -i ^server` → `Server: Caddy`

## 3) Option B — Comme BullionRadar (NS DO + zone DO)
- [ ] Chez GoDaddy (agentrecruteur.fr) — changer les NS vers:
  - [ ] ns1.digitalocean.com
  - [ ] ns2.digitalocean.com
  - [ ] ns3.digitalocean.com
- [ ] Chez DigitalOcean → Networking → Domains — ajouter `agentrecruteur.fr`
  - [ ] Créer A agentrecruteur.fr → 209.38.207.109 (TTL 300s recommandé)
  - [ ] Créer A www.agentrecruteur.fr → 209.38.207.109 (TTL 300s recommandé)
- [ ] Attendre propagation (NS change = propagation plus longue, prévoir 30 min → 24 h)
- [ ] Vérifier:
  - [ ] `dig NS agentrecruteur.fr +short` → ns1/ns2/ns3.digitalocean.com
  - [ ] `dig @ns1.digitalocean.com agentrecruteur.fr A +short` → 209.38.207.109
  - [ ] `curl -I https://agentrecruteur.fr | grep -i ^server` → `Server: Caddy`

## 4) Côté VPS (déjà prêt, à confirmer)
- [ ] Caddy — ajouter le bloc reverse proxy (TLS auto):
```caddyfile
agentrecruteur.fr, www.agentrecruteur.fr {
  encode gzip
  @api path /api/*
  handle @api { reverse_proxy 127.0.0.1:3001 }
  handle { reverse_proxy 127.0.0.1:3000 }
}
```
- [ ] `sudo caddy fmt --overwrite /etc/caddy/Caddyfile && sudo systemctl reload caddy`
- [ ] Déploiement app (/srv/agentrecruteur): voir `deploy/README.md`
  - [ ] `pnpm install -w`
  - [ ] `cd frontend && pnpm run build`
  - [ ] Services systemd: `agentrecruteur-frontend`, `agentrecruteur-backend`

## 5) Mode démo (protection crédits OpenAI)
- [ ] Backend: `DEMO_LOCK=1` actif (bloque POST `/api/upload-cv` et `/api/candidate/:id/ask`)
- [ ] Tests (doivent renvoyer 403):
```bash
curl -i -F 'cv=@dummy.pdf;type=application/pdf' https://agentrecruteur.fr/api/upload-cv
curl -i -H 'Content-Type: application/json' \
  -d '{"question":"test"}' https://agentrecruteur.fr/api/candidate/TESTID/ask
```
- [ ] Frontend: header “Sign up / Login” → modal “Contactez Laurent Knauss…” (aucune logique Clerk)
- [ ] (Optionnel) NEXT_PUBLIC_DEMO_LOCK côté front pour désactiver visuellement les CTA

## 6) Notes importantes
- [ ] Toujours créer “www” en plus de l’Apex (A www.agentrecruteur.fr → 209.38.207.109)
- [ ] TTL: 300s recommandé pendant les bascules (propagation plus rapide), remonter ensuite si souhaité
- [ ] Propagation: prévoir 5–30 min (A records), jusqu’à 24 h pour un changement de NS
- [ ] En cas de passage à NS DO (Option B), **obligatoire** d’ajouter la zone et les A chez DO, sinon le domaine ne résoudra pas

## 7) Livrables de configuration (copier-coller)
- **GoDaddy (Option A)** — Zone agentrecruteur.fr:
  - Type A — Name: `@` — Value: `209.38.207.109` — TTL: `300`
  - Type A — Name: `www` — Value: `209.38.207.109` — TTL: `300`

- **DigitalOcean (Option B)** — Zone agentrecruteur.fr:
  - Type A — Hostname: `@` — Will direct to: `209.38.207.109` — TTL: `300`
  - Type A — Hostname: `www` — Will direct to: `209.38.207.109` — TTL: `300`

## 8) Vérification finale (check-list)
- [ ] `dig A agentrecruteur.fr +short` → 209.38.207.109
- [ ] `dig A www.agentrecruteur.fr +short` → 209.38.207.109
- [ ] `curl -I https://agentrecruteur.fr | grep -i ^server` → `Server: Caddy`
- [ ] `curl -I https://www.agentrecruteur.fr | grep -i ^server` → `Server: Caddy`
- [ ] (Démo) Upload/Q&A → 403 + message d’accès restreint
