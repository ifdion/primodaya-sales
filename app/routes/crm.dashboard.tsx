import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { eq, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { accounts, leads } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { requireAccount, getAccountForRequest } from "../lib/auth.server";
import { formatIdr } from "../lib/catalog";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const account = requireAccount(await getAccountForRequest(request, context));
  const env = getEnv(context);
  const db = getDb(env);

  let where: SQL | undefined;
  if (account.role === "SALES") where = eq(leads.salesRepId, account.id);
  else if (account.role === "SALES_MANAGER") where = eq(leads.salesManagerId, account.id);

  const rep = alias(accounts, "rep");
  const rows = await db
    .select({ lead: leads, repName: rep.name })
    .from(leads)
    .leftJoin(rep, eq(rep.id, leads.salesRepId))
    .where(where)
    .orderBy(leads.createdAt)
    .all();

  return { account, rows: rows.map((r) => ({ ...r.lead, repName: r.repName })) };
}

const badge: Record<string, string> = {
  PENDING_PRICING: "bg-amber-100 text-amber-800",
  OFFER_GENERATED: "bg-blue-100 text-blue-800",
  PRE_ACCEPTED: "bg-violet-100 text-violet-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  EXPIRED: "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const { rows, account } = useLoaderData<typeof loader>();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {account.role === "SUPER_ADMIN"
            ? "All leads"
            : account.role === "SALES_MANAGER"
              ? "Team leads"
              : "My leads"}
        </h1>
        <Link
          to="/crm/leads/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + New lead
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Viewed</th>
              {account.role === "SUPER_ADMIN" ? <th className="px-4 py-3">Rep</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No leads yet.
                </td>
              </tr>
            ) : (
              rows.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/crm/leads/${l.id}`} className="font-medium text-emerald-700 hover:underline">
                      {l.leadName}
                    </Link>
                    <span className="block text-xs text-slate-400">{l.leadEmail}</span>
                  </td>
                  <td className="px-4 py-3">{l.productTier}</td>
                  <td className="px-4 py-3">
                    {l.price
                      ? formatIdr(Math.round(l.price * (1 - (l.discount ?? 0) / 100)))
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{l.discount ? `${l.discount}%` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge[l.status] ?? ""}`}>
                      {l.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {l.viewedAt ? new Date(l.viewedAt).toLocaleString() : "never"}
                  </td>
                  {account.role === "SUPER_ADMIN" ? (
                    <td className="px-4 py-3 text-slate-600">{l.repName ?? "—"}</td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
