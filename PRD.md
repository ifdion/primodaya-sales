# primodaya-crm — Product Requirement Document (PRD) & Technical Architecture

## 1. Executive Summary

**primodaya-crm** is a lightweight, high-velocity CRM platform engineered specifically for integrated electrical power ecosystem sales — wallbox EV chargers, battery storage, hybrid inverters, and solar panels delivered as packaged solutions — and their lead pipelines. It streamlines communication across four key user personas (**Super Admin**, **Sales Manager**, **Sales Representative**, and **Lead**) by integrating dynamic digital proposal generation, real-time link tracking, automated discount governance, and seamless WhatsApp communication workflows.

The entire infrastructure runs on **Cloudflare Workers (`primodaya.gladia98.com` via custom domain)** — a single **React + Vite (SSR)** codebase built with **React Router v7 framework mode** (with **Cloudflare D1**, **Drizzle ORM**, **Cloudflare Email Service**, and **Tailwind CSS**) — serving three application surfaces: an SSR landing page at the domain root, the CRM under `/crm/*`, and a database admin console under `/db/*`. Deployment is `npm run build && wrangler deploy` using the `@cloudflare/vite-plugin` (one Worker: SSR handler + static assets).

### 1.1 Application Surfaces & URL Map

| Surface                  | Base URL                                                              | Audience             | Contents                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SSR Landing Page**     | `https://primodaya.gladia98.com/`                                     | Public / Prospect    | Server-rendered marketing home: brand story, §2 product catalog tiers, WhatsApp CTA into the sales pipeline, link to CRM sign-in.                     |
| **CRM Application**      | `https://primodaya.gladia98.com/crm/*`                                | Staff (session)      | Auth (`/crm/login`), dashboards (`/crm/dashboard`, `/crm/leads/*`), pricing, discount approvals.                                                      |
| **DB Admin Console**     | `https://primodaya.gladia98.com/db/*`                                 | Super Admin (locked) | Interim shipped build: Super-Admin SQL/data console over the production D1 (browse tables, run statements, audit-logged). Full Drizzle Studio embedding remains the target; local `drizzle-kit studio` is the fallback tool. |
| **Proposal Pages**       | `https://primodaya.gladia98.com/offering/*`, `.../verify/*`           | Lead (Customer)      | Public proposal and verification routes. Kept at the domain root — deliberately not under `/crm` — so lead-facing URLs shared over WhatsApp & QR stay clean and short. |

The CRM and DB console mount under their own route prefixes from the **same React + Vite build** — one Cloudflare Worker deployment, one domain, no separate subdomains or second project.

---

## 2. Product Catalog — Integrated Energy Ecosystem

The flagship offering is an integrated electrical power ecosystem combining a wallbox EV charger, battery storage, hybrid inverter, and solar panel array into a single packaged solution, available in three tiers:

| Tier              | Positioning                                  | EV Wallbox Charger    | Battery Storage        | Hybrid Inverter    | Solar Panel Array | Daily PV Yield | List Price    | Launch Price |
| ----------------- | -------------------------------------------- | --------------------- | ---------------------- | ------------------ | ----------------- | -------------- | ------------- | ------------ |
| **COMPACT** | Energy Resilience Integration                | ABB Terra Box — 11 kW | Solis IntelliHome — 10 kW | Solis 3-Phase — 12 kW | Jinko Tiger       | up to 19 kWh   | IDR 330 juta  | IDR 285 juta |
| **CORE**    | Balanced Green Electricity Lifestyle         | ABB Terra Box — 11 kW | Solis FlexHome — 16 kW | Solis 3-Phase — 15 kW | Jinko Tiger       | up to 33 kWh   | IDR 585 juta  | —           |
| **ULTRA**   | Energy Sovereignty & High-Capacity Charging  | ABB Terra Box — 22 kW | Solis FlexHome — 64 kWh | Solis 3-Phase — 30 kW | Jinko Tiger       | up to 95 kWh   | IDR 1,560 juta | —           |

- The **Super Admin** assigns the proposal baseline price against the tier list price. The COMPACT launch price (IDR 285 juta) is configured centrally as the tier baseline — it is a platform-level promotion, not a representative-applied discount.
- All governance caps (Sales $\le$ `MAX_SALES_DISCOUNT`, Manager $\le$ `MAX_MANAGER_DISCOUNT`) are computed against the assigned tier baseline price on the lead record.

