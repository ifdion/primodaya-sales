import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { accounts, invites } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { hashPassword } from "../lib/password";
import { loginAccount } from "../lib/auth.server";
import { logAudit } from "../lib/audit.server";
import { PasswordInput } from "../components/password-input";

async function loadInvite({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.pathname.split("/").pop() ?? "";
  const env = getEnv(context);
  const db = getDb(env);
  const invite = await db.query.invites.findFirst({ where: eq(invites.token, token) });
  if (!invite || invite.usedAt || new Date(invite.expiresAt) < new Date()) return null;
  return invite;
}

export async function loader(args: LoaderFunctionArgs) {
  const invite = await loadInvite(args);
  if (!invite) {
    return { invalid: true as const, name: null, role: null };
  }
  return { invalid: false as const, name: invite.name, role: invite.role };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const invite = await loadInvite({ request, context } as LoaderFunctionArgs);
  if (!invite) {
    return { error: "This invitation is invalid or has expired." };
  }
  const env = getEnv(context);
  const db = getDb(env);
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Password needs 10+ characters." };

  const id = crypto.randomUUID();
  await db.insert(accounts).values({
    id,
    name: invite.name,
    email: invite.email,
    phone: String(form.get("phone") ?? "").trim() || null,
    role: invite.role,
    managerId: invite.managerId ?? null,
    passwordHash: await hashPassword(password),
    createdBy: invite.createdById,
  });
  await db
    .update(invites)
    .set({ usedAt: new Date() })
    .where(eq(invites.token, invite.token));
  await logAudit(db, invite.createdById, "INVITE_ACCEPTED", "account", id);

  const cookie = await loginAccount(id, context);
  return redirect("/crm/dashboard", { headers: { "Set-Cookie": cookie } });
}

export default function Invite() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (data.invalid) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-red-600">Invitation not valid</h1>
          <p className="mt-2 text-sm text-slate-500">
            This invitation link was already used or has expired. Ask your administrator to send a
            new one.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-emerald-700">Welcome, {data.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          You are joining as {data.role === "SALES_MANAGER" ? "Sales Manager" : "Sales Representative"}.
          Choose a password to finish setup.
        </p>
        <Form method="post" className="mt-6 space-y-4">
          <input
            name="phone"
            placeholder="WhatsApp number (used for proposal links)"
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
          {actionData && "error" in actionData ? (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{actionData.error}</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Set password & sign in
          </button>
        </Form>
      </div>
    </main>
  );
}
