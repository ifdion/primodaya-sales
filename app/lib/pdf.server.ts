import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import qrcode from "qrcode-generator";
import { proposalRows } from "./proposal";
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
  const gold = rgb(0.79, 0.64, 0.27);

  const wrap = (text: string, maxW: number, f: PDFFont, size: number): string[] => {
    const lines: string[] = [];
    let cur = "";
    for (const w of text.split(" ")) {
      if (cur && f.widthOfTextAtSize(`${cur} ${w}`, size) > maxW) {
        lines.push(cur);
        cur = w;
      } else {
        cur = cur ? `${cur} ${w}` : w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const line = (label: string, value: string, size = 10) => {
    page.drawText(label, { x: margin, y, size, font: bold, color: dark });
    const valueX = margin + 150;
    const lines = wrap(value, 595.28 - margin - valueX, font, size);
    lines.forEach((l, i) => {
      page.drawText(l, { x: valueX, y: y - i * (size + 3), size, font, color: dark });
    });
    y -= lines.length * (size + 4);
  };

  const section = (title: string) => {
    y -= 10;
    page.drawText(title, { x: margin, y, size: 11, font: bold, color: accent });
    y -= 16;
  };

  // logo banner (ponytail: drawn stand-in, embed real logo PNG when provided)
  page.drawRectangle({ x: margin, y: y - 30, width: 260, height: 34, color: dark });
  page.drawText("PRIMODAYA", { x: margin + 12, y: y - 20, size: 20, font: bold, color: gold });
  page.drawRectangle({
    x: margin + 272,
    y: y - 26,
    width: 80,
    height: 26,
    borderColor: gray,
    borderWidth: 1,
    color: rgb(0.95, 0.95, 0.95),
  });
  page.drawText("LOGO", { x: margin + 296, y: y - 18, size: 9, font, color: gray });
  y -= 34 + 14;
  page.drawText("REFINED, CLEAN, SAFE, INDEPENDENT ENERGY", {
    x: margin,
    y,
    size: 10,
    font: bold,
    color: dark,
  });
  y -= 10;

  const { customer, pkg, pricing } = proposalRows(lead);

  section("CUSTOMER INFORMATION");
  customer.forEach((r) => line(r.label, r.value));

  section("PACKAGE");
  page.drawRectangle({
    x: 595.28 - margin - 70,
    y: y + 2,
    width: 70,
    height: 16,
    borderColor: gray,
    borderWidth: 1,
    color: rgb(0.95, 0.95, 0.95),
  });
  page.drawText("SOLIS LOGO", { x: 595.28 - margin - 62, y: y + 7, size: 7, font, color: gray });
  pkg.forEach((r) => line(r.label, r.value));

  section("PRICING");
  pricing.forEach((r) => line(r.label, r.value));

  y -= 14;
  page.drawText(
    "This proposal is valid until the date above. Scan the QR code to verify authenticity and",
    { x: margin, y, size: 9, font, color: gray },
  );
  y -= 12;
  page.drawText("accept the offer instantly via WhatsApp.", {
    x: margin,
    y,
    size: 9,
    font,
    color: gray,
  });

  y -= 26;
  page.drawText("Payment only Valid Through", { x: margin, y, size: 10, font: bold, color: dark });
  y -= 14;
  page.drawText("BCA XXX XXX XXXX", { x: margin, y, size: 10, font: bold, color: dark });
  y -= 14;
  page.drawText("PT Gladia 98 Bakti Cemerlang", {
    x: margin,
    y,
    size: 10,
    font: bold,
    color: dark,
  });
  y -= 16;

  const url = verifyUrl(env, lead.offerId);
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();
  const qrSize = 130;
  const cell = qrSize / count;
  const qrX = margin;
  const qrY = y - qrSize;
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
