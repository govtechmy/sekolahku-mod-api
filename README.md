# Sekolahku Mod API

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat&logo=fastify&logoColor=white)](https://fastify.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)](https://bun.sh/)

Lightweight Fastify + Bun backend for the Sekolahku dataset ingestion project. The service exposes Auth + School management APIs with JWT auth, Zod schemas, Swagger docs, and MongoDB persistence.

## 🚀 Features

- **Fastify on Bun** for high throughput and low overhead.
- **Type-safe endpoints** powered by TypeScript + Zod schemas.
- **JWT Authentication** with access/refresh tokens and role guards.
- **School catalog CRUD** backed by MongoDB/Mongoose.
- **Plugin-driven app startup** (security headers, CORS, Swagger, request logging).
- **Structured logging** with Pino and environment-aware formatting.
- **Auto-generated API docs** via Swagger UI.

## 📋 Prerequisites

- [Bun](https://bun.sh/) v1.2.20+
- [Node.js](https://nodejs.org/) v18+ (TypeScript tooling)
- [MongoDB](https://www.mongodb.com/) v6+

## 🛠️ Installation

```bash
git clone https://github.com/your-org/sekolahku-mod-api.git
cd sekolahku-mod-api
bun install
```

## ⚙️ Configuration

Create a `.env` file matching `src/config/env.config.ts` expectations:

```env
APP_ENV=development           # development | production | test | local
LOG_LEVEL=debug               # overrides default per env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sekolahku
JWT_SECRET=change_me
REFRESH_TOKEN_SECRET=change_me_too
FRONTEND_ORIGIN=http://localhost:5173 # required only in production
```

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `APP_ENV` | No | `local` | Runtime environment |
| `LOG_LEVEL` | No | `debug`/`info` | Pino log level |
| `PORT` | No | `3000` | Fastify listen port |
| `MONGODB_URI` | Yes | – | MongoDB connection string |
| `JWT_SECRET` | Yes | – | Access token signing secret |
| `REFRESH_TOKEN_SECRET` | Yes | – | Refresh token signing secret |
| `FRONTEND_ORIGIN` | Yes (prod) | – | Allowed CORS origin |

## 🔧 Scripts

```bash
bun run dev         # watch mode server
bun run start       # production start
bun run typecheck   # tsc --noEmit
bun run lint        # eslint . --ext .ts
bun run seed        # seed MongoDB with sample accounts
```

## 📡 API Overview

### Health
- `GET /health` – Liveness + Mongo connection status

### Auth
- `POST /auth/login` – username/password login
- `POST /auth/refresh` – refresh access token
- `POST /auth/logout` – invalidate session client-side

### Schools (protected)
- `GET /schools` – list schools (requires `Authorization: Bearer`)
- `POST /schools` – create school record
- `GET /schools/:id` – fetch single school

All protected routes expect `Authorization: Bearer <token>` and validate request/response via Zod schemas.

## 🐳 Docker

### Build
```bash
docker build -t sekolahku-mod-api .
```

### Run (development)
```bash
docker run --rm -p 3000:3000 \
  -e APP_ENV=development \
  -e PORT=3000 \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/sekolahku" \
  -e JWT_SECRET="dev_jwt_secret" \
  -e REFRESH_TOKEN_SECRET="dev_refresh_secret" \
  sekolahku-mod-api
```

### Run (production)
```bash
docker run --rm -p 3000:3000 \
  -e APP_ENV=production \
  -e PORT=3000 \
  -e MONGODB_URI="mongodb://mongo/prod" \
  -e JWT_SECRET="super_secret" \
  -e REFRESH_TOKEN_SECRET="super_refresh_secret" \
  -e FRONTEND_ORIGIN="https://app.sekolahku.gov.my" \
  sekolahku-mod-api
```

Notes:
- Service listens on `0.0.0.0`.
- `FRONTEND_ORIGIN` must be set when `APP_ENV=production`.

## 🧱 Project Structure

```
src/
  config/        # env + logger + DB connectors
  plugins/       # Fastify plugins (env, security, swagger, logging)
  middleware/    # auth + error handlers
  schemas/       # zod schemas per domain
  controllers/   # request handlers
  routes/        # Fastify route registrations
  models/        # Mongoose models
  scripts/       # maintenance scripts (seed)
```

## 🤝 Contributing

1. Fork & create feature branch (`git checkout -b feature/xyz`)
2. Commit with lint + typecheck passing
3. Open a PR describing changes & testing notes

## 📝 License

Distributed under the terms in [LICENSE](LICENSE).

---

Built with ❤️ using Bun, Fastify, and MongoDB.
