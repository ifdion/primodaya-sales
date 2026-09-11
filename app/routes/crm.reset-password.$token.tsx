import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { accounts, passwordResets, sessions } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { hashPassword } from "../lib/password";
import { logAudit } from "../lib/audit.server";
import { PasswordInput } from "../components/password-input";

async function loadReset(token: string, context: ActionFunctionArgs["context"]) {
  const env = getEnv(context);
  const db = getDb(env);
  const reset = await db.query.passwordResets.findFirst({
    where: eq(passwordResets.token, token),
  });
  if (!reset || reset.usedAt || new Date(reset.expiresAt) < new Date()) return null;
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, reset.accountId),
  });
  if (!account || !account.active) return null;
  return { db, env, reset, account };
}

export async function loader({ params, context }: LoaderFunctionArgs) {
  const found = await loadReset(params.token ?? "", context);
  if (!found) return { invalid: true as const, name: null, email: null };
  return { invalid: false as const, name: found.account.name, email: found.account.email };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const found = await loadReset(params.token ?? "", context);
  if (!found) return { error: "This reset link is invalid or has expired." };
  const { db, reset, account } = found;

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 10) return { error: "Password needs 10+ characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  await db
    .update(accounts)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(accounts.id, account.id));
  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(eq(passwordResets.token, reset.token));
  await db.delete(sessions).where(eq(sessions.accountId, account.id));
  await logAudit(db, account.id, "PASSWORD_RESET", "account", account.id);

  return { done: true as const };
}

export default function ResetPassword() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        {actionData && "done" in actionData && actionData.done ? (
          <>
            <h1 className="text-lg font-bold text-emerald-700">Password updated</h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in with your new password. All previous sessions were revoked.
            </p>
            <Link
              to="/crm/login"
              className="mt-4 block w-full rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Go to sign in
            </Link>
          </>
        ) : data.invalid ? (
          <>
            <h1 className="text-lg font-bold text-red-600">Reset link not valid</h1>
            <p className="mt-2 text-sm text-slate-500">
              This link was already used or has expired. Request a new one from the sign-in page.
            </p>
            <Link
              to="/crm/forgot-password"
              className="mt-4 block text-center text-sm text-emerald-700 hover:underline"
            >
              Request a new reset link
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-emerald-700">Set a new password</h1>
            <p className="mt-1 text-sm text-slate-500">{data.name} ({data.email})</p>
            <Form method="post" className="mt-6 space-y-4">
              <PasswordInput
                name="password"
                required
                minLength={10}
                placeholder="New password (min 10 chars)"
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <PasswordInput
                name="confirm"
                required
                minLength={10}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              {actionData && "error" in actionData ? (
                <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {actionData.error}
                </p>
              ) : null}
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Reset password
              </button>
            </Form>
          </>
        )}
      </div>
    </main>
  );
}
