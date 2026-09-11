import { Form, redirect, useActionData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";
import { accounts } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { hashPassword } from "../lib/password";
import { loginAccount } from "../lib/auth.server";
import { logAudit } from "../lib/audit.server";
import { PasswordInput } from "../components/password-input";

export async function loader({ context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const db = getDb(env);
  const any = await db.select({ id: accounts.id }).from(accounts).limit(1).all();
  if (any.length > 0) return redirect("/crm/login");
  return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context);
  const db = getDb(env);
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const phone = String(form.get("phone") ?? "").trim() || null;
  const password = String(form.get("password") ?? "");

  if (name.length < 2 || !email.includes("@") || password.length < 10) {
    return { error: "All fields required; password needs 10+ characters." };
  }
  const existing = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1)
    .all();
  if (existing.length > 0) return { error: "Email already registered." };

  const id = crypto.randomUUID();
  await db.insert(accounts).values({
    id,
    name,
    email,
    phone,
    role: "SUPER_ADMIN",
    passwordHash: await hashPassword(password),
    createdBy: null,
  });
  await logAudit(db, id, "BOOTSTRAP_SUPER_ADMIN", "account", id);
  const cookie = await loginAccount(id, context);
  return redirect("/crm/dashboard", { headers: { "Set-Cookie": cookie } });
}

export default function Setup() {
  const data = useActionData<typeof action>();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-emerald-700">First-run setup</h1>
        <p className="mt-1 text-sm text-slate-500">Create the Super Admin account.</p>
        <Form method="post" className="mt-6 space-y-4">
          <input
            name="name"
            required
            placeholder="Full name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="phone"
            placeholder="WhatsApp number e.g. 6281234567890"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <PasswordInput
            name="password"
            required
            minLength={10}
            placeholder="Password (min 10 chars)"
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {data && "error" in data ? (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{data.error}</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Create Super Admin
          </button>
        </Form>
      </div>
    </main>
  );
}
