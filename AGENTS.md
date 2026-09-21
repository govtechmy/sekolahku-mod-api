# AGENTS.md — sekolahku-be

Backend API for **SekolahKu** (govtechmy school-information portal). Fastify + Bun + TypeScript, Zod schemas, Mongoose against MongoDB.

## Commands

- `bun run dev` — watch mode (`bun --watch src/server.ts`)
- `bun run typecheck` — `tsc --noEmit`
- `bun test` / `bun run test:coverage` — Bun's built-in test runner
- `bun run lint` / `lint:fix` — ESLint
- `bun scripts/seed-synonyms.ts` — one-off data seed script, run manually, never part of CI/CD

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

## Bantuan Persekolahan was removed from this API (Sep 2026)

This API no longer serves Bantuan Persekolahan content. It used to: `getBantuanList`/`getBantuanBySlug` read a single Payload CMS document (slug `bantuan-persekolahan-dan-pembelajaran`) from the shared `contents` collection, whose `content.items` array held all ~20 program entries, and `scripts/seed-bantuan.ts` had to be run manually against each environment to sync CMS changes.

**That whole path is gone.** The frontend now ships the same content as a static `src/data/bantuan.json` checked into `../sekolahku-fe`, so there is no `/bantuan` route, no `BantuanContentModel`, no seed script, and no manual per-environment seeding step for this feature. Removed: `src/routes/bantuan.route.ts`, `src/controllers/bantuan.controller.ts`, `src/models/bantuan.model.ts`, `src/schemas/bantuan/`, `scripts/seed-bantuan.ts`, and the `BantuanSection`/`BantuanAction`/`BantuanItem`/`BantuanContentDoc` types in `src/types/entities.ts`.

Do **not** re-add a `/bantuan` endpoint expecting the frontend to consume it — update `sekolahku-fe`'s JSON instead. Note the unrelated `bantuan?: string | null` field that still exists on school/analytics entities in `src/types/entities.ts`: that is a school *classification* value, a different concept entirely, and must not be removed.

The `MONGODB_URI_PAYLOAD` connection (`payloadConnection`) is still live and used by other CMS-backed models — removing Bantuan did not retire it.

## Schema barrel convention

Each `src/schemas/<domain>/index.ts` barrel re-exports from `request.schema.ts`/`response.schema.ts`, but **routes and controllers often import directly from the underlying file instead of the barrel** — a name showing up in the barrel doesn't mean anything actually imports it from there. Before deleting a schema export as "unused," check both the barrel path and the direct file path for real importers; some internal composition schemas are only ever used to build a larger exported schema within the same file, not imported anywhere else — de-export rather than delete those.

## graphify

This project has a knowledge graph at `graphify-out/` (`graph.json`, `graph.html`, `GRAPH_REPORT.md`) with god nodes, community structure, and cross-file relationships. Last rebuild: 648 nodes / 1000 edges / 110 communities, after the Bantuan removal.

Installed via `uv` at `~/.local/bin/graphify` with its own bundled Python 3.13 — **not** the system `python3`, which is Xcode's 3.9.6 and below graphify's 3.10+ floor, so a plain `pip install graphifyy` fails on this machine. Use the `graphify` binary directly.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost, no LLM). Deleting files does not remove their nodes until you re-run this.

## Reference

- Frontend counterpart: `../sekolahku-fe` (see its own AGENTS.md). This API is its data source for the school, siaran, takwim, and acara features — but **not** bantuan, which the frontend now serves from its own static JSON.
