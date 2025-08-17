# Sekolahku Alpha (Prototype Research)

This repository is a lightweight prototype to explore a multi‑school (tenant) setup using Payload CMS and Next.js. Each school is a tenant; content shown on the landing page changes based on the selected school.

## What’s included

- Tenants as schools (collection: `tenants`)
- Articles per school (collection: `articles`)
- School introduction per school (collection: `school-intros`)
- Public landing page with a school selector modal that updates introduction and article list by school

Note: This is a prototype for research. Auth, roles, and access rules are intentionally minimal.

## Getting started

1. Copy env: `cp .env.example .env`
2. Set `DATABASE_URI` and `PAYLOAD_SECRET` in `.env`
3. Start dev: `pnpm dev`
4. Open `http://localhost:3000`
5. Admin: `http://localhost:3000/admin`

### Seeded user

- Email: `demo@payloadcms.com`
- Password: `demo`

## Prototype behavior

- Landing page navbar: “Select School” opens a modal to pick a school
- Selected school persists locally and drives queries to `/api` for that school’s intro and article list
- Reads are public in this prototype; separation is achieved by tenant relationships and query scoping

## Notes

- This is not production-ready. Access control and validation are simplified for demo purposes.
- Structure and naming may change as the prototype evolves.
