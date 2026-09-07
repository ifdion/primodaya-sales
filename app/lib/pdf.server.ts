import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import qrcode from "qrcode-generator";
import { TIERS, formatIdr } from "./catalog";
import { verifyUrl } from "./links";
import type { leads } from "../../db/schema";

type Lead = typeof leads.$inferSelect;

export async function renderProposalPdf(
  lead: Lead,
  env: Env,
  salesName: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();
  const margin = 48;
  let y = height - margin;

  const dark = rgb(0.1, 0.12, 0.16);
  const accent = rgb(0.02, 0.49, 0.35);
  const gray = rgb(0.4, 0.42, 0.45);

  page.drawText("PRIMODAYA", { x: margin, y, size: 26, font: bold, color: accent });
  y -= 18;
  page.drawText("Integrated Energy Ecosystem — Offer Proposal", {
    x: margin,
    y,
    size: 12,
    font,
    color: gray,
  });
  y -= 36;

  const line = (label: string, value: string, size = 10) => {
    page.drawText(label, { x: margin, y, size, font: bold, color: dark });
    page.drawText(value, { x: margin + 150, y, size, font, color: dark });
    y -= 16;
  };

  page.drawText("CUSTOMER", { x: margin, y, size: 11, font: bold, color: accent });
  y -= 16;
  line("Lead", lead.leadName);
  line("Email", lead.leadEmail);
  line("Phone", lead.leadPhone);
  line("Vehicle", `${lead.evBrand} ${lead.evModel}`);
  line("Target purchase", lead.purchaseDate);
  y -= 14;

  const tier = TIERS[lead.productTier as keyof typeof TIERS];
  page.drawText("PACKAGE", { x: margin, y, size: 11, font: bold, color: accent });
  y -= 16;
  line("Tier", `${tier.id} — ${tier.positioning}`);
  line("EV Wallbox Charger", tier.charger);
  line("Battery Storage", tier.battery);
  line("Hybrid Inverter", tier.inverter);
  line("Solar Panel Array", `${tier.panels} — ${tier.dailyYieldKwh}`);
  y -= 14;

  page.drawText("PRICING", { x: margin, y, size: 11, font: bold, color: accent });
  y -= 16;
  const price = lead.price ?? tier.listPriceIdr;
  const discount = lead.discount ?? 0;
  const final = Math.round(price * (1 - discount / 100));
  line("Baseline price", formatIdr(price));
  line("Discount", `${discount}%`);
  page.drawText("FINAL PRICE", { x: margin, y, size: 13, font: bold, color: dark });
  page.drawText(formatIdr(final), {
    x: margin + 150,
    y,
    size: 13,
    font: bold,
    color: accent,
  });
  y -= 16;
  line("Valid until", lead.validityDate ?? "—");
  y -= 24;

  page.drawText(
    "This proposal is valid until the date above. Scan the QR code to verify",
    { x: margin, y, size: 9, font, color: gray },
  );
  y -= 12;
  page.drawText("authenticity and accept the offer instantly via WhatsApp.", {
    x: margin,
    y,
    size: 9,
    font,
    color: gray,
  });

  const url = verifyUrl(env, lead.offerId);
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();
  const qrSize = 150;
  const cell = qrSize / count;
  const qrX = margin;
  const qrY = y - 20 - qrSize;
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        page.drawRectangle({
          x: qrX + col * cell,
          y: qrY + (count - 1 - row) * cell,
          width: cell + 0.1,
          height: cell + 0.1,
          color: dark,
        });
      }
    }
  }
  page.drawText(url, { x: qrX + qrSize + 12, y: qrY + qrSize / 2, size: 8, font, color: gray });
  page.drawText(`Offer ID: ${lead.offerId}`, {
    x: qrX + qrSize + 12,
    y: qrY + qrSize / 2 - 14,
    size: 8,
    font: bold,
    color: dark,
  });
  page.drawText(`Sales representative: ${salesName}`, {
    x: qrX + qrSize + 12,
    y: qrY + qrSize / 2 - 28,
    size: 8,
    font,
    color: dark,
  });

  return doc.save();
}
