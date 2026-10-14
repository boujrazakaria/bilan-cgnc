# Bilan CGNC (Next.js + Postgres/Neon)
1. Vercel > projet > Storage > Create > Neon (Postgres) : ajoute DATABASE_URL automatiquement.
2. Redéployer : vercel --prod
En local : créer .env.local avec DATABASE_URL=... puis npm install && npm run dev
Les tables et les comptes CGNC sont créés automatiquement au premier chargement.
