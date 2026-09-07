import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { leads } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { TIERS, formatIdr } from "../lib/catalog";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const db = getDb(env);

  const lead = await db.query.leads.findFirst({
    where: eq(leads.offerId, params.id!),
  });
  if (!lead) throw new Response("Not Found", { status: 404 });

  await db
    .update(leads)
    .set({ viewedAt: new Date() })
    .where(eq(leads.offerId, params.id!));

  return { lead };
}

export default function OfferingPage() {
  const { lead } = useLoaderData<typeof loader>();
  const tier = TIERS[lead.productTier as keyof typeof TIERS];
  const final = lead.price
    ? Math.round(lead.price * (1 - (lead.discount ?? 0) / 100))
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-100 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Primodaya Proposal
            </h1>
            <p className="text-sm text-slate-500">
              {lead.leadName} · {tier?.id} — {tier?.positioning}
            </p>
          </div>
          <span className="text-sm text-slate-500">Proposal ID: {lead.offerId}</span>
        </div>

        <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-slate-500">Final price</p>
            <p className="text-lg font-bold text-emerald-700">
              {final ? formatIdr(final) : "Pricing in progress"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Discount</p>
            <p className="text-lg font-semibold">{lead.discount ? `${lead.discount}%` : "—"}</p>
          </div>
          <div>
            <p className="text-slate-500">Valid until</p>
            <p className="text-lg font-semibold">{lead.validityDate ?? "—"}</p>
          </div>
        </div>

        <iframe
          src={`/api/pdf/${lead.offerId}`}
          className="h-[750px] w-full rounded-lg border"
          title="Offering Proposal PDF"
        />
        <p className="mt-3 text-center text-xs text-slate-400">
          Scan the QR code on the document to verify and accept this offer.
        </p>
      </div>
    </main>
  );
}
