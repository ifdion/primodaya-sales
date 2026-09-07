import type { LoaderFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";
import { accounts, leads } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { renderProposalPdf } from "../lib/pdf.server";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const db = getDb(env);

  const lead = await db.query.leads.findFirst({
    where: eq(leads.offerId, params.offerId!),
  });
  if (!lead || !lead.price) throw new Response("Not Found", { status: 404 });

  const rep = await db.query.accounts.findFirst({
    where: eq(accounts.id, lead.salesRepId),
  });

  const bytes = await renderProposalPdf(lead, env, rep?.name ?? "Your Sales Agent");
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="proposal-${lead.offerId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
