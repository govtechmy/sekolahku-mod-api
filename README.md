# Sekolahku Mod API

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat&logo=fastify&logoColor=white)](https://fastify.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)](https://bun.sh/)

Lightweight Fastify + Bun backend for the Sekolahku dataset ingestion project. The service exposes API key authenticated endpoints for school management, events (acara), broadcasts (siaran), and data revalidation, with Zod schemas, Swagger docs, and MongoDB persistence.

## 🚀 Features

- **Fastify on Bun** for high throughput and low overhead.
- **Type-safe endpoints** powered by TypeScript + Zod schemas.
- **School catalog CRUD** backed by MongoDB/Mongoose.
- **Events (Acara) and Broadcasts (Siaran) management**.
- **Data revalidation** for dynamic dataproc jobs.
- **Plugin-driven app startup** (security headers, CORS, Swagger, request logging).
- **Structured logging** with Pino and environment-aware formatting.
- **Auto-generated API docs** via Swagger UI.
- **API key authentication** for secure access.

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

## 📊 Data

The project includes school data from the Malaysian Ministry of Education:
- `SenaraiSekolahWeb_Julai2025 - SenaraiSekolahWeb.csv` – Comprehensive list of schools in Malaysia (July 2025)

## ⚙️ Configuration

Create a `.env` file matching `src/config/env.config.ts` expectations:

```env
APP_ENV=development           # development | production | test | local
LOG_LEVEL=debug               # overrides default per env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sekolahku
API_KEY=your-secret-api-key   # required for authentication
```

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `APP_ENV` | No | `local` | Runtime environment |
| `LOG_LEVEL` | No | `debug`/`info` | Pino log level |
| `PORT` | No | `3000` | Fastify listen port |
| `MONGODB_URI` | Yes | – | MongoDB connection string |
| `API_KEY` | Yes | – | API key for authentication |

## 🔧 Scripts

```bash
bun run dev         # watch mode server
bun run start       # production start
bun run typecheck   # tsc --noEmit
bun run lint        # eslint . --ext .ts
bun run lint-fix    # eslint . --ext .ts --fix
bun run test        # run tests
bun run test:coverage # run tests with coverage
```

## 📡 API Overview

### System
- `GET /health` – Liveness + Mongo connection status

### Schools (protected)
- `GET /schools` – List schools (requires `sekolahku-x-api-key` header)
- `GET /schools/:id` – Fetch single school
- `GET /schools/search` – Get schools search suggestions
- `GET /schools/find-nearby` – Get nearby schools by location and radius

### Acara (Events, protected)
- `GET /acara` – List all events
- `GET /acara/:id` – Get event by ID

### Siaran (Broadcasts, protected)
- `GET /siaran` – List all broadcasts
- `GET /siaran/:id` – Get broadcast by ID

### Revalidate (protected)
- `GET /revalidate/:servicePath` – Trigger dynamic dataproc revalidation job

All protected routes require the `sekolahku-x-api-key` header with a valid API key.

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
  -e API_KEY=your-secret-api-key \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/sekolahku" \
  sekolahku-mod-api
```

### Run (production)
```bash
docker run --rm -p 3000:3000 \
  -e APP_ENV=production \
  -e PORT=3000 \
  -e API_KEY=your-secret-api-key \
  -e MONGODB_URI="mongodb://mongo/prod" \
  -e MULTIPLE_ORIGINS="https://app.sekolahku.gov.my,https://admin.sekolahku.gov.my" \
  sekolahku-mod-api
```

Notes:
- Service listens on `0.0.0.0`.
- `MULTIPLE_ORIGINS` must be set when `APP_ENV=production`.

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
  services/      # business logic services (dataproc, geometry, secrets-manager)
  types/         # TypeScript type definitions
  utils/         # utility functions
  scripts/       # maintenance scripts
```

## � Testing

```bash
bun run test              # run all tests
bun run test:coverage     # run tests with coverage report
```

Test files are located in the `tests/` directory, including HTTP request tests (`.http` files) and unit tests (`.test.ts` files).

## �🤝 Contributing

1. Fork & create feature branch (`git checkout -b feature/xyz`)
2. Commit with lint + typecheck passing
3. Open a PR describing changes & testing notes

## 📝 License

Distributed under the terms in [LICENSE](LICENSE).

---

Built with ❤️ using Bun, Fastify, and MongoDB.
