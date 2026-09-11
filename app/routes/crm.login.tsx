import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useActionData } from "react-router";
import { eq } from "drizzle-orm";
import { accounts } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { verifyPassword } from "../lib/password";
import { getAccountForRequest, loginAccount } from "../lib/auth.server";
import { logAudit } from "../lib/audit.server";
import { PasswordInput } from "../components/password-input";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const db = getDb(env);
  const count = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.role, "SUPER_ADMIN"))
    .limit(1)
    .all();
  if (count.length === 0) return redirect("/crm/setup");
  if (await getAccountForRequest(request, context)) {
    return redirect("/crm/dashboard");
  }
  return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context);
  const db = getDb(env);
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.email, email),
  });
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  if (!account.active) {
    return { error: "This account is disabled. Contact your administrator." };
  }

  const cookie = await loginAccount(account.id, context);
  await logAudit(db, account.id, "LOGIN", "account", account.id);
  return redirect("/crm/dashboard", { headers: { "Set-Cookie": cookie } });
}

export default function Login() {
  const data = useActionData<typeof action>();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-emerald-700">Primodaya CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Staff sign in</p>
        <Form method="post" className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <div className="mt-1">
              <PasswordInput
                id="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          {data && "error" in data && data.error ? (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{data.error}</p>
          ) : null}
          <div className="flex items-center justify-between text-xs">
            <Link to="/crm/forgot-password" className="text-emerald-700 hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Sign in
          </button>
        </Form>
        <Link to="/" className="mt-4 block text-center text-xs text-slate-400 hover:underline">
          ← Back to primodaya.gladia98.com
        </Link>
      </div>
    </main>
  );
}
