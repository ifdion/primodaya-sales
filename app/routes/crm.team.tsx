import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { useState } from "react";
import { eq, inArray, or } from "drizzle-orm";
import { accounts, invites, sessions } from "../../db/schema";
import { getDb } from "../lib/db";
import { getEnv } from "../lib/platform";
import { getAccountForRequest, requireAccount } from "../lib/auth.server";
import { hashPassword, randomToken } from "../lib/password";
import { base } from "../lib/links";
import { sendInvite } from "../lib/email.server";
import { logAudit } from "../lib/audit.server";
import { PasswordInput } from "../components/password-input";

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
      phone: accounts.phone,
      role: accounts.role,
      managerId: accounts.managerId,
      active: accounts.active,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(
      account.role === "SUPER_ADMIN"
        ? undefined
        : or(eq(accounts.managerId, account.id), eq(accounts.createdBy, account.id)),
    )
    .all();
  const managers = await db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.role, "SALES_MANAGER"))
    .all();
  const pending = await db
    .select({ email: invites.email, role: invites.role, expiresAt: invites.expiresAt })
    .from(invites)
    .where(
      account.role === "SUPER_ADMIN"
        ? undefined
        : inArray(invites.createdById, [account.id]),
    )
    .all();
  return { account, members, managers, pending, env: { url: base(env) } };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const account = requireAccount(
    await getAccountForRequest(request, context),
  );
  const env = getEnv(context);
  const db = getDb(env);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "invite") {
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    let role = String(form.get("role") ?? "SALES_MANAGER") as InviteRole;
    let managerId: string | null = null;
    if (account.role !== "SUPER_ADMIN") {
      role = "SALES";
      managerId = account.id;
    } else if (role === "SALES") {
      const picked = String(form.get("managerId") ?? "");
      const mgr = picked
        ? await db.query.accounts.findFirst({ where: eq(accounts.id, picked) })
        : null;
      if (!mgr || mgr.role !== "SALES_MANAGER") {
        return { error: "Pick a Sales Manager to own this representative." };
      }
      managerId = mgr.id;
    }
    if (name.length < 2 || !email.includes("@")) return { error: "Name and valid email required." };

    const token = randomToken(16);
    await db.insert(invites).values({
      token,
      name,
      email,
      role,
      managerId,
      createdById: account.id,
      expiresAt: new Date(Date.now() + 72 * 3_600_000),
    });
    const ok = await sendInvite({
      apiKey: env.BREVO_API_KEY,
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

  if (intent === "member_update") {
    const id = String(form.get("id") ?? "");
    const target = await db.query.accounts.findFirst({ where: eq(accounts.id, id) });
    if (!target) return { error: "Member not found." };

    if (account.role !== "SUPER_ADMIN") {
      if (account.role !== "SALES_MANAGER") return { error: "Not allowed." };
      const owns = target.managerId === account.id || (!target.managerId && target.createdBy === account.id);
      if (target.role !== "SALES" || !owns) {
        return { error: "You can only manage your own sales team." };
      }
    }

    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const phone = String(form.get("phone") ?? "").trim() || null;
    const password = String(form.get("password") ?? "");
    const active = form.get("active") !== null;
    const isSuper = account.role === "SUPER_ADMIN";
    const managerId = isSuper && target.role === "SALES"
      ? String(form.get("managerId") ?? "") || null
      : target.managerId;
    if (managerId && managerId !== target.managerId) {
      const mgr = await db.query.accounts.findFirst({ where: eq(accounts.id, managerId) });
      if (!mgr || mgr.role !== "SALES_MANAGER") return { error: "Assigned manager not found." };
    }

    if (name.length < 2) return { error: "Name is required." };
    if (!email.includes("@")) return { error: "Valid email is required." };
    if (!active && target.id === account.id) {
      return { error: "You cannot disable your own account." };
    }
    const clash = await db.query.accounts.findFirst({
      where: eq(accounts.email, email),
    });
    if (clash && clash.id !== target.id) return { error: "Email is already in use." };
    if (password && password.length < 10) {
      return { error: "Replacement password needs 10+ characters." };
    }

    await db
      .update(accounts)
      .set({
        name,
        email,
        phone,
        active,
        ...(isSuper && target.role === "SALES" ? { managerId } : {}),
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      })
      .where(eq(accounts.id, target.id));

    const revoked = password || !active;
    if (revoked) {
      await db.delete(sessions).where(eq(sessions.accountId, target.id));
    }
    await logAudit(
      db,
      account.id,
      "UPDATE_MEMBER",
      "account",
      target.id,
      [
        password ? "password-reset" : null,
        active === target.active ? null : `active=${active}`,
        managerId !== target.managerId ? `manager=${managerId ?? "none"}` : null,
      ]
        .filter(Boolean)
        .join(",") || "profile",
    );
    if (target.id === account.id) return redirect("/crm/team");
    return {
      flash: `${target.name} updated${
        revoked ? " — sessions revoked, next login required" : ""
      }.`,
    };
  }

  return { error: "Unknown action." };
}

const input =
  "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
const btn =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 whitespace-nowrap";

export default function Team() {
  const { account, members, managers, pending } = useLoaderData<typeof loader>();
  const data = useActionData<typeof action>();
  const isSuper = account.role === "SUPER_ADMIN";
  const [inviteRole, setInviteRole] = useState("SALES_MANAGER");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Team</h1>
        <p className="text-sm text-slate-500">
          {account.role === "SUPER_ADMIN"
            ? "Manage every account: profile, password, and validity."
            : "Manage your sales team: profile, password, and validity."}
        </p>
      </div>

      {data && "error" in data ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{data.error}</p>
      ) : null}
      {data && "flash" in data ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{data.flash}</p>
      ) : null}

      <Form method="post" className="grid max-w-3xl items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <input type="hidden" name="intent" value="invite" />
        <label className="text-sm font-medium">
          Name
          <input name="name" required className={input} />
        </label>
        <label className="text-sm font-medium">
          Email
          <input name="email" type="email" required className={input} />
        </label>
        {isSuper ? (
          <label className="text-sm font-medium">
            Role
            <select
              name="role"
              className={input}
              defaultValue="SALES_MANAGER"
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="SALES_MANAGER">Sales Manager</option>
              <option value="SALES">Sales Representative</option>
            </select>
          </label>
        ) : null}
        {isSuper && inviteRole === "SALES" ? (
          <label className="text-sm font-medium">
            Sales Manager
            <select name="managerId" required className={input} defaultValue="">
              <option value="" disabled>
                {managers.length ? "Select manager…" : "No managers yet"}
              </option>
              {managers.map((mgr) => (
                <option key={mgr.id} value={mgr.id}>
                  {mgr.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="submit" className={btn}>
          Send invitation
        </button>
      </Form>

      <div className="space-y-3">
        {members.map((m) => {
          const canPickManager = isSuper && m.role === "SALES";
          return (
          <Form
            key={m.id}
            method="post"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="intent" value="member_update" />
            <input type="hidden" name="id" value={m.id} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">{m.name}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {m.role.replace("SALES_", "").toLowerCase()}
              </span>
              {m.id === account.id ? (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">you</span>
              ) : null}
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                  m.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                }`}
              >
                {m.active ? "valid" : "disabled"}
              </span>
            </div>
            <div className={`mt-3 grid gap-3 ${canPickManager ? "md:grid-cols-6" : "md:grid-cols-5"}`}>
              <input name="name" defaultValue={m.name} className={input} aria-label="Name" />
              <input name="email" type="email" defaultValue={m.email} className={input} aria-label="Email" />
              <input name="phone" defaultValue={m.phone ?? ""} placeholder="WhatsApp" className={input} aria-label="Phone" />
              {canPickManager ? (
                <label className="text-sm font-medium text-slate-500">
                  Manager
                  <select name="managerId" className={input} defaultValue={m.managerId ?? ""}>
                    <option value="">— none —</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <PasswordInput
                name="password"
                placeholder="New password (optional)"
                autoComplete="new-password"
                className={input}
                aria-label="Password"
              />
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={m.active}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  valid
                </label>
                <button type="submit" className={btn}>
                  Save
                </button>
              </div>
            </div>
            {m.createdAt ? (
              <p className="mt-2 text-xs text-slate-400">
                joined {new Date(m.createdAt).toLocaleDateString()} · saving a new
                password or disabling access revokes all active sessions
              </p>
            ) : null}
          </Form>
          );
        })}
      </div>

      {pending.length > 0 ? (
        <div className="text-sm text-slate-500">
          <p className="font-semibold">Pending invitations:</p>
          <ul className="ml-5 list-disc">
            {pending.map((p) => (
              <li key={`${p.email}-${p.role}`}>
                {p.email} ({p.role}) — expires {new Date(p.expiresAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