---

## 3. Global System Governance

The platform enforces two global configuration constants that govern discount boundaries across all generated proposals:

```env
MAX_SALES_DISCOUNT=10      # Standard cap (%) for Sales Representatives
MAX_MANAGER_DISCOUNT=25    # Maximum ceiling (%) unlocked upon Sales Manager approval

```

- **`MAX_SALES_DISCOUNT`**: Upper percentage/value boundary a Sales Representative can directly apply to a lead proposal.
- **`MAX_MANAGER_DISCOUNT`**: Absolute upper discount ceiling permitted only when a Sales Manager checks the **"Allow Manager Discount"** override on a lead record.

---

## 4. Actors & Role-Based Access Control (RBAC)

| Role                     | System Scope   | Core Responsibilities & Administrative Rights                                                                                                                                                   |
| ------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Super Admin**          | System-Wide    | Invites Sales Managers, assigns base pricing and offer validity dates, tracks lead proposal views, receives digital offer acceptances via WhatsApp, manually updates lead status to `ACCEPTED`, administers raw D1 data through the DB console (`/db/*`). |
| **Sales Manager**        | Team / Branch  | Registers Sales Representatives, receives transactional email alerts via Cloudflare Email Service upon pricing updates, authorizes elevated manager discount caps up to `MAX_MANAGER_DISCOUNT`.            |
| **Sales Representative** | Assigned Leads | Creates leads, applies standard discounts ($\le$ `MAX_SALES_DISCOUNT`), requests manager discount overrides, shares proposal links via WhatsApp.                                                |
| **Lead (Customer)**      | Public Access  | Views online PDF proposals, scans dynamic QR codes for validity checks, sends pre-formatted acceptance messages directly to Super Admin via WhatsApp.                                           |
| **Prospect (Visitor)**   | Public Landing | Browses the SSR landing page and packaged tier catalog, initiates sales contact via WhatsApp CTA, and navigates to the CRM sign-in.                                                             |

---

## 5. End-to-End Business Processes & User Flows

```
                          [SUPER ADMIN]
                                │ (Invites via CF Email)
                                ▼
                         [SALES MANAGER]
                                │ (Registers Account)
                                ▼
                       [SALES REPRESENTATIVE]
                                │
               ┌────────────────┴────────────────┐
               │ 1. Creates Lead                 │
               ▼                                 │
      [PENDING_PRICING]                          │
               │                                 │
               │ 2. Assigns Price & Validity     │
               ▼                                 │
       [OFFER_GENERATED]                         │
               │                                 │
   ┌───────────┴───────────┐                     │
   │ 3. Shares Proposal    │ 3. Adds Discount    │
   ▼                       ▼                     ▼
 [LEAD] ─── Opens ──> viewed_at Updated    Sales Discount (<= MAX_SALES_DISCOUNT)
   │                                             │
   │ Scans QR Code                               │ Exceeds Cap?
   ▼                                             ▼
[VERIFICATION]                            Manager Approves? Ticks Checkbox
   │                                             │
   ├── Valid Date? ──> WhatsApp Msg to Admin ──> Status: PRE_ACCEPTED
   │                                                       │ (Super Admin Manual)
   │                                                       ▼
   │                                                   ACCEPTED
   └── Expired? ───> Error Screen ("Contact Sales [Mr. S]")

```

### 5.1 Onboarding Process (Pre-Requisite)

0. **First-Run Bootstrap**: On an empty database, `/crm/login` redirects to `/crm/setup`, where the first Super Admin account is created (one-time; route self-disables once any account exists).
1. **Super Admin Invites Manager**: Super Admin inputs the Sales Manager's name and email. The system dispatches an onboarding invitation via **Cloudflare Email Service** containing a secure setup token (72 h expiry, one-time use, marked used on acceptance).
2. **Manager Onboards Sales**: Sales Manager accesses their team portal to register and provision credentials for new Sales Representatives.

---

### 5.2 Initial Lead Lifecycle

#### Step 1: Lead Creation

- **Actor**: Sales Representative (Sales Managers and Super Admin may create on behalf, assigning a representative explicitly).
- **Form Inputs**: `Lead Name`, `Email`, `Phone Number`, `EV Brand`, `EV Model`, `Target Purchase Date`, `Offered Package Tier` (`COMPACT` / `CORE` / `ULTRA`, per §2 Product Catalog).
- **System Action**: Lead record saved with initial status `PENDING_PRICING`.

