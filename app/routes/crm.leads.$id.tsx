import type { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { and, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { accounts, leads } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { getAccountForRequest, requireAccount, type AccountRow } from "../lib/auth.server";
import { discountInputSchema, pricingInputSchema, validateDiscount } from "../lib/validation.server";
import {
  discountUpdatedMsg,
  managerApprovedMsg,
  offeringUrl,
  waLink,
} from "../lib/links";
import { TIERS, formatIdr } from "../lib/catalog";
import { sendManagerNotification } from "../lib/email.server";
import { logAudit } from "../lib/audit.server";
interface LeadView {
  lead: typeof leads.$inferSelect;
  rep: typeof accounts.$inferSelect | null;
  manager: typeof accounts.$inferSelect | null;
}

async function fetchLead(id: string, context: AppLoadContext): Promise<LeadView> {
  const env = getEnv(context);
  const db = getDb(env);
  const rep = alias(accounts, "rep");
  const manager = alias(accounts, "manager");
  const rows = await db
    .select({ lead: leads, rep, manager })
    .from(leads)
    .leftJoin(rep, eq(rep.id, leads.salesRepId))
    .leftJoin(manager, eq(manager.id, leads.salesManagerId))
    .where(eq(leads.id, id))
    .limit(1)
    .all();
  const row = rows[0];
  if (!row) throw new Response("Not Found", { status: 404 });
  return { lead: row.lead, rep: row.rep, manager: row.manager };
}

function assertVisible(account: AccountRow, lead: LeadView["lead"]) {
  if (account.role === "SUPER_ADMIN") return;
  if (account.role === "SALES_MANAGER" && lead.salesManagerId === account.id) return;
  if (account.role === "SALES" && lead.salesRepId === account.id) return;
  throw new Response("Forbidden", { status: 403 });
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const account = requireAccount(await getAccountForRequest(request, context));
  const row = await fetchLead(params.id!, context);
  assertVisible(account, row.lead);
  const alert = new URL(request.url).searchParams.get("alert");
  return { account, alert, ...row };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const account = requireAccount(await getAccountForRequest(request, context));
  const env = getEnv(context);
  const db = getDb(env);
  const current = await fetchLead(params.id!, context);
  assertVisible(account, current.lead);
  const { lead } = current;

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "pricing") {
    if (account.role !== "SUPER_ADMIN") {
      return { error: "Only Super Admin assigns pricing." };
    }
    const parsed = pricingInputSchema.safeParse({
      price: form.get("price"),
      validityDate: form.get("validityDate"),
    });
    if (!parsed.success) return { error: "Invalid price or validity date." };

    await db
      .update(leads)
      .set({ price: parsed.data.price, validityDate: parsed.data.validityDate, status: "OFFER_GENERATED" })
      .where(eq(leads.id, lead.id));
    await logAudit(db, account.id, "ASSIGN_PRICING", "lead", lead.id, JSON.stringify(parsed.data));

    const emailOk = await sendManagerNotification({
      apiKey: env.BREVO_API_KEY,
      from: env.EMAIL_FROM,
      managerEmail: current.manager?.email ?? "",
      leadName: lead.leadName,
      salesName: current.rep?.name ?? "—",
    });

    const link = waLink(
      current.rep?.phone ?? "",
      `Offering for ${lead.leadName} is ready. Download a PDF here ${offeringUrl(env, lead.offerId)}`,
    );
    return { flash: `Offer generated. Manager email ${emailOk ? "sent" : "failed"}.`, waLink: link };
  }

  if (intent === "discount") {
    if (account.role !== "SALES") {
      return { error: "Only the assigned Sales Representative applies discounts." };
    }
    const parsed = discountInputSchema.safeParse({ discount: form.get("discount") });
    if (!parsed.success) return { error: "Invalid discount value." };
    const err = validateDiscount(env, lead, parsed.data.discount);
    if (err) return { error: err };

    await db
      .update(leads)
      .set({ discount: parsed.data.discount })
      .where(eq(leads.id, lead.id));
    await logAudit(db, account.id, "APPLY_DISCOUNT", "lead", lead.id, `${parsed.data.discount}%`);

    const link = waLink(
      lead.leadPhone,
      discountUpdatedMsg(lead.leadName, `${parsed.data.discount}%`, env, lead.offerId),
    );
    return { flash: "Proposal updated under the same offer ID.", waLink: link };
  }

  if (intent === "manager_discount") {
    if (account.role !== "SALES_MANAGER") {
      return { error: "Only the Sales Manager can authorize a manager discount." };
    }
    await db
      .update(leads)
      .set({ allowManagerDiscount: true })
      .where(eq(leads.id, lead.id));
    await logAudit(db, account.id, "ALLOW_MANAGER_DISCOUNT", "lead", lead.id);
    const link = waLink(
      current.rep?.phone ?? "",
      managerApprovedMsg(lead.leadName, env, lead.offerId),
    );
    return {
      flash: `Manager discount enabled (cap ${env.MAX_MANAGER_DISCOUNT}%).`,
      waLink: link,
    };
  }

  if (intent === "accept") {
    if (account.role !== "SUPER_ADMIN") {
      return { error: "Only Super Admin confirms acceptance." };
    }
    if (lead.status !== "PRE_ACCEPTED") {
      return { error: "Lead is not in PRE_ACCEPTED state." };
    }
    await db
      .update(leads)
      .set({ status: "ACCEPTED" })
      .where(and(eq(leads.id, lead.id), ne(leads.status, "ACCEPTED")));
    await logAudit(db, account.id, "MARK_ACCEPTED", "lead", lead.id);
    return { flash: "Lead marked ACCEPTED." };
  }

  return { error: "Unknown action." };
}

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none";
const btn =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700";

function WaLinkBox({ url }: { url: string }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <p className="font-semibold text-emerald-800">Generated WhatsApp link</p>
      <div className="mt-2 flex gap-2">
        <input readOnly value={url} className="w-full rounded border border-emerald-200 bg-white px-2 py-1 text-xs" />
        <a href={url} target="_blank" rel="noreferrer" className={btn}>
          Open
        </a>
      </div>
    </div>
  );
}

