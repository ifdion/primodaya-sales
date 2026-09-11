import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useActionData } from "react-router";
import { and, eq, isNull } from "drizzle-orm";
import { accounts, passwordResets } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { randomToken } from "../lib/password";
import { base } from "../lib/links";
import { sendPasswordReset } from "../lib/email.server";
import { getAccountForRequest } from "../lib/auth.server";
import { logAudit } from "../lib/audit.server";

const RESET_TTL_MINUTES = 60;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const db = getDb(env);
  const any = await db.select({ id: accounts.id }).from(accounts).limit(1).all();
  if (any.length === 0) return redirect("/crm/setup");
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
  const generic = "If an account matches that email, a reset link is on its way.";

  const account = email.includes("@")
    ? await db.query.accounts.findFirst({ where: eq(accounts.email, email) })
    : undefined;

  if (account?.active) {
    await db
      .delete(passwordResets)
      .where(
        and(
          eq(passwordResets.accountId, account.id),
          isNull(passwordResets.usedAt),
        ),
      );
    const token = randomToken(32);
    await db.insert(passwordResets).values({
      token,
      accountId: account.id,
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
    });
    const resetUrl = `${base(env)}/crm/reset-password/${token}`;
    const ok = await sendPasswordReset({
      apiKey: env.BREVO_API_KEY,
      from: env.EMAIL_FROM,
      to: email,
      name: account.name,
      resetUrl,
    });
    await logAudit(db, account.id, "PASSWORD_RESET_REQUESTED", "account", account.id);
    if (!ok && !env.BREVO_API_KEY) {
      return { flash: `Email not configured locally — open manually: ${resetUrl}` };
    }
  }
  return { flash: generic };
}

export default function ForgotPassword() {
  const data = useActionData<typeof action>();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-emerald-700">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your account email and we&apos;ll send a reset link, valid for 60 minutes.
        </p>
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
          {data && "flash" in data ? (
            <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {data.flash}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Send reset link
          </button>
        </Form>
        <Link
          to="/crm/login"
          className="mt-4 block text-center text-xs text-slate-400 hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
