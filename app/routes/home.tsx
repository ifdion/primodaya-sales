import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import { getEnv } from "../lib/platform";
import { TIERS, formatIdr, tierBaseline } from "../lib/catalog";

export async function loader({ context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  return { phone: env.SUPER_ADMIN_WHATSAPP || "6281234567890" };
}

export const meta: MetaFunction = () => [
  { title: "Primodaya — Integrated Energy Ecosystem" },
  {
    name: "description",
    content:
      "Wallbox EV charger, battery storage, hybrid inverter and solar panels as one packaged solution. COMPACT, CORE and ULTRA tiers.",
  },
];

const tierCards = Object.values(TIERS);

export default function Home() {
  const { phone } = useLoaderData<typeof loader>();
  return (
    <main className="min-h-screen">
      <header className="bg-emerald-700 text-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-200">
            Primodaya
          </p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">
            Your complete electrical power ecosystem
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-emerald-100">
            Wallbox EV charger, battery storage, hybrid inverter and solar panels —
            engineered as one integrated solution and backed by our sales team.
          </p>
          <div className="mt-8 flex gap-4">
            <a
              href="#packages"
              className="rounded-lg bg-white px-5 py-2.5 font-semibold text-emerald-800 shadow hover:bg-emerald-50"
            >
              View packages
            </a>
            <a
              href="/crm/login"
              className="rounded-lg border border-emerald-300 px-5 py-2.5 font-semibold text-white hover:bg-emerald-600"
            >
              Staff sign in
            </a>
          </div>
        </div>
      </header>

      <section id="packages" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold">Three tiers, one promise: energy sovereignty</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {tierCards.map((t) => (
            <div
              key={t.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-emerald-700">{t.id}</h3>
              <p className="text-sm text-slate-500">{t.positioning}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                <li>{t.charger}</li>
                <li>{t.battery}</li>
                <li>{t.inverter}</li>
                <li>{t.panels}</li>
                <li className="font-semibold">{t.dailyYieldKwh}</li>
              </ul>
              <div className="mt-4 border-t border-slate-100 pt-4">
                {t.launchPriceIdr ? (
                  <p className="text-sm text-slate-400 line-through">
                    {formatIdr(t.listPriceIdr)}
                  </p>
                ) : null}
                <p className="text-xl font-bold">{formatIdr(tierBaseline(t.id))}</p>
              </div>
              <a
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                href={`https://wa.me/${phone}?text=${encodeURIComponent(
                  `I am interested in the ${t.id} package.`,
                )}`}
              >
                Enquire on WhatsApp
              </a>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Primodaya — Integrated Energy Ecosystem
      </footer>
    </main>
  );
}