#### Step 2: Pricing & Validity Assignment

- **Actor**: Super Admin
- **Inputs**: `Unit Price` (defaults to the tier baseline from §2; e.g. COMPACT currently IDR 285 juta launch price), `Validity Expiration Date`.
- **System Action**:

1. Updates lead status to `OFFER_GENERATED`.
2. Dispatches a notification email to the assigned **Sales Manager** via Cloudflare Email Service.
3. Generates a pre-formatted WhatsApp deep-link targeted at the assigned **Sales Representative**:

> `"Offering for [Lead Name] is ready. Download a PDF here [https://primodaya.gladia98.com/offering/](https://primodaya.gladia98.com/offering/)[Unique_Offer_ID]"`

#### Step 3: Proposal Access & Link Tracking

- **Actor**: Lead
- **Trigger**: Lead accesses `[https://primodaya.gladia98.com/offering/](https://primodaya.gladia98.com/offering/)[Unique_Offer_ID]`.
- **System Action**:

1. Updates `viewed_at` timestamp in Cloudflare D1.
2. Renders the offer document PDF dynamically on-screen.

#### Step 4: Proposal Verification & Acceptance via QR Code

- **Mechanism**: Embedded PDF QR code points to `[https://primodaya.gladia98.com/verify/](https://primodaya.gladia98.com/verify/)[Unique_Offer_ID]`.
- **System Logic on Scan**:
- **If Current Date $\le$ Validity Date**:
- Displays success screen and auto-redirects to WhatsApp addressed to the **Super Admin**.
- **Pre-filled Message**: `"I [Lead Name], accept the offer to purchase product as mentioned in the proposal linked here [https://primodaya.gladia98.com/offering/](https://primodaya.gladia98.com/offering/)[Unique_Offer_ID]"`
- System updates lead status to **`PRE_ACCEPTED`**.

- **If Current Date $>$ Validity Date**:
- Renders an expiration error screen: `"This offer has expired. Please contact your sales representative, [Sales Name], to request an updated proposal."`

#### Step 5: Final Status Confirmation

- **Actor**: Super Admin
- **Trigger**: Super Admin receives the WhatsApp acceptance message from the Lead.
- **Action**: Super Admin opens the lead details view in the CRM dashboard and manually updates the status from `PRE_ACCEPTED` to **`ACCEPTED`**.

---

### 5.3 Secondary Process: Standard Sales Discount

1. **Sales Representative** enters a discount percentage where $\le \text{MAX\_SALES\_DISCOUNT}$ (persisted as a percent on `leads.discount`; `final_price = baseline × (1 − pct/100)`).
2. System recalculates `final_price` and updates the existing proposal document under the same `offer_id`.
3. System generates a WhatsApp link targeted to the **Lead**:

> `"Offering for [Lead Name] is updated with the discount [Discount Amount/Percentage]. Download a PDF here [https://primodaya.gladia98.com/offering/](https://primodaya.gladia98.com/offering/)[Unique_Offer_ID]"`

4. Customer re-opens the URL (updating `viewed_at`) and follows the standard QR acceptance pipeline.

---

### 5.4 Tertiary Process: Manager Discount Approval

1. **Request**: Lead requests a discount exceeding `MAX_SALES_DISCOUNT`. Sales Representative notifies their Sales Manager.
2. **Approval**: Sales Manager opens the Lead details view, checks **"Allow Manager Discount"**, and saves.
3. **System Action**:

- Sets `allow_manager_discount = true` in Cloudflare D1.
- Expands allowable discount cap up to `MAX_MANAGER_DISCOUNT`.
- Generates a WhatsApp link targeted to the **Sales Representative**:

> `"The offering for [Lead Name] has been approved for manager discount. You can now update the proposal here [https://primodaya.gladia98.com/offering/](https://primodaya.gladia98.com/offering/)[Unique_Offer_ID]"`

4. **Re-issuance**: Sales Representative inputs the elevated discount, updates the proposal, and sends the refreshed link to the Lead.

---

### 5.5 Landing Page Experience (Prospect Funnel)

- **Actor**: Prospect (public, unauthenticated)
- **Surface**: SSR landing at `https://primodaya.gladia98.com/`
- **Requirements**:

