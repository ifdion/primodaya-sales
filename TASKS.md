# primodaya-crm — Task Breakdown

Derived from `PRD.md`. Each task references its source section. Sizes: **S** (< 0.5d) / **M** (0.5–2d) / **L** (2–5d).

---

## Epic 0 — Platform Foundation (PRD §1, §6)

- [x] **0.1** Scaffold React 19 + Vite + TypeScript app with `@cloudflare/vite-plugin` (SSR on Cloudflare Pages) — **M**
- [x] **0.2** Configure Tailwind CSS — **S**
- [ ] **0.3** Provision Cloudflare D1 instance + bind in `wrangler.jsonc` (`DB`) — **S**
- [ ] **0.4** Configure Brevo: verify `EMAIL_FROM` sender (domain or address) in Brevo, then `npx wrangler secret put BREVO_API_KEY` — **S**
- [x] **0.5** Set governance env vars `MAX_SALES_DISCOUNT=10`, `MAX_MANAGER_DISCOUNT=25` (`.dev.vars` local + Pages project vars/secret) — **S**
- [ ] **0.6** Create Pages project, attach custom domain `primodaya.gladia98.com`, confirm DNS/TLS — **S**
- [x] **0.7** Central typed config/env module (reads bindings + vars; fails fast if missing) — **S**
- [ ] **0.8** CI/CD deploy pipeline (preview + production branches) — **M**
- [ ] **0.9** Mount the three app surfaces in one router per PRD §1.1: SSR landing at `/`, CRM at `/crm/*`, DB console at `/db/*` (layout prefixes, asset/base paths, clean 404s) — **M**

**DoD:** placeholder routes render at `/`, `/crm/*`, and `/db/*` on the custom domain; bindings visible in runtime.

---

## Epic 1 — Data Layer (PRD §7, §2)

- [x] **1.1** Install & configure Drizzle ORM + `drizzle-kit` for D1/SQLite — **S**
- [x] **1.2** Define `accounts` table (`id`, `name`, `email` unique, `role` enum `SUPER_ADMIN|SALES_MANAGER|SALES`, `createdBy`, `createdAt`) — **S**
- [x] **1.3** Define `leads` table (all fields from PRD §7: `offerId` unique, lead contact fields, `evBrand`, `evModel`, `purchaseDate`, `productTier` enum, rep/manager FKs, `price`, `discount`, `allowManagerDiscount`, `validityDate`, `viewedAt`, `status` enum) — **M**
- [x] **1.4** Generate + apply initial migration; set up migration workflow — **S**
- [x] **1.5** Product catalog module: tier constants per PRD §2 (COMPACT/CORE/ULTRA — components, list price, launch price, defaults) — **S**
- [x] **1.6** Seed script: bootstrap Super Admin account + catalog reference data — **S**
- [x] **1.7** Query helpers/repo layer: create lead, find by offer id, update status/viewed_at/discount — **M**
- [x] **1.8** `offer_id` generator (unique, URL-safe, unguessable slug) + unit test — **S**

**DoD:** schema matches PRD §7 exactly; `drizzle query` round-trips in local dev (`getPlatformProxy`).

---

## Epic 2 — Authentication & RBAC (PRD §4, §9.1, §5.1)

- [x] **2.1** Session-based auth (Lucia or cookie sessions backed by D1): login, logout, password hashing (argon2/scrypt) — **L**
- [x] **2.2** `/crm/login` page + cookie session issuance — **M**
- [x] **2.3** Vite SSR middleware (`app/middleware.ts`): guard `/crm/*` (except `/crm/login`) and `/db/*`, allow public `/`, `/offering/*`, `/verify/*` — **M**
- [x] **2.4** Loader-level RBAC helper `requireRole(...)` (Super Admin vs Manager vs Sales scopes per PRD §4 matrix) — **M**
- [x] **2.5** Onboarding — Super Admin invites Sales Manager: form → setup-token → invitation email → password setup route (PRD §5.1.1) — **L**
- [x] **2.6** Onboarding — Manager registers Sales Representatives (team portal, PRD §5.1.2) — **M**
- [x] **2.7** Token lifecycle: one-time use, expiry, revocation on completion — **S**

**DoD:** each role sees only its permitted routes/data; invite→login loop works end-to-end.

---

## Epic 3 — Email Notifications (PRD §8.1)

- [x] **3.1** Implement `app/lib/email.server.ts` wrapper over Brevo REST (`POST /v3/smtp/email`; swapped back from Cloudflare Email Sending) — **S**
- [x] **3.2** Templates: manager onboarding invitation (with setup link), pricing update alert — **M**
- [x] **3.3** Wire pricing-assignment action (Epic 4) and onboarding (Epic 2) to dispatch email — **S**
- [ ] **3.4** Delivery smoke test against verified sending address; failure path returns `false` without breaking transaction — **S**

