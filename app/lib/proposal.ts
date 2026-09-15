import { TIERS, formatIdr } from "./catalog";
import type { leads } from "../../db/schema";

type Lead = typeof leads.$inferSelect;

export type Row = { label: string; value: string };

export const PPN_RATE = 0.11;

export function proposalRows(lead: Lead) {
  const tier = TIERS[lead.productTier as keyof typeof TIERS];

  const customer: Row[] = [
    { label: "Name", value: lead.leadName },
    { label: "Email", value: lead.leadEmail },
    { label: "Phone", value: lead.leadPhone },
    { label: "Vehicle", value: `${lead.evBrand} ${lead.evModel}` },
    { label: "Target purchase", value: lead.purchaseDate },
  ];

  const pkg: Row[] = [
    { label: "Package Type", value: `${tier.id} — ${tier.positioning}` },
    { label: "Solar Panel", value: `${tier.panels} ${tier.dailyYieldKwh}` },
    { label: "Battery Storage", value: tier.battery },
    { label: "Inverter", value: tier.inverter },
    { label: "EV Charger", value: tier.charger },
    { label: "Installation", value: tier.installation },
    { label: "Architectural Finishes", value: tier.finishes },
    { label: "Free Maintenance", value: tier.maintenance },
    { label: "Warranty", value: tier.warranty },
  ];

  const pricing: Row[] = [];
  if (lead.price) {
    const total = Math.round(lead.price * (1 - (lead.discount ?? 0) / 100));
    const netPreTax = Math.round(total / (1 + PPN_RATE));
    const grossPreTax = Math.round(lead.price / (1 + PPN_RATE));
    pricing.push({ label: "System Value", value: formatIdr(grossPreTax) });
    if (netPreTax < grossPreTax) {
      pricing.push({ label: "Incentive", value: `−${formatIdr(grossPreTax - netPreTax)}` });
    }
    pricing.push({ label: "PPN (11%)", value: formatIdr(total - netPreTax) });
    pricing.push({ label: "Total", value: formatIdr(total) });
  } else {
    pricing.push({ label: "Total", value: "Pricing in progress" });
  }
  pricing.push({ label: "Valid Through", value: lead.validityDate ?? "—" });

  return { customer, pkg, pricing };
}
