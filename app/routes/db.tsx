import type { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { getAccountForRequest } from "../lib/auth.server";
import { getEnv } from "../lib/platform";
import { getDb } from "../lib/db";
import { logAudit } from "../lib/audit.server";

async function guard(request: Request, context: AppLoadContext) {
  const env = getEnv(context);
  if (env.DB_ADMIN_ENABLED !== "true") throw new Response("Not Found", { status: 404 });
  const account = await getAccountForRequest(request, context);
  if (!account || account.role !== "SUPER_ADMIN") {
    throw new Response("Forbidden — DB console is Super Admin only.", { status: 403 });
  }
  return { env, account };
}

const DEFAULT_SQL = "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env } = await guard(request, context);
  const sql = new URL(request.url).searchParams.get("sql") ?? DEFAULT_SQL;
  let result: { rows: Record<string, unknown>[] } | { error: string } | null = null;
  try {
    if (/^\s*(select|pragma|with)\b/i.test(sql)) {
      const { results } = await env.DB.prepare(sql).all();
      result = { rows: results as Record<string, unknown>[] };
    }
  } catch (e) {
    result = { error: e instanceof Error ? e.message : String(e) };
  }
  return { sql, result };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, account } = await guard(request, context);
  const db = getDb(env);
  const form = await request.formData();
  const sql = String(form.get("sql") ?? "").trim();
  if (!sql) return redirect(`/db?sql=${encodeURIComponent(DEFAULT_SQL)}`);
  try {
    const out = await env.DB.prepare(sql).run();
    await logAudit(db, account.id, "DB_CONSOLE_WRITE", "database", null, sql.slice(0, 500));
    return redirect(
      `/db?sql=${encodeURIComponent(sql)}&meta=${encodeURIComponent(
        `run ok · changes=${out.meta.changes} · duration=${Math.round(out.meta.duration)}ms`,
      )}`,
    );
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
      sql,
    };
  }
}

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs";
const btn =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700";

function ResultsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">0 rows.</p>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 uppercase text-slate-500">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c} className="px-3 py-1.5 font-mono">
                  {r[c] === null ? "NULL" : String(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DbConsole() {
  const { sql, result } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const error =
    actionData && "error" in actionData
      ? actionData.error
      : result && "error" in result
        ? result.error
        : null;
  const rows = result && "rows" in result ? result.rows : null;
  const meta = new URLSearchParams(
    typeof location !== "undefined" ? location.search : "",
  ).get("meta");

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">DB Admin Console</h1>
          <p className="text-xs text-slate-500">
            Super Admin only · D1 <code>primodaya-crm-db</code> · every write is audit-logged
          </p>
        </div>
        <button
          type="submit"
          form="db-form"
          className={btn}
        >
          Run
        </button>
      </div>

      <Form id="db-form" method="post" className="space-y-2">
        <textarea name="sql" rows={5} className={input} defaultValue={sql} />
        <p className="text-xs text-slate-400">
          SELECT / WITH / PRAGMA run on GET style browse; INSERT / UPDATE / DELETE submit via form
          (Run button) and are recorded in audit_logs.
        </p>
      </Form>

      {error ? (
        <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {meta ? <p className="mt-4 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">{meta}</p> : null}

      {rows ? (
        <div className="mt-4">
          <ResultsTable rows={rows} />
        </div>
      ) : null}
    </main>
  );
}
