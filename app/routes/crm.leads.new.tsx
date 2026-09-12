import { useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { and, eq } from "drizzle-orm";
import { accounts, leads } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { getAccountForRequest, requireAccount } from "../lib/auth.server";
import { leadInputSchema } from "../lib/validation.server";
import { base, newOfferId } from "../lib/links";
import { sendLeadCreatedAlert } from "../lib/email.server";
import { logAudit } from "../lib/audit.server";
import { TIER_IDS } from "../lib/catalog";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const account = requireAccount(await getAccountForRequest(request, context));
  const env = getEnv(context);
  const db = getDb(env);
  let reps: { id: string; name: string }[] = [];
  if (account.role === "SALES_MANAGER") {
    reps = await db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(and(eq(accounts.role, "SALES"), eq(accounts.managerId, account.id)))
      .all();
  } else if (account.role === "SUPER_ADMIN") {
    reps = await db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(eq(accounts.role, "SALES"))
      .all();
  }
  return { account, reps };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const account = requireAccount(await getAccountForRequest(request, context));
  const env = getEnv(context);
  const db = getDb(env);

  const form = await request.formData();
  const parsed = leadInputSchema.safeParse({
    leadName: form.get("leadName"),
    leadEmail: form.get("leadEmail"),
    leadPhone: form.get("leadPhone"),
    evBrand: form.get("evBrand"),
    evModel: form.get("evModel"),
    purchaseDate: form.get("purchaseDate"),
    productTier: form.get("productTier"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let salesRepId = account.id;
  if (account.role !== "SALES") {
    salesRepId = String(form.get("salesRepId") ?? "");
    if (!salesRepId) return { error: "Select the assigned Sales Representative." };
  }
  const rep = await db.query.accounts.findFirst({ where: eq(accounts.id, salesRepId) });
  if (!rep || rep.role !== "SALES") return { error: "Assigned representative not found." };
  let salesManagerId = rep.managerId ?? rep.createdBy ?? null;
  if (salesManagerId) {
    const mgr = await db.query.accounts.findFirst({ where: eq(accounts.id, salesManagerId) });
    if (mgr?.role !== "SALES_MANAGER") {
      salesManagerId = account.role === "SALES_MANAGER" ? account.id : null;
    }
  } else if (account.role === "SALES_MANAGER") {
    salesManagerId = account.id;
  }
  if (!salesManagerId) {
    return { error: "This representative has no Sales Manager. Ask Super Admin to assign one on the Team page." };
  }

  const id = crypto.randomUUID();
  await db.insert(leads).values({
    id,
    offerId: newOfferId(),
    ...parsed.data,
    salesRepId,
    salesManagerId,
    status: "PENDING_PRICING",
  });
  await logAudit(db, account.id, "CREATE_LEAD", "lead", id);

  const admin = await db.query.accounts.findFirst({
    where: eq(accounts.role, "SUPER_ADMIN"),
  });
  let alertOk = false;
  if (admin) {
    alertOk = await sendLeadCreatedAlert({
      apiKey: env.BREVO_API_KEY,
      from: env.EMAIL_FROM,
      adminEmail: admin.email,
      leadName: parsed.data.leadName,
      salesName: rep.name,
      pricingUrl: `${base(env)}/crm/leads/${id}`,
    });
  }
  return redirect(`/crm/leads/${id}${alertOk || !admin ? "" : "?alert=pricing-email-failed"}`);
}

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export default function NewLead() {
  const data = useActionData<typeof action>();
  const { account, reps } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submitted = useRef(false);
  const isSubmitting =
    navigation.state === "submitting" && Boolean(navigation.formAction?.includes("/crm/leads/new"));
  const busy = isSubmitting || (navigation.state === "loading" && submitted.current);

  useEffect(() => {
    if (navigation.state === "idle") submitted.current = false;
  }, [navigation.state]);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold">Create lead</h1>
      <p className="mt-1 text-sm text-slate-500">
        Saved as <code>PENDING_PRICING</code> until Super Admin assigns baseline price.
      </p>
      <Form
        method="post"
        className="mt-6 grid grid-cols-2 gap-4"
        onSubmit={(event) => {
          if (submitted.current || isSubmitting) {
            event.preventDefault();
            return;
          }
          submitted.current = true;
        }}
      >
        <label className="col-span-2 block text-sm font-medium">
          Lead name
          <input name="leadName" required className={input} />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input name="leadEmail" type="email" required className={input} />
        </label>
        <label className="block text-sm font-medium">
          Phone (WhatsApp)
          <input name="leadPhone" required placeholder="628..." className={input} />
        </label>
        <label className="block text-sm font-medium">
          EV brand
          <input name="evBrand" required className={input} />
        </label>
        <label className="block text-sm font-medium">
          EV model
          <input name="evModel" required className={input} />
        </label>
        <label className="block text-sm font-medium">
          Target purchase date
          <input name="purchaseDate" type="date" required className={input} />
        </label>
        <label className="block text-sm font-medium">
          Package tier
          <select name="productTier" className={input} defaultValue="COMPACT">
            {TIER_IDS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {account.role !== "SALES" ? (
          <label className="col-span-2 block text-sm font-medium">
            Assigned sales representative
            <select name="salesRepId" required className={input} defaultValue="">
              <option value="" disabled>
                Select representative…
              </option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {data && "error" in data ? (
          <p className="col-span-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{data.error}</p>
        ) : null}
        <div className="col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                />
              </svg>
            ) : null}
            {busy ? "Creating lead…" : "Create lead"}
          </button>
          <Link
            to="/crm/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
