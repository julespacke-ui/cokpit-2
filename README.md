# Cockpit

Dashboard de suivi de performance pour professionnels de l'automobile (points de vente,
agences de dépôt-vente/intermédiation, indépendants).

Le nom affiché est centralisé dans [`src/lib/config.ts`](src/lib/config.ts) (`APP_NAME`) —
un seul endroit à modifier pour renommer l'application.

## Stack

- **Frontend** : React + Vite + TypeScript + Tailwind CSS
- **Backend** : Supabase (auth, Postgres, storage, Row Level Security)
- **Hébergement** : Vercel

## Rôles

| Rôle | Périmètre |
| --- | --- |
| `admin` | Toutes les agences, benchmark inter-agences, création des comptes et des contenus |
| `gerant` | Son agence, détail par commercial, configuration (barèmes, packs, extensions, objectifs) |
| `commercial` | Ses propres chiffres + classement de son agence |

Le cloisonnement est assuré par les policies Row Level Security côté Supabase,
jamais uniquement côté client.

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis renseigner les deux variables
npm run dev
```

Variables d'environnement nécessaires :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Base de données

Les migrations sont dans [`supabase/migrations/`](supabase/migrations/), à exécuter
dans l'ordre via le SQL Editor de Supabase. Le jeu de données de démonstration est
dans [`supabase/seed/seed.sql`](supabase/seed/seed.sql) (il suppose que les comptes
de démo existent déjà dans Authentication → Users).

La fonction [`supabase/functions/create-compte/`](supabase/functions/create-compte/)
est une Edge Function : elle détient la clé `service_role` et crée les comptes
utilisateurs après vérification des droits de l'appelant.

## Calculs

Toutes les formules dérivées (taux de conversion, rotation de stock, panier moyen,
résistance honoraires, etc.) sont regroupées et commentées dans
[`src/lib/calculs.ts`](src/lib/calculs.ts).