1. Fully server-rendered for SEO (meta/OG/JSON-LD offers), reading from the same §2 catalog data source as the CRM — one source of truth for tier specs and launch pricing.
2. Tier showcase cards for `COMPACT` / `CORE` / `ULTRA` (components, daily PV yield, list vs. launch price).
3. Primary CTA: pre-encoded `wa.me` deep link to the sales contact ("I am interested in the [Tier] package").
4. Secondary CTA: CRM sign-in link pointing at `/crm/login`.

- **Note**: Prospects captured from the landing are registered as formal leads by a Sales Representative (§5.2 Step 1); the landing itself never creates records.

---

## 6. Technical Stack Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE WORKERS EDGE RUNTIME                │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                       REACT + VITE APP                       │     │
│   │                                                              │     │
│   │  ┌───────────────────────┐        ┌───────────────────────┐  │     │
│   │  │  React Router SSR     │        │  CRM & DB Admin UI    │  │     │
│   │  │(/, /offering, /verify)│        │  (Dashboards & Forms) │  │     │
│   │  └───────────┬───────────┘        └───────────┬───────────┘  │     │
│   │              │                                │              │     │
│   │              └────────────────┬───────────────┘              │     │
│   │                               │                              │     │
│   │                     ┌─────────┴─────────┐                    │     │
│   │                     │ React Router API  │                    │     │
│   │                     └────┬──────────┬───┘                    │     │
│   └──────────────────────────┼──────────┼────────────────────────┘     │
│                              │          │                              │
│             ┌────────────────┘          └───────────────┐              │
│             ▼                                           ▼              │
│  ┌──────────────────────┐                   ┌───────────────────────┐  │
│  │   Cloudflare D1      │                   │  @react-pdf/renderer  │  │
│  │  (SQLite Database)   │                   │ (On-the-Fly PDF Gen)  │  │
│  └──────────────────────┘                   └───────────────────────┘  │
└─────────────┬───────────────────────────────────────────┬──────────────┘
              │                                           │
              ▼                                           ▼
   ┌──────────────────────┐                   ┌───────────────────────┐
   │    Drizzle ORM       │                   │   Cloudflare Email    │
   │ (Type-Safe Queries)  │                   │ (Transactional Email) │
   └──────────────────────┘                   └───────────────────────┘

