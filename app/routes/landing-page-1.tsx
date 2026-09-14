import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { z } from "zod";
import { getEnv } from "../lib/platform";
import { waLink } from "../lib/links";
import { TIERS, formatIdr, tierBaseline } from "../lib/catalog";

export async function loader({ context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  return { phone: env.SUPER_ADMIN_WHATSAPP || "6281234567890" };
}

export const meta: MetaFunction = () => [
  { title: "Solis Power by PrimoDaya — Total Energy Sovereignty for Luxury Estates" },
  {
    name: "description",
    content:
      "Independent, high-capacity residential microgrid power: Jinko solar, Solis hybrid inverters and storage, 11–22 kW EV charging. Engineered and installed by Gladia 98.",
  },
];

const rfpSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  phone: z.string().trim().min(8, "A valid phone / WhatsApp number is required."),
  location: z.enum(["Jabodetabek", "Bandung", "Other"]),
  plnCapacity: z.enum(["4,400 VA – 11,000 VA", "13,200 VA – 22,000 VA", "> 33,000 VA"]),
  evBrand: z.string().trim().optional(),
  packageInterest: z.enum(["COMPACT", "CORE", "ULTRA", "Custom Estate"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context);
  const phone = env.SUPER_ADMIN_WHATSAPP || "6281234567890";
  const form = await request.formData();
  const parsed = rfpSchema.safeParse({
    fullName: form.get("fullName"),
    phone: form.get("phone"),
    location: form.get("location"),
    plnCapacity: form.get("plnCapacity"),
    evBrand: form.get("evBrand") || undefined,
    packageInterest: form.get("packageInterest"),
    notes: form.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;
  const lines = [
    "RFP Request — Solis Power Landing Page",
    `Name: ${d.fullName}`,
    `Phone: ${d.phone}`,
    `Location: ${d.location}`,
    `PLN Capacity: ${d.plnCapacity}`,
    d.evBrand ? `EV: ${d.evBrand}` : null,
    `Package Interest: ${d.packageInterest}`,
    d.notes ? `Notes: ${d.notes}` : null,
  ].filter(Boolean);
  return redirect(waLink(phone, lines.join("\n")));
}

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";
const labelCls = "block text-sm font-semibold text-slate-700";

type IconName =
  | "sun"
  | "zap"
  | "home"
  | "shield"
  | "shieldCheck"
  | "lock"
  | "cpu"
  | "award"
  | "chart"
  | "box"
  | "wrench"
  | "clipboard"
  | "help"
  | "moon"
  | "battery";

const iconShapes: Record<IconName, React.ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  zap: <path d="M13 2 3 14h7l-1 8 11-13h-8l1-7z" />,
  home: <path d="M3 10.5 12 3l9 7.5M5 9v12h14V9M9 21v-6h6v6" />,
  shield: <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />,
  shieldCheck: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <path d="m9 11.5 2 2 4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  cpu: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="m8.8 12.5-1.8 9L12 18.8l5 2.7-1.8-9" />
    </>
  ),
  chart: <path d="M3 21h18M7 21v-8M12 21V5M17 21v-5" />,
  box: <path d="m12 2 9 5v10l-9 5-9-5V7l9-5zM3 7l9 5 9-5M12 12v10" />,
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  clipboard: (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.82 1.2c.18 1.97-2.92 2.79-2.92 4.3" />
      <path d="M12 17.5h.01" />
    </>
  ),
  moon: <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />,
  battery: (
    <>
      <rect x="2" y="7" width="16" height="10" rx="2" />
      <path d="M22 11v2M6 10.5v3M10 10.5v3M14 10.5v3" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {iconShapes[name]}
    </svg>
  );
}

const usps = [
  {
    icon: "sun" as IconName,
    title: "Clean Energy Independence",
    body: "Harness solar power directly through Jinko PV panels and store excess energy in high-capacity Solis battery systems. Achieve total freedom from grid outages, power cuts, and reliance on noisy diesel generators.",
  },
  {
    icon: "zap" as IconName,
    title: "Fast EV Charging Solution",
    body: "Deliver reliable 11 kW to 22 kW high-capacity power directly to your EV without tripping home circuit breakers, adding complex secondary PLN meters, or sacrificing daily luxury appliance performance.",
  },
  {
    icon: "home" as IconName,
    title: "Safe Structural Integration",
    body: "Built with an architectural-first engineering approach that integrates into your home’s existing electrical infrastructure without invasive overhauls, exposed wiring, or visual clutter.",
  },
];

const pillars = [
  {
    icon: "lock" as IconName,
    title: "Stealth Presence",
    body: "Concealed, neat cabinet installations designed to match modern architectural luxury.",
  },
  {
    icon: "shield" as IconName,
    title: "Zero-Flicker Resilience",
    body: "Ultra-fast power switching (<10ms to <0.5s) ensures home electronics, central ACs, and servers never drop during grid outages.",
  },
  {
    icon: "cpu" as IconName,
    title: "Smart Load Management",
    body: "Automated AI energy routing prioritizing solar energy, battery backup, and optimized EV charging.",
  },
];

const comparisonRows: [string, string, string, string][] = [
  [
    "Clean Energy Independence",
    "100% reliant on grid electricity",
    "Fossil fuel dependent, carbon heavy",
    "100% Solar-driven independent clean energy",
  ],
  [
    "Fast EV Charging",
    "Risk of tripping main breaker (jepret)",
    "Unstable voltage output for sensitive EVs",
    "Dedicated 11 kW–22 kW high-speed EV supply",
  ],
  [
    "Structural Integration",
    "Messy wiring, dual meters, or invasive rewiring",
    "Bulky, unsightly outdoor machinery",
    "Stealth wiring & custom modular enclosures",
  ],
  [
    "Outage Response",
    "No backup protection",
    "Loud, manual, or delayed auto-start",
    "Instant sub-second / zero-flicker transition",
  ],
  [
    "Noise & Comfort",
    "Silent",
    "High noise & exhaust emissions",
    "100% Silent operation",
  ],
];

const phases = [
  {
    title: "Phase 1: Pre-Construction (Survey & Proposal)",
    items: [
      "Physical Site Audit & Electrical Load Profiling (peak inrush current measurements for central ACs and EV Wallboxes).",
      "Custom capacity layout, transparent pricing, and legal/PLN coordination.",
    ],
  },
  {
    title: "Phase 2: Detailed Engineering & Execution",
    items: [
      "Architectural Detail Engineering: Shop drawings for hidden “stealth” cable runs and custom cabinet enclosures matching home interior/exterior design.",
      "Heavy-duty physical mounting of PV panels, inverters, batteries, and EV chargers.",
    ],
  },
  {
    title: "Phase 3: Quality Control & Extreme Testing",
    items: [
      "Outage Simulation: Testing grid disconnection to verify 0ms / sub-second seamless power switching.",
      "Stress Test: Concurrent operation of central air conditioning + 22 kW EV charging to verify anti-tripping systems.",
      "Zero-Dust Guarantee aesthetic finishing.",
    ],
  },
  {
    title: "Phase 4: Handover & Ongoing Maintenance (Post-Construction)",
    items: [
      "Formal BAST signing and homeowner/facility management onboarding on mobile app control.",
      "Active warranty coverage and preventive maintenance SLA support.",
    ],
  },
];

const faqs = [
  {
    q: "How does Solis ensure safe structural integration without damaging home interiors?",
    a: "All conduits and wiring are concealed behind walls or discreet architectural channels. Equipment housings are custom-built to match your garage or exterior aesthetics seamlessly.",
  },
  {
    q: "Can the fast EV charging solution run alongside heavy appliances like central ACs?",
    a: "Yes. Systems undergo peak load testing to guarantee high-capacity 11 kW/22 kW charging runs smoothly alongside central ACs and home electronics without tripping breakers.",
  },
  {
    q: "How clean is the power generation during grid outages?",
    a: "Solis operates silently on stored solar and battery power without reliance on noisy, fume-emitting generators. Switchover occurs in sub-seconds without interrupting lights or appliance operation.",
  },
  {
    q: "Is solar mandatory, or can I rely solely on battery storage?",
    a: "While battery storage provides rapid outage resilience, combining it with Jinko solar panels completes the clean energy system for self-sustaining independence.",
  },
];

function NodeBox({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string;
  tone: "amber" | "emerald" | "sky" | "slate";
}) {
  const palette = {
    amber: { fill: "#451a03", stroke: "#f59e0b", text: "#fbbf24" },
    emerald: { fill: "#022c22", stroke: "#10b981", text: "#34d399" },
    sky: { fill: "#082f49", stroke: "#38bdf8", text: "#7dd3fc" },
    slate: { fill: "#1e293b", stroke: "#64748b", text: "#cbd5e1" },
  }[tone];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={palette.fill} stroke={palette.stroke} strokeWidth={1.5} />
      <text
        x={x + w / 2}
        y={subtitle ? y + h / 2 - 4 : y + h / 2 + 4}
        textAnchor="middle"
        fill="white"
        fontSize={14}
        fontWeight={700}
      >
        {title}
      </text>
      {subtitle ? (
        <text x={x + w / 2} y={y + h / 2 + 16} textAnchor="middle" fill={palette.text} fontSize={12}>
          {subtitle}
        </text>
      ) : null}
    </g>
  );
}

