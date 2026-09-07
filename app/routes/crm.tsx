import { Link, Outlet, redirect, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getAccountForRequest, type AccountRow } from "../lib/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const account = await getAccountForRequest(request, context);
  if (!account) throw redirect("/crm/login");
  return { account };
}

export default function CrmLayout() {
  const { account } = useLoaderData<typeof loader>();
  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/crm/dashboard" className="font-bold">
              Primodaya CRM
            </Link>
            <Link className="text-sm text-slate-300 hover:text-white" to="/crm/dashboard">
              Leads
            </Link>
            {account.role !== "SALES" ? (
              <Link className="text-sm text-slate-300 hover:text-white" to="/crm/team">
                Team
              </Link>
            ) : null}
            <Link className="text-sm text-slate-300 hover:text-white" to="/crm/leads/new">
              New lead
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-300">
              {account.name}{" "}
              <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs">
                {account.role.replace("SALES_", "").toLowerCase()}
              </span>
            </span>
            <Link to="/crm/logout" className="text-slate-300 hover:text-white">
              Sign out
            </Link>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}
