# primodaya-crm

Integrated energy-ecosystem CRM (React 19 + Vite SSR + Cloudflare Workers + D1 + Drizzle + Tailwind 4 + Brevo email).
One app, three surfaces: landing `/`, CRM `/crm/*`, DB console `/db/*` — see `PRD.md` §1.1. Task state: `TASKS.md`.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars          # optional — wrangler.jsonc `vars` cover most defaults
npx wrangler d1 migrations apply primodaya-crm-db --local
npm run dev                             # http://localhost:5173 (workerd-emulated, local D1)
```

First visit to `/crm/login` redirects to **first-run setup** → create the Super Admin. Then use the
Team page to invite Sales Managers (Super Admin) and Sales Reps (Manager) by email — locally the
invite URL is also printed in the flash message if delivery fails.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server (Cloudflare Vite plugin, bindings emulated) |
| `npm run build` | Production build (client + SSR worker bundles) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate Drizzle migrations from `db/schema.ts` |
| `npm run db:migrate:local` | Apply migrations to local D1 |
| `npm run db:migrate:remote` | Apply migrations to remote D1 |
| `npm run preview` | `wrangler dev` against the built bundle |

## Go-live checklist (needs a Cloudflare account)

1. `npx wrangler d1 create primodaya-crm-db` → paste the real `database_id` into `wrangler.jsonc`.
2. In Brevo: verify the sender address/domain used by `EMAIL_FROM` and copy the SMTP & API key,
   then `npx wrangler secret put BREVO_API_KEY` (locally: add it to `.dev.vars`).
3. `npm run build && npx wrangler deploy`, then attach custom domain `primodaya.gladia98.com`.
4. Set production vars/secrets (`wrangler secret put` where needed): `MAX_SALES_DISCOUNT=10`,
   `MAX_MANAGER_DISCOUNT=25`, `SUPER_ADMIN_WHATSAPP`, `APP_URL=https://primodaya.gladia98.com`.
5. DB console stays dark until `DB_ADMIN_ENABLED=true` — enable only while actively administering,
   and layer Cloudflare Access on `/db/*` + `/crm/login` if desired.

## Discount governance

Caps are enforced server-side from env vars: Rep ≤ 10%; Manager checkbox on a lead raises the cap
to 25%; every state transition is audit-logged (`audit_logs`).
