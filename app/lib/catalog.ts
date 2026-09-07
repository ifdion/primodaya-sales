export type TierId = "COMPACT" | "CORE" | "ULTRA";

export interface TierSpec {
  id: TierId;
  positioning: string;
  charger: string;
  battery: string;
  inverter: string;
  panels: string;
  dailyYieldKwh: string;
  listPriceIdr: number;
  launchPriceIdr?: number;
}

export const TIERS: Record<TierId, TierSpec> = {
  COMPACT: {
    id: "COMPACT",
    positioning: "Energy Resilience Integration",
    charger: "ABB Terra Box — 11 kW",
    battery: "Solis IntelliHome — 10 kWh",
    inverter: "Solis 3-Phase — 12 kW",
    panels: "Jinko Tiger",
    dailyYieldKwh: "up to 19 kWh daily",
    listPriceIdr: 330_000_000,
    launchPriceIdr: 285_000_000,
  },
  CORE: {
    id: "CORE",
    positioning: "Balanced Green Electricity Lifestyle",
    charger: "ABB Terra Box — 11 kW",
    battery: "Solis FlexHome — 16 kWh",
    inverter: "Solis 3-Phase — 15 kW",
    panels: "Jinko Tiger",
    dailyYieldKwh: "up to 33 kWh daily",
    listPriceIdr: 585_000_000,
  },
  ULTRA: {
    id: "ULTRA",
    positioning: "Energy Sovereignty & High-Capacity Charging",
    charger: "ABB Terra Box — 22 kW",
    battery: "Solis FlexHome — 64 kWh",
    inverter: "Solis 3-Phase — 30 kW",
    panels: "Jinko Tiger",
    dailyYieldKwh: "up to 95 kWh daily",
    listPriceIdr: 1_560_000_000,
  },
};

export const TIER_IDS = Object.keys(TIERS) as TierId[];

export function tierBaseline(tier: TierId): number {
  const t = TIERS[tier];
  return t.launchPriceIdr ?? t.listPriceIdr;
}

export function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
