import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { and, eq, ne } from "drizzle-orm";
import { accounts, leads } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { acceptanceMsg, waLink } from "../lib/links";
import { logAudit } from "../lib/audit.server";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const db = getDb(env);

  const lead = await db.query.leads.findFirst({
    where: eq(leads.offerId, params.id!),
  });
  if (!lead) throw new Response("Not Found", { status: 404 });

  const today = new Date().toISOString().split("T")[0];
  const isValid = !!lead.validityDate && lead.validityDate >= today && lead.status !== "EXPIRED";

  if (isValid && lead.status !== "ACCEPTED") {
    await db
      .update(leads)
      .set({ status: "PRE_ACCEPTED" })
      .where(and(eq(leads.offerId, params.id!), ne(leads.status, "ACCEPTED")));
    await logAudit(db, null, "PRE_ACCEPTED", "lead", lead.id);

    const admin = await db.query.accounts.findFirst({
      where: eq(accounts.role, "SUPER_ADMIN"),
    });
    const phone = env.SUPER_ADMIN_WHATSAPP || admin?.phone || "6281234567890";
    throw new Response(null, {
      status: 302,
      headers: {
        Location: waLink(phone, acceptanceMsg(lead.leadName, env, lead.offerId)),
      },
    });
  }

  const salesRep = await db.query.accounts.findFirst({
    where: eq(accounts.id, lead.salesRepId),
  });
  return { salesRep: salesRep ?? null, lead };
}

export default function VerifyPage() {
  const { salesRep, lead } = useLoaderData<typeof loader>();
  const alreadyAccepted = lead.status === "ACCEPTED";
  return (
    <main className="flex min-h-screen items-center justify-center bg-red-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-lg">
        <h2 className="mb-2 text-2xl font-bold text-red-600">
          {alreadyAccepted ? "Offer already accepted" : "Offer Expired"}
        </h2>
        <p className="mb-4 text-slate-600">
          {alreadyAccepted
            ? "This proposal has already been accepted. Your sales team will contact you shortly."
            : "This proposal is no longer valid. Please contact your sales representative to request an updated proposal."}
        </p>
        <div className="rounded-lg bg-slate-100 p-4 text-left">
          <p className="text-sm font-semibold text-slate-700">Sales Representative:</p>
          <p className="text-base text-slate-900">{salesRep?.name ?? "Your Sales Agent"}</p>
          {salesRep?.phone ? (
            <a
              href={waLink(salesRep.phone, `Hi ${salesRep.name}, regarding my Primodaya proposal ${lead.offerId}:`)}
              className="mt-1 inline-block text-sm text-emerald-700 hover:underline"
            >
              Message on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}
