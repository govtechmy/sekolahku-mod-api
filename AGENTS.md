# AGENTS.md — sekolahku-be

Backend API for **SekolahKu** (govtechmy school-information portal). Fastify + Bun + TypeScript, Zod schemas, Mongoose against MongoDB.

## Commands

- `bun run dev` — watch mode (`bun --watch src/server.ts`)
- `bun run typecheck` — `tsc --noEmit`
- `bun test` / `bun run test:coverage` — Bun's built-in test runner
- `bun run lint` / `lint:fix` — ESLint
- `bun scripts/seed-synonyms.ts`, `bun scripts/seed-bantuan.ts` — one-off data seed scripts (see below), run manually, never part of CI/CD

## Deploy

GitHub Actions, branch-triggered (`.github/workflows/deploy-dev.yml`, `deploy-prod.yml`):
- push to `develop` → auto-deploys to **staging** (AWS ECS)
- push to `main` → auto-deploys to **prod** (AWS ECS)

CI only runs `bun run test:coverage` — it does **not** run any seed script. Deploying code never changes database content.

## Infra: AWS runs the app, MongoDB Atlas holds the data

The app runs on AWS ECS and its config is pulled from **AWS Secrets Manager** at boot when `AWS_SECRET_NAME` is set (falls back to `process.env`/local `.env` otherwise — see `src/config/env.config.ts`). But **the database itself is MongoDB Atlas, not an AWS-managed database** (confirmed by `atlas/search-indexes/README.md`, which documents Atlas Search index setup). Two separate connections: `MONGODB_URI` (main `sekolahku` DB) and `MONGODB_URI_PAYLOAD` (CMS `contents` collection, see below).

To run any script or tool against staging/prod data, you need Atlas connection strings from AWS Secrets Manager (or the Atlas console) — a plain `git push` never touches the database, and a machine whose IP isn't allowlisted in Atlas Network Access cannot connect even with the right credentials.

## The API is currently read-only

`acara`, `siaran`, `takwim`, and `schools` all have `create*BodySchema`/`update*BodySchema` Zod schemas defined (`src/schemas/*/request.schema.ts`), but **no route currently registers a POST/PUT/PATCH/DELETE handler for any of them** — every registered route is a `GET`. Don't assume these schemas are dead code to delete; they look like scaffolding for planned admin/CRUD endpoints. Verify with the team before touching them.

## Content data: `BantuanContentModel` is seeded from a CMS export file, not authored in this repo

- `getBantuanList`/`getBantuanBySlug` (`src/controllers/bantuan.controller.ts`) read a single Mongo document (slug = `BANTUAN_LISTING_SLUG`, `src/models/bantuan.model.ts`) whose `content.items` array holds all ~20 program entries — list and detail endpoints both come from this one doc.
- That document is populated by `scripts/seed-bantuan.ts`, which reads a Payload CMS export JSON (`{ collection: "contents", items: [...] }`) and upserts by slug. The script must be **run manually against each environment's database** (staging, then prod) whenever the CMS content changes — there is no automatic sync.
- If the DB was never seeded in an environment, the API returns an empty list / 404s cleanly (no crash) — the frontend shows its empty state, not an error.

## Schema barrel convention

Each `src/schemas/<domain>/index.ts` barrel re-exports from `request.schema.ts`/`response.schema.ts`, but **routes and controllers often import directly from the underlying file instead of the barrel** — a name showing up in the barrel doesn't mean anything actually imports it from there. Before deleting a schema export as "unused," check both the barrel path and the direct file path for real importers; several internal composition schemas (e.g. `BantuanSectionSchema`, `BantuanActionSchema`) are only ever used to build a larger exported schema within the same file, not imported anywhere else — de-export rather than delete those.

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Reference

- Frontend counterpart: `../sekolahku-fe` (see its own AGENTS.md — this API is its sole data source for the school/bantuan/siaran/takwim/acara features).