```

| Component Layer         | Selected Technology                                        | Technical Rationale                                                                                                       |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Web Framework**       | **React 19 + Vite (SSR via `@cloudflare/vite-plugin`)**    | Server-rendered landing (`/`) and public proposal routes (`/offering/:id`, `/verify/:id`) with Vite HMR, code-splitting, and Workers-native execution. |
| **Hosting Platform**    | **Cloudflare Workers (`@cloudflare/vite-plugin`, `wrangler deploy`)** | One Worker + static assets on custom domain `primodaya.gladia98.com`: SSR landing at `/`, CRM at `/crm/*`, DB console at `/db/*`; edge delivery, zero cold starts. |
| **Database**            | **Cloudflare D1 (SQLite)**                                 | Serverless edge SQL database offering sub-millisecond query execution.                                                    |
| **ORM Layer**           | **Drizzle ORM**                                            | Lightweight, type-safe query builder tailored for SQLite and Cloudflare D1 integration.                                   |
| **Transactional Email** | **Cloudflare Email Sending (Workers binding)**                 | Native outbound email on the same platform, with managed DKIM/SPF and no third-party vendor.                                |
| **Authentication**      | **Cookie sessions over D1 (`sessions` table)**             | HttpOnly `SameSite=Lax` cookie; PBKDF2-SHA256 (WebCrypto) password hashing; guards enforced in React Router loaders/actions. |
| **PDF Generation**      | **`pdf-lib` (selected) + `qrcode-generator`**              | Edge-runtime-compatible compilation; QR matrix rendered as PDF rectangles. `@react-pdf/renderer` rejected as Workers-hostile. |
| **DB Administration**   | **Super-Admin SQL console (interim) · Drizzle Studio local** | `/db/*` console runs statements against the D1 binding with audit logging; `drizzle-kit studio` remains the full local tool. |
| **UI & Styling**        | **Tailwind CSS + React Router**                            | One React codebase mounts the public landing, lead-facing proposal pages, and the `/crm/*` and `/db/*` app subtrees.       |

---

## 7. Database Schema (Drizzle ORM)

```typescript
// db/schema.ts (implemented — migration drizzle/0000_*.sql)
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(), // crypto.randomUUID()
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // pbkdf2:iters:salt:hash (WebCrypto)
  phone: text("phone"), // WhatsApp contact used by deep links
  role: text("role", {
    enum: ["SUPER_ADMIN", "SALES_MANAGER", "SALES"],
  }).notNull(),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  offerId: text("offer_id").notNull().unique(), // public slug, format PM-<12 hex>
  leadName: text("lead_name").notNull(),
  leadEmail: text("lead_email").notNull(),
  leadPhone: text("lead_phone").notNull(),
  evBrand: text("ev_brand").notNull(),
  evModel: text("ev_model").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  productTier: text("product_tier", {
    enum: ["COMPACT", "CORE", "ULTRA"],
  }).notNull(),

  salesRepId: text("sales_rep_id")
    .notNull()
    .references(() => accounts.id),
  salesManagerId: text("sales_manager_id")
    .notNull()
    .references(() => accounts.id),

  price: real("price"), // baseline assigned by Super Admin (IDR)
  discount: real("discount").default(0), // percent 0–25
  allowManagerDiscount: integer("allow_manager_discount", {
    mode: "boolean",
  }).default(false),

  validityDate: text("validity_date"),
  viewedAt: integer("viewed_at", { mode: "timestamp" }),

  status: text("status", {
    enum: [
      "PENDING_PRICING",
      "OFFER_GENERATED",
      "PRE_ACCEPTED",
      "ACCEPTED",
      "EXPIRED",
    ],
  })
    .default("PENDING_PRICING")
    .notNull(),

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(), // 64-hex cookie value
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(), // 7 days
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const invites = sqliteTable("invites", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["SALES_MANAGER", "SALES"] }).notNull(),
  createdById: text("created_by_id")
    .notNull()
    .references(() => accounts.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(), // 72 h
  usedAt: integer("used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(), // LOGIN | CREATE_LEAD | ASSIGN_PRICING | ...
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  detail: text("detail"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});
```

Both `accounts` and `leads` are directly browsable and editable through the DB Admin Console mounted at `/db/*` (§1.1).

---

## 8. Core Application Implementation Logic

### 8.1 Cloudflare Email Dispatch Wrapper (`app/lib/email.server.ts`)

```typescript
// Requires the Email Sending `EMAIL` binding:
// wrangler.jsonc → { "send_email": [{ "name": "EMAIL" }] }
interface SendEmailBinding {
  send(message: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;
}

export async function sendManagerNotification({
  email,
  from,
  managerEmail,
  leadName,
  salesName,
}: {
  email: SendEmailBinding;
  from: string; // config: EMAIL_FROM (verified sending address)
  managerEmail: string;
  leadName: string;
  salesName: string;
}) {
  try {
    await email.send({
      to: managerEmail,
      from,
      subject: `[Pricing Update] Offer Generated for ${leadName}`,
      html: `<p>Super Admin has assigned pricing and validity for lead <strong>${leadName}</strong> (Sales Rep: ${salesName}).</p>`,
    });
    return true;
  } catch {
    return false;
  }
}
```

### 8.2 Proposal Route with Analytics Tracking (`app/routes/offering.$id.tsx`)

Bindings reach server code through `workers/app.ts`, which wraps `createRequestHandler` and injects `{ cloudflare: { env, ctx } }` into every loader/action `context`.

```tsx
// app/routes/offering.$id.tsx (implemented)
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { leads } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform"; // context.cloudflare.env

export async function loader({ params, context }: LoaderFunctionArgs) {
  const db = getDb(getEnv(context));

  // 1. Fetch Lead Record (404 on unknown/tampered offer id)
  const lead = await db.query.leads.findFirst({
    where: eq(leads.offerId, params.id!),
  });
  if (!lead) throw new Response("Not Found", { status: 404 });

  // 2. Capture viewed_at timestamp
  await db
    .update(leads)
    .set({ viewedAt: new Date() })
    .where(eq(leads.offerId, params.id!));

  return { lead };
}

export default function OfferingPage() {
  const { lead } = useLoaderData<typeof loader>();
  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-100 p-4">
      {/* Proposal header: customer, tier, final price, validity */}
      <iframe
        src={`/api/pdf/${lead.offerId}`}
        className="h-[750px] w-full max-w-4xl rounded-lg border"
        title="Offering Proposal PDF"
      />
    </main>
  );
}
```

The PDF itself is a resource route (`app/routes/api.pdf.$offerId.ts`) rendered on the fly with `pdf-lib` and an embedded QR matrix (see TASKS 5.1–5.3).

### 8.3 Verification & QR Redirect Route (`app/routes/verify.$id.tsx`)

```tsx
// app/routes/verify.$id.tsx (implemented)
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { and, eq, ne } from "drizzle-orm";
import { accounts, leads } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { acceptanceMsg, waLink } from "../lib/links";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const db = getDb(env);

  const lead = await db.query.leads.findFirst({
    where: eq(leads.offerId, params.id!),
  });
  if (!lead) throw new Response("Not Found", { status: 404 });

  const today = new Date().toISOString().split("T")[0];
  const isValid = !!lead.validityDate && lead.validityDate >= today;

  if (isValid && lead.status !== "ACCEPTED") {
    // Guarded update: never downgrade an already-accepted lead
    await db
      .update(leads)
      .set({ status: "PRE_ACCEPTED" })
      .where(and(eq(leads.offerId, params.id!), ne(leads.status, "ACCEPTED")));

    const admin = await db.query.accounts.findFirst({
      where: eq(accounts.role, "SUPER_ADMIN"),
    });
    const phone = env.SUPER_ADMIN_WHATSAPP || admin?.phone || "6281234567890";

    throw new Response(null, {
      status: 302,
      headers: { Location: waLink(phone, acceptanceMsg(lead.leadName, env, lead.offerId)) },
    });
  }

  // Fetch Sales Rep details for expired (or already-accepted) state
  const salesRep = await db.query.accounts.findFirst({
    where: eq(accounts.id, lead.salesRepId),
  });
  return { salesRep, lead };
}