function SystemDiagram() {
  return (
    <svg viewBox="0 0 940 400" className="w-full" role="img" aria-label="Solis microgrid system architecture diagram">
      <defs>
        <marker id="arrA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#f59e0b" />
        </marker>
        <marker id="arrE" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#10b981" />
        </marker>
      </defs>

      <NodeBox x={16} y={40} w={200} h={92} title="Solar Panels" subtitle="(Jinko Tiger)" tone="amber" />
      <NodeBox x={352} y={30} w={236} h={112} title="Hybrid Inverter" subtitle="(Solis 3-Phase)" tone="emerald" />
      <NodeBox x={724} y={40} w={200} h={92} title="Battery Storage" subtitle="(Solis Intelli/FlexHome)" tone="sky" />

      <line x1={216} y1={86} x2={344} y2={86} stroke="#f59e0b" strokeWidth={2.5} markerEnd="url(#arrA)" className="flow" />
      <text x={280} y={74} textAnchor="middle" fill="#f59e0b" fontSize={12} fontWeight={700}>DC</text>
      <line x1={588} y1={86} x2={716} y2={86} stroke="#38bdf8" strokeWidth={2.5} markerStart="url(#arrA)" markerEnd="url(#arrA)" className="flow" />
      <text x={652} y={74} textAnchor="middle" fill="#7dd3fc" fontSize={12} fontWeight={700}>DC</text>

      <line x1={470} y1={142} x2={470} y2={208} stroke="#10b981" strokeWidth={2.5} markerEnd="url(#arrE)" className="flow" />
      <text x={486} y={182} fill="#34d399" fontSize={12} fontWeight={700}>AC</text>

      <line x1={170} y1={216} x2={770} y2={216} stroke="#10b981" strokeWidth={2} />
      <line x1={170} y1={216} x2={170} y2={252} stroke="#10b981" strokeWidth={2.5} markerEnd="url(#arrE)" className="flow" />
      <line x1={470} y1={216} x2={470} y2={252} stroke="#10b981" strokeWidth={2.5} markerEnd="url(#arrE)" className="flow" />
      <line x1={770} y1={216} x2={770} y2={252} stroke="#10b981" strokeWidth={2.5} markerEnd="url(#arrE)" className="flow" />

      <NodeBox x={50} y={258} w={240} h={92} title="Home Main Panel" subtitle="(Daily Household)" tone="emerald" />
      <NodeBox x={350} y={258} w={240} h={92} title="Dedicated EV Sub-Panel" subtitle="(High-Speed Wallbox)" tone="emerald" />
      <NodeBox x={650} y={258} w={240} h={92} title="Emergency Manual Bypass" subtitle="(Grid Synchronization)" tone="slate" />
    </svg>
  );
}