export default function LeadDetail() {
  const { lead, rep, manager, account, alert } = useLoaderData<typeof loader>();
  const data = useActionData<typeof action>();
  const tier = TIERS[lead.productTier as keyof typeof TIERS];
  const finalPrice = lead.price
    ? Math.round(lead.price * (1 - (lead.discount ?? 0) / 100))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lead.leadName}</h1>
          <p className="text-sm text-slate-500">
            {lead.productTier} — {tier?.positioning} · Offer <code>{lead.offerId}</code>
          </p>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold">
          {lead.status.replaceAll("_", " ")}
        </span>
      </div>

      {data && "error" in data ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{data.error}</p>
      ) : null}
      {alert === "pricing-email-failed" ? (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Lead created, but the Super Admin pricing notification email failed to send. Please notify them manually.
        </p>
      ) : null}
      {data && "flash" in data ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{data.flash}</p>
      ) : null}
      {data && "waLink" in data ? <WaLinkBox url={String(data.waLink)} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700">Customer & vehicle</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Email</dt>
            <dd>{lead.leadEmail}</dd>
            <dt className="text-slate-500">Phone</dt>
            <dd>{lead.leadPhone}</dd>
            <dt className="text-slate-500">EV</dt>
            <dd>
              {lead.evBrand} {lead.evModel}
            </dd>
            <dt className="text-slate-500">Target purchase</dt>
            <dd>{lead.purchaseDate}</dd>
            <dt className="text-slate-500">Representative</dt>
            <dd>{rep?.name ?? "—"}</dd>
            <dt className="text-slate-500">Manager</dt>
            <dd>{manager?.name ?? "—"}</dd>
            <dt className="text-slate-500">Viewed at</dt>
            <dd>{lead.viewedAt ? new Date(lead.viewedAt).toLocaleString() : "never"}</dd>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700">Pricing</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Baseline price</dt>
            <dd>{lead.price ? formatIdr(lead.price) : `unassigned (tier baseline ${tier ? formatIdr(tier.launchPriceIdr ?? tier.listPriceIdr) : "—"})`}</dd>
            <dt className="text-slate-500">Discount</dt>
            <dd>{lead.discount ? `${lead.discount}%` : "—"}</dd>
            <dt className="text-slate-500">Final price</dt>
            <dd className="font-bold text-emerald-700">{finalPrice ? formatIdr(finalPrice) : "—"}</dd>
            <dt className="text-slate-500">Valid until</dt>
            <dd>{lead.validityDate ?? "—"}</dd>
            <dt className="text-slate-500">Manager discount</dt>
            <dd>{lead.allowManagerDiscount ? "approved (cap 25%)" : `not approved (cap ${10}%)`}</dd>
          </dl>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-600">Proposal</p>
            <Link
              to={`/offering/${lead.offerId}`}
              target="_blank"
              className="text-emerald-700 hover:underline"
            >
              Open /offering/{lead.offerId}
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {account.role === "SUPER_ADMIN" && lead.status !== "ACCEPTED" ? (
          <Form method="post" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="intent" value="pricing" />
            <h2 className="font-semibold">Assign pricing (Super Admin)</h2>
            <label className="block text-sm">
              Unit price (IDR)
              <input
                name="price"
                type="number"
                min={1}
                required
                defaultValue={tier ? tier.launchPriceIdr ?? tier.listPriceIdr : ""}
                className={input}
              />
            </label>
            <label className="mt-3 block text-sm">
              Validity date
              <input name="validityDate" type="date" required className={input} />
            </label>
            <button type="submit" className={`${btn} mt-4 w-full`}>
              Generate offer
            </button>
            {lead.status === "PRE_ACCEPTED" ? (
              <button
                type="submit"
                name="intent"
                value="accept"
                className="mt-2 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Confirm acceptance → ACCEPTED
              </button>
            ) : null}
          </Form>
        ) : null}

        {account.role === "SALES_MANAGER" && !lead.allowManagerDiscount ? (
          <Form method="post" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="intent" value="manager_discount" />
            <h2 className="font-semibold">Manager discount approval</h2>
            <p className="mt-1 text-xs text-slate-500">
              Raises this lead's discount cap from the sales limit to the manager ceiling.
            </p>
            <button type="submit" className={`${btn} mt-4 w-full`}>
              Allow manager discount
            </button>
          </Form>
        ) : null}

        {account.role === "SALES" && lead.price ? (
          <Form method="post" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="intent" value="discount" />
            <h2 className="font-semibold">Apply discount (Sales Rep)</h2>
            <label className="mt-2 block text-sm">
              Discount percentage (cap {lead.allowManagerDiscount ? "25" : "10"}%)
              <input name="discount" type="number" min={0} max={lead.allowManagerDiscount ? 25 : 10} step={0.5} required className={input} />
            </label>
            <button type="submit" className={`${btn} mt-4 w-full`}>
              Update proposal & share link
            </button>
          </Form>
        ) : null}

        {account.role === "SUPER_ADMIN" && lead.status === "PRE_ACCEPTED" ? (
          <Form method="post" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="intent" value="accept" />
            <h2 className="font-semibold">Final confirmation</h2>
            <p className="mt-1 text-xs text-slate-500">
              The lead accepted via WhatsApp — mark the record as ACCEPTED.
            </p>
            <button type="submit" className={`${btn} mt-4 w-full bg-violet-600 hover:bg-violet-700`}>
              Mark ACCEPTED
            </button>
          </Form>
        ) : null}
      </div>

      <Link to="/crm/dashboard" className="text-sm text-slate-500 hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
