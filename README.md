# Ndox & Naatal — Next.js

Tableau de bord IoT agricole. Remplace Flask par Next.js (App Router + API Routes) pour déploiement Vercel.

## Stack
- **Frontend** : Next.js 15 (React, App Router)
- **API** : Next.js Route Handlers (remplace Flask)
- **Base de données** : SQLite via `better-sqlite3` (fichier `/tmp/ndox_naatal.db` sur Vercel)
- **ESP32** : `POST /api/esp32` inchangé

## Développement local

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Déploiement Vercel

```bash
vercel deploy
```

> ⚠️ Sur Vercel, la base SQLite est dans `/tmp` (éphémère). Pour persister les données, migrer vers Vercel Postgres ou Neon.

## Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/catalog` | Cultures et phases |
| GET | `/api/dashboard` | Snapshot temps réel |
| POST | `/api/settings` | Changer culture/phase |
| POST | `/api/pump` | Démarrer/arrêter pompe |
| POST | `/api/simulation/reset` | Réinitialiser simulation |
| GET | `/api/notifications` | Liste notifications |
| POST | `/api/notifications/read` | Marquer lu |
| GET | `/api/history` | Historique mesures |
| POST | `/api/esp32` | Données capteur ESP32 |