export default function VerifyPage() {
  const { salesRep, lead } = useLoaderData<typeof loader>();

  return (
    <main className="bg-red-50 flex items-center justify-center min-h-screen p-4">
      <div className="bg-white border border-red-200 p-8 rounded-xl max-w-md text-center shadow-lg">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Offer Expired</h2>
        <p className="text-slate-600 mb-4">
          This proposal is no longer valid. Please contact your sales representative to request
          an updated proposal.
        </p>
        <div className="bg-slate-100 p-4 rounded-lg text-left">
          <p className="text-sm font-semibold text-slate-700">Sales Representative:</p>
          <p className="text-base text-slate-900">{salesRep?.name || "Your Sales Agent"}</p>
        </div>
      </div>
    </main>
  );
}
```

---

## 9. Non-Functional & Security Specifications

1. **Role-Based Access Control (RBAC)**: Enforced by the `requireAccount` / `requireRole` helpers inside React Router loaders and actions (`app/lib/auth.server.ts`), with D1-backed cookie sessions. Public surfaces (`/`, `/offering/*`, `/verify/*`) remain readable; the CRM subtree (`/crm/*`, except `/crm/login`) enforces valid cookie sessions; the DB console (`/db/*`) is Super Admin-only (§9.5).
2. **Discount Validation Guardrails**: Backend validations reject discount payloads exceeding maximum thresholds (`10%` for Sales, `25%` for Managers).
3. **Deep Link Safety**: All WhatsApp deep links execute explicit UTF-8 URL encoding on URL parameters (`wa.me/{phone}?text={encoded_string}`).
4. **Environment Security**: Bindings (`DB`, `EMAIL`) and Worker `vars` (`APP_URL`, `MAX_SALES_DISCOUNT`, `MAX_MANAGER_DISCOUNT`, `EMAIL_FROM`, `SUPER_ADMIN_WHATSAPP`, `DB_ADMIN_ENABLED`) are configured in `wrangler.jsonc` / `.dev.vars`; anything sensitive moves to `wrangler secret put` before production.
5. **DB Admin Console Hardening (`/db/*`)**: Shipped interim build — Super-Admin SQL console over the D1 binding, RBAC-guarded and behind the `DB_ADMIN_ENABLED` kill-switch (default `off`, returns 404 when disabled); all writes are audit-logged. Production plan: edge second gate (Cloudflare Access service token / IP allow-list), destructive-operation confirmation, full Drizzle Studio embedding — or keep `/db/*` off and administer locally via `drizzle-kit studio` + `getPlatformProxy`.
