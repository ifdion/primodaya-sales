import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { eq, inArray } from "drizzle-orm";
import { accounts, invites } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { getAccountForRequest, requireAccount } from "../lib/auth.server";
import { randomToken } from "../lib/password";
import { base } from "../lib/links";
import { sendInvite } from "../lib/email.server";
import { logAudit } from "../lib/audit.server";

type InviteRole = "SALES_MANAGER" | "SALES";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const account = requireAccount(
    await getAccountForRequest(request, context),
  );
  if (account.role === "SALES") throw new Response("Forbidden", { status: 403 });
  const env = getEnv(context);
  const db = getDb(env);
  const members = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      email: accounts.email,
      role: accounts.role,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(
      account.role === "SUPER_ADMIN"
        ? inArray(accounts.role, ["SALES_MANAGER", "SALES"])
        : eq(accounts.createdBy, account.id),
    )
    .all();
  const pending = await db
    .select({ email: invites.email, role: invites.role, expiresAt: invites.expiresAt })
    .from(invites)
    .where(inArray(invites.createdById, [account.id]))
    .all();
  return { account, members, pending, env: { url: base(env) } };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const account = requireAccount(
    await getAccountForRequest(request, context),
  );
  const env = getEnv(context);
  const db = getDb(env);
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  let role = String(form.get("role") ?? "SALES") as InviteRole;
  if (account.role !== "SUPER_ADMIN") role = "SALES";
  if (name.length < 2 || !email.includes("@")) return { error: "Name and valid email required." };

  const token = randomToken(16);
  await db.insert(invites).values({
    token,
    name,
    email,
    role,
    createdById: account.id,
    expiresAt: new Date(Date.now() + 72 * 3_600_000),
  });
  const ok = await sendInvite({
    email: env.EMAIL,
    from: env.EMAIL_FROM,
    to: email,
    name,
    inviterName: account.name,
    setupUrl: `${base(env)}/crm/invite/${token}`,
  });
  await logAudit(db, account.id, "INVITE_MEMBER", "account", null, `${role} ${email}`);
  return {
    flash: ok
      ? `Invitation emailed to ${email}.`
      : `Invite created but email delivery failed — share manually: ${base(env)}/crm/invite/${token}`,
  };
}

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const btn =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700";

export default function Team() {
  const { account, members, pending } = useLoaderData<typeof loader>();
  const data = useActionData<typeof action>();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Team</h1>
      {data && "error" in data ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{data.error}</p>
      ) : null}
      {data && "flash" in data ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{data.flash}</p>
      ) : null}

      <Form method="post" className="grid max-w-2xl items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <label className="text-sm font-medium">
          Name
          <input name="name" required className={input} />
        </label>
        <label className="text-sm font-medium">
          Email
          <input name="email" type="email" required className={input} />
        </label>
        {account.role === "SUPER_ADMIN" ? (
          <label className="text-sm font-medium">
            Role
            <select name="role" className={input} defaultValue="SALES_MANAGER">
              <option value="SALES_MANAGER">Sales Manager</option>
              <option value="SALES">Sales Representative</option>
            </select>
          </label>
        ) : null}
        <button type="submit" className={btn}>
          Send invitation
        </button>
      </Form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-slate-500">{m.email}</td>
                <td className="px-4 py-3">{m.role}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pending.length > 0 ? (
        <div className="text-sm text-slate-500">
          <p className="font-semibold">Pending invitations:</p>
          <ul className="ml-5 list-disc">
            {pending.map((p) => (
              <li key={`${p.email}-${p.role}`}>
                {p.email} ({p.role}) — expires{" "}
                {new Date(p.expiresAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
