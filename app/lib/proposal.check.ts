// Run: npx tsx app/lib/proposal.check.ts
import { proposalRows } from "./proposal";

const lead = {
  leadName: "B",
  leadEmail: "e",
  leadPhone: "p",
  evBrand: "hyundai",
  evModel: "kona",
  purchaseDate: "Immediate",
  productTier: "CORE",
  price: 585_000_000,
  discount: 0,
  validityDate: "30 September 2026",
} as any;

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const { pricing } = proposalRows(lead);
const get = (l: string) => pricing.find((r) => r.label === l)!.value;

console.assert(get("Total") === idr(585_000_000), "total");
console.assert(get("PPN (11%)") === idr(585_000_000 - Math.round(585_000_000 / 1.11)), "ppn");
console.assert(!pricing.some((r) => r.label === "Incentive"), "no incentive at 0%");
console.assert(
  proposalRows({ ...lead, discount: 5 }).pricing.some((r) => r.label === "Incentive"),
  "incentive at 5%",
);
console.log("proposal check ok");