**DoD:** manager receives alert when Super Admin assigns pricing.

---

## Epic 4 — Lead Lifecycle & Dashboards (PRD §5.2)

- [x] **4.1** Sales Rep: lead creation form (`leadName`, `email`, `phone`, `evBrand`, `evModel`, `purchaseDate`, `productTier`) → status `PENDING_PRICING` — **M**
- [x] **4.2** Role-scoped lead list (Rep: own; Manager: team; Admin: all) with status badges + `viewed_at` column — **M**
- [x] **4.3** Lead detail view (all fields, proposal history, share actions) — **M**
- [x] **4.4** Super Admin: assign pricing action — `Unit Price` (prefill tier baseline from §2/§5.2 Step 2) + `Validity Expiration Date`; transitions to `OFFER_GENERATED` — **M**
- [x] **4.5** On pricing assignment: dispatch manager email + render WhatsApp deep-link for rep ("Offering for [Lead Name] is ready...") with copy/share button — **M**
- [x] **4.6** Super Admin: manual status transition `PRE_ACCEPTED` → `ACCEPTED` from lead detail (PRD §5.2 Step 5) — **S**

**DoD:** Rep creates lead → Admin prices it → status, email, and WhatsApp link all produced.

---

## Epic 5 — Proposal PDF & Public Proposal Route (PRD §5.2 Step 3, §6)

- [x] **5.1** `/api/pdf/:offerId` resource route generating PDF on-the-fly (`@react-pdf/renderer`, edge-safe) — **L**
- [x] **5.2** Proposal document design: branding, lead + EV details, tier spec table (charger/battery/inverter/panels/daily yield), price, discount, validity date, sales rep contact — **L**
- [x] **5.3** Embedded QR code linking to `https://primodaya.gladia98.com/verify/{offerId}` (qrcode generation) — **M**
- [x] **5.4** Dynamic re-issue: same `offerId` reflects latest price/discount/validity (no URL churn) — **S**
- [x] **5.5** Public route `app/routes/offering.$id.tsx`: SSR fetch by `offerId`, update `viewed_at`, iframe-embed PDF stream (PRD §8.2) — **M**
- [x] **5.6** 404/invalid offer handling for tampered URLs — **S**

**DoD:** opening an offering URL renders current PDF and stamps `viewed_at` in D1.

---

## Epic 6 — Verification, Acceptance & Expiry (PRD §5.2 Step 4, §8.3)

- [x] **6.1** `app/routes/verify.$id.tsx` loader: fetch lead, compare `validityDate` vs today — **M**
- [x] **6.2** Valid path: set status `PRE_ACCEPTED`, 302 redirect to `https://wa.me/{superAdminPhone}?text={encoded acceptance message}` — **M**
- [x] **6.3** Expired path: render expiration screen with assigned Sales Rep name (PRD §8.3) — **S**
- [x] **6.4** Acceptance message builder + strict UTF-8 URL encoding utility (PRD §9.3) — **S**
- [x] **6.5** Guard: don't downgrade status if lead already `ACCEPTED` — **S**
- [x] **6.6** Dashboard surfacing of `PRE_ACCEPTED` leads for Super Admin follow-up — **S**

**DoD:** QR scan → WhatsApp pre-filled acceptance to Admin; expired scan → contact screen.

---

## Epic 7 — Discount Governance (PRD §3, §5.3, §5.4, §9.2)

- [x] **7.1** Server-side discount validation action: compute against assigned baseline; reject > `MAX_SALES_DISCOUNT` — **M**
- [x] **7.2** Recalc `final_price`; update proposal under same `offerId`; audit discount value — **M**
- [x] **7.3** WhatsApp link to Lead on standard discount ("...updated with the discount...") — **S**
- [x] **7.4** Manager override: "Allow Manager Discount" checkbox → persist `allow_manager_discount = true` — **S**
- [x] **7.5** When flag set: validation cap expands to `MAX_MANAGER_DISCOUNT`; else hard reject > 10% — **M**
- [x] **7.6** WhatsApp link to Sales Rep on approval ("...approved for manager discount. You can now update...") — **S**
- [x] **7.7** Re-issuance flow: rep applies elevated discount → refreshed PDF → new link to Lead — **S**

**DoD:** 11% rejected for Rep; approved override allows up to 25%; caps enforced server-side, not just UI.

---

## Epic 8 — Hardening, QA & Launch (PRD §9)

