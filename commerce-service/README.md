# SEEKUPERFUMES Commerce Service

TypeScript, Express and Mongoose operational backend with a branded admin interface. MongoDB is the authoritative store for catalog, pricing, inventory, orders, payments, CMS and customer operations.

## Local setup

MongoDB must run as a replica set because inventory/order workflows use transactions. The root `docker-compose.yml` configures a private single-node replica set, an application-scoped MongoDB user, Redis and this service.

```bash
docker compose up -d mongodb mongo-init redis commerce
docker compose exec commerce npm run seed
docker compose exec commerce npm run create-admin -- owner@example.com 'use-a-long-password' 'Owner'
```

Admin: `http://localhost:4100/admin/login`
API health: `http://localhost:4100/health`

For a bare-metal server, install MongoDB 8 and MongoDB Database Tools, enable a replica set and authentication, bind only to localhost/private interfaces, then copy `.env.example` to the service manager’s secret store.

## Commands

```bash
npm run build
npm test
npm run seed
npm run backup
npm run restore -- backups/<timestamp>/seekuperfumes
```

Never commit `.env`, backup archives or uploaded originals. Rotate initial credentials before exposing the service.