const flowModes: { icon: IconName; label: string; desc: string }[] = [
  {
    icon: "sun",
    label: "Day Mode",
    desc: "Solar powers the home, charges the battery, and feeds the EV wallbox.",
  },
  {
    icon: "moon",
    label: "Night Mode",
    desc: "Stored battery energy discharges through the inverter to home and EV loads.",
  },
  {
    icon: "battery",
    label: "Blackout Mode",
    desc: "Zero-flicker islanding — the microgrid instantly detaches and keeps critical loads alive.",
  },
];

function Section({
  id,
  kicker,
  kickerIcon,
  title,
  desc,
  dark,
  children,
}: {
  id?: string;
  kicker: string;
  kickerIcon?: IconName;
  title: string;
  desc?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={dark ? "bg-slate-950 text-white" : "bg-white text-slate-900"}>
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]">
          {kickerIcon ? (
            <span
              className={
                dark
                  ? "inline-flex rounded-lg bg-amber-400/10 p-1.5 text-amber-400"
                  : "inline-flex rounded-lg bg-emerald-600/10 p-1.5 text-emerald-600"
              }
            >
              <Icon name={kickerIcon} className="h-4 w-4" />
            </span>
          ) : null}
          <span className={dark ? "text-amber-400" : "text-emerald-600"}>{kicker}</span>
        </p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h2>
        {desc ? <p className={`mt-4 max-w-3xl text-base leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>{desc}</p> : null}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export default function LandingPage1() {
  const { phone } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [submitting, setSubmitting] = useState(false);
  const tiers = Object.values(TIERS);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-white text-slate-900">
        <div className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-0 h-[480px] w-[480px] rounded-full bg-amber-100/60 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pt-28">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">
            PrimoDaya by Gladia 98 · Powered by Solis
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">
            Power Your Life & Luxury EV with{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-amber-500 bg-clip-text text-transparent">
              Total Energy Sovereignty
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Experience zero-emission energy independence, high-speed residential EV charging, and seamless
            architectural integration designed specifically for premium estates.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#rfp"
              className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500"
            >
              Request a Custom Proposal
            </a>
            <a
              href="#packages"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
            >
              Explore Packages
            </a>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {usps.map((u) => (
              <div key={u.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="inline-flex rounded-xl bg-amber-100 p-2.5 text-amber-600">
                  <Icon name={u.icon} />
                </span>
                <h3 className="mt-4 text-lg font-bold">{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 — End-to-End Solution & System Diagram */}
      <Section
        kicker="Technical Setup"
        kickerIcon="cpu"
        title="End-to-End Microgrid Infrastructure"
        desc="Solis integrates cleanly into existing home electrical systems without requiring a complete overhaul. The system automatically routes power from high-efficiency solar panels and energy storage to home sub-panels and EV chargers while maintaining full grid synchronization and emergency bypass capabilities."
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-8">
          <SystemDiagram />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {flowModes.map((m) => (
            <div key={m.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold">
                <span className="text-emerald-600">
                  <Icon name={m.icon} className="h-4 w-4" />
                </span>
                {m.label}
              </p>
              <p className="mt-1.5 text-sm text-slate-600">{m.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-16 text-xl font-bold">Before vs. After — Structural Integration</h3>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-red-600">Before · Traditional Setup</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {[
                "Messy multi-meter setups",
                "Exposed surface conduits and clutter",
                "Bulky diesel generator boxes dominating the yard",
                "Loud start-up, exhaust fumes, fuel deliveries",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 text-red-500">✕</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">After · Solis Setup</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {[
                "Concealed interior wiring runs",
                "Clean custom-encased battery cabinet",
                "Single sleek EV wallbox integrated into the garage wall",
                "100% silent, zero-emission operation",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 text-emerald-600">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Section 3 — Solis Brand */}
      <Section
        dark
        kicker="The Brand"
        kickerIcon="zap"
        title="Powered by Solis — Next-Gen Residential Energy Storage"
        desc="Solis represents the gold standard in intelligent residential solar and battery storage architecture. Designed for whisper-quiet performance, sleek architectural blending, and ultra-fast transfer speeds, Solis systems transform modern homes into self-sustaining power stations."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <span className="inline-flex rounded-xl bg-emerald-400/10 p-2.5 text-emerald-400">
                <Icon name={p.icon} />
              </span>
              <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 4 — Comparison */}
      <Section kicker="The Comparison" kickerIcon="chart" title="Why Solis Outperforms Traditional Alternatives">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-950 text-white">
                <th className="px-5 py-4 font-semibold">Feature / Metric</th>
                <th className="px-5 py-4 font-semibold">Standard PLN Upgrades</th>
                <th className="px-5 py-4 font-semibold">Diesel Generators</th>
                <th className="px-5 py-4 font-semibold text-emerald-400">Solis Integrated Microgrid</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(([feature, pln, diesel, solis], i) => (
                <tr key={feature} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                  <td className="px-5 py-4 font-bold text-slate-900">{feature}</td>
                  <td className="px-5 py-4 text-slate-600">{pln}</td>
                  <td className="px-5 py-4 text-slate-600">{diesel}</td>
                  <td className="bg-emerald-50/70 px-5 py-4 font-semibold text-emerald-800">{solis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 5 — Packages */}
      <Section
        id="packages"
        kicker="Product Packages"
        kickerIcon="box"
        title="Choose Your Level of Energy Sovereignty"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-bold tracking-wide text-amber-600">{t.id}</h3>
              <p className="mt-1 text-sm text-slate-500">{t.positioning}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">
                <li>{t.charger}</li>
                <li>{t.battery}</li>
                <li>{t.inverter}</li>
                <li>{t.panels}</li>
                <li className="font-semibold text-emerald-600">{t.dailyYieldKwh}</li>
              </ul>
              <div className="mt-6 border-t border-slate-100 pt-4">
                {t.launchPriceIdr ? (
                  <>
                    <p className="text-xs text-slate-400">
                      Original: <span className="line-through">{formatIdr(t.listPriceIdr)}</span>
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{formatIdr(tierBaseline(t.id))}</p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-slate-900">{formatIdr(tierBaseline(t.id))}</p>
                )}
              </div>
              <a
                className="mt-6 rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-500"
                href={waLink(phone, `I am interested in the ${t.id} package.`)}
              >
                Enquire on WhatsApp
              </a>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 6 — Installation Process */}
      <Section
        kicker="Installation Process"
        kickerIcon="wrench"
        title="End-to-End Seamless Implementation"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {phases.map((p, i) => (
            <div key={p.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-lg font-bold">{p.title}</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {p.items.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 7 — RFP Form */}
      <Section
        id="rfp"
        kicker="Request for Proposal"
        kickerIcon="clipboard"
        title="Design Your Custom Energy Solution"
        desc="Tell us about your estate and requirements. Our engineers respond with a tailored microgrid proposal."
      >
        <Form
          method="post"
          className="max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm sm:p-8"
          onSubmit={() => setSubmitting(true)}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelCls}>
              Full Name
              <input name="fullName" type="text" required placeholder="Your full name" className={inputCls} />
            </label>
            <label className={labelCls}>
              Phone / WhatsApp Number
              <input name="phone" type="tel" required placeholder="08xx xxxx xxxx" className={inputCls} />
            </label>
            <label className={labelCls}>
              Property Location
              <select name="location" required defaultValue="Jabodetabek" className={inputCls}>
                <option>Jabodetabek</option>
                <option>Bandung</option>
                <option>Other</option>
              </select>
            </label>
            <label className={labelCls}>
              Current PLN Electrical Capacity (VA)
              <select name="plnCapacity" required defaultValue="4,400 VA – 11,000 VA" className={inputCls}>
                <option>4,400 VA – 11,000 VA</option>
                <option>13,200 VA – 22,000 VA</option>
                <option>&gt; 33,000 VA</option>
              </select>
            </label>
            <label className={labelCls}>
              EV Brand &amp; Model
              <input
                name="evBrand"
                type="text"
                list="ev-brands"
                placeholder="e.g. Hyundai Ioniq 5"
                className={inputCls}
              />
              <datalist id="ev-brands">
                {["Hyundai", "Kia", "BMW", "Mercedes-Benz", "Tesla", "BYD", "Wuling", "Audi", "Volvo", "Lexus"].map(
                  (b) => (
                    <option key={b} value={b} />
                  ),
                )}
              </datalist>
            </label>
            <label className={labelCls}>
              Package Interest
              <select name="packageInterest" required defaultValue="CORE" className={inputCls}>
                <option value="COMPACT">Compact</option>
                <option value="CORE">Core</option>
                <option value="ULTRA">Ultra</option>
                <option value="Custom Estate">Custom Estate</option>
              </select>
            </label>
          </div>
          <label className={`${labelCls} mt-5 block`}>
            Notes / Additional Requirements
            <textarea
              name="notes"
              rows={4}
              placeholder="Roof area, number of EVs, central AC load, aesthetic preferences…"
              className={inputCls}
            />
          </label>
          {actionData && !actionData.ok ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {actionData.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-amber-400 px-6 py-3 font-bold text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Submitting…" : "Submit RFP Request"}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Submitting opens WhatsApp with your RFP summary so our team can reply instantly.
          </p>
        </Form>
      </Section>

      {/* Section 8 — FAQ */}
      <Section kicker="FAQ" kickerIcon="help" title="Frequently Asked Questions">
        <div className="max-w-3xl space-y-4">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-200 bg-slate-50 open:bg-white">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span aria-hidden className="text-emerald-600 transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Section 9 — Local Strategic Partner */}
      <Section
        id="partner"
        dark
        kicker="Local Strategic Partner"
        kickerIcon="shieldCheck"
        title="Local Excellence & Engineering Reliability by Gladia 98"
        desc="Gladia 98 serves as the official local partner and certified installer for Solis energy systems across Jabodetabek and Bandung."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: "award" as IconName,
              title: "Certified Technical Leadership",
              body: "Direct oversight by specialized field teams and system engineers trained to zero-defect standards.",
            },
            {
              icon: "wrench" as IconName,
              title: "White-Glove Service & Maintenance SLA",
              body: "Dedicated local fast-response teams for continuous preventive maintenance and immediate technical support.",
            },
            {
              icon: "home" as IconName,
              title: "Architectural Synergy",
              body: "Extensive experience working alongside luxury home architects and luxury vehicle distributors to deliver integrated energy solutions.",
            },
          ].map((v) => (
            <div key={v.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <span className="inline-flex rounded-xl bg-emerald-400/10 p-2.5 text-emerald-400">
                <Icon name={v.icon} />
              </span>
              <h3 className="mt-4 text-lg font-bold">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{v.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <a
            href={waLink(phone, "I would like to discuss a Solis microgrid for my estate.")}
            className="inline-block rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white transition hover:bg-emerald-400"
          >
            Talk to Gladia 98 on WhatsApp
          </a>
        </div>
      </Section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} PrimoDaya by Gladia 98 · Powered by Solis
      </footer>
    </main>
  );
}