- [x] **8.1** Security pass: env/secret audit, session cookie flags (`HttpOnly`, `Secure`, `SameSite`), no leaked D1 errors to public routes — **M**
- [ ] **8.2** Rate limiting / bot protection on public surfaces (`/`, `/offering/*`, `/verify/*`); Cloudflare Access / WAF gate on `/db/*` — **S**
- [x] **8.3** E2E happy-path test: seed users → lead → pricing → view → QR verify → PRE_ACCEPTED → ACCEPTED — **L**
- [ ] **8.4** Negative-path tests: expired offer, tampered offerId, over-cap discounts, unauthorized role access — **M**
- [ ] **8.5** PDF deliverability check on mobile (QR scan from printed/screen PDF) — **S**
- [ ] **8.6** Production deploy + smoke test on `primodaya.gladia98.com` — landing `/`, CRM `/crm/*`, gated DB console `/db/*`, proposal `/offering/{id}`; rollback plan — **S**

---

## Epic 9 — SSR Marketing Landing Page (PRD §1.1, §5.5)

- [x] **9.1** Public landing route `/`: SSR shell (hero, brand story, nav, `/crm/login` link, footer) — **M**
- [x] **9.2** Tier showcase: COMPACT / CORE / ULTRA cards rendered from the shared catalog module (1.5) — components, daily PV yield, list vs. launch price — **M**
- [x] **9.3** WhatsApp CTAs: per-tier pre-encoded `wa.me` deep link to sales contact ("I am interested in the [Tier] package") — **S**
- [ ] **9.4** SEO: meta/OG tags, JSON-LD product offers, `sitemap.xml`, `robots.txt` — **M**
- [ ] **9.5** Lighthouse pass on `/` (Perf / SEO / A11y ≥ 95) — **S**

**DoD:** prospects browse all three tiers live and route into WhatsApp or the CRM login.

---

## Epic 10 — DB Admin Console (PRD §1.1, §9.5)

- [ ] **10.1** Mount the Drizzle Studio data editor at `/db/*` against the D1 binding: table explorer, row editing, SQL runner, migration status — **L**
- [ ] **10.2** Super Admin-only guard (Epic 2 RBAC) + edge second gate (Cloudflare Access service token and/or allow-listed IPs) — **M**
- [x] **10.3** Kill-switch env `DB_ADMIN_ENABLED` (default `off`); document local fallback (`drizzle-kit studio` + `getPlatformProxy`) — **S**
- [ ] **10.4** Audit-log console actions (actor, timestamp, table, action) with destructive-operation warning banner — **M**

**DoD:** `/db/*` loads Studio for an authenticated Super Admin only; anonymous and other roles get 403/404.

---

## Suggested Build Order

```
0 Foundation → 1 Data → 2 Auth → 3 Email → 4 Leads/Dashboards
     ↘ (parallel anytime)          ↘             ↘
      9 Landing                    7 Discounts ← 5 PDF/Proposal → 6 Verify/Accept → 8 Launch
      10 DB Console (after 1 + 2)
```

Critical path: **1.3 schema → 2 auth → 4.4 pricing → 5.1 PDF → 6.1 verify**. Epics 5/6 and 4/7 can be worked in parallel by separate tracks once Epic 1 + Epic 2 land. Epic 9 depends only on Epic 0 + 1.5 and can run fully in parallel; Epic 10 requires Epic 1 (schema) + Epic 2 (RBAC).


---

## Progress log (2026-09-07)

Implemented and verified locally (`wrangler d1 --local` + HTTP E2E via curl): first-run setup → Super Admin login → manager/rep invite flow → lead creation → pricing assignment + status transitions → discount cap rejection (11% vs 10%) → manager override → re-applied discount + WhatsApp deep link → offering SSR + `viewed_at` stamp → live PDF render (`%PDF-1.7`, QR included) → verify redirect `302 wa.me` with acceptance message → `PRE_ACCEPTED` → `ACCEPTED` → expired-offer screen → 404 on tampered offer ids → `/db` console returns 404 while `DB_ADMIN_ENABLED=false`.

Deployed: `primodaya-crm` Worker live on `https://primodaya.gladia98.com` (custom domain, remote D1 migrated, first-run setup pending). Still open (need account or device): 0.4 Brevo sender verification + `BREVO_API_KEY` secret (emails degrade to manual share links until set), 0.8 CI/CD, 3.4 real email delivery, 8.2 Cloudflare Access/WAF rules, 8.4 remaining negative matrices beyond the smoke set, 8.5 mobile QR scan check, 9.4 JSON-LD/sitemap, 10.1 full Drizzle Studio embed (interim Super-Admin SQL console shipped), 10.4 destructive-op warning banner.

**Note:** guard rails live in route loaders/actions (RBAC helpers) rather than a standalone `app/middleware.ts`; audit writes cover login/lead/pricing/discount/override/accept/DB-console statements.
