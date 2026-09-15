import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import qrcode from "qrcode-generator";
import { accounts, leads } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { proposalRows, type Row } from "../lib/proposal";
import { verifyUrl } from "../lib/links";

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

  const rep = await db.query.accounts.findFirst({
    where: eq(accounts.id, lead.salesRepId),
  });

  return { lead, salesName: rep?.name ?? "Your Sales Agent", verifyUrl: verifyUrl(env, lead.offerId) };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">{title}</h2>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[38%_1fr] gap-2">
          <dt className="font-bold text-slate-800">{r.label}</dt>
          <dd className="text-slate-700">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function OfferingPage() {
  const { lead, salesName, verifyUrl: url } = useLoaderData<typeof loader>();
  const { customer, pkg, pricing } = proposalRows(lead);

  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();

  return (
    <main className="min-h-screen bg-white text-slate-800">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        {/* ponytail: text stand-in, swap for real logo file when provided */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-5">
          <span className="font-serif text-3xl tracking-wide">
            <span className="text-amber-500">PRIMO</span>
            <span className="text-white">DAYA</span>
          </span>
          <span className="rounded border border-dashed border-amber-500/60 px-3 py-2 text-xs text-amber-500">
            LOGO
          </span>
        </div>
        <p className="mt-2 text-sm font-bold uppercase tracking-wide text-slate-700">
          Refined, Clean, Safe, Independent Energy
        </p>

        <Section title="Customer Information">
          <Rows rows={customer} />
        </Section>

        <Section title="Package">
          <div className="mb-3 flex justify-end">
            {/* ponytail: solis logo placeholder, swap for real asset when provided */}
            <span className="rounded border border-dashed border-slate-400 px-3 py-1.5 text-xs text-slate-500">
              SOLIS LOGO
            </span>
          </div>
          <Rows rows={pkg} />
        </Section>

        <Section title="Pricing">
          <Rows rows={pricing} />
        </Section>

        <p className="mt-8 text-sm text-slate-400">
          This proposal is valid until the date above. Scan the QR code to verify authenticity and
          accept the offer instantly via WhatsApp.
        </p>

        <p className="mt-6 text-sm font-bold text-slate-900">
          Payment only Valid Through
          <br />
          BCA XXX XXX XXXX
          <br />
          PT Gladia 98 Bakti Cemerlang
        </p>

        <div className="mt-6 flex items-center gap-5">
          <img src={qr.createDataURL(4, 4)} alt="Verify offer QR code" className="h-36 w-36" />
          <div className="min-w-0 text-sm">
            <p className="break-all text-slate-500">{url}</p>
            <p className="mt-2 font-bold text-slate-900">Offer ID: {lead.offerId}</p>
            <p className="mt-1 text-slate-600">Sales representative: {salesName}</p>
          </div>
        </div>

        <a
          href={`/api/pdf/${lead.offerId}`}
          className="mt-8 inline-block text-xs text-emerald-700 underline"
        >
          Download PDF version
        </a>
      </div>
    </main>
  );
}
