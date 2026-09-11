import { createCookie, redirect, type AppLoadContext } from "react-router";
import { eq } from "drizzle-orm";
import { accounts, sessions } from "../../db/schema";
import { getDb } from "./db";
import { getEnv } from "./platform";
import { randomToken } from "./password";

const SESSION_DAYS = 7;

const sessionCookie = createCookie("primodaya_session", {
  maxAge: SESSION_DAYS * 24 * 60 * 60,
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: false,
});

export type AccountRow = typeof accounts.$inferSelect;

export async function loginAccount(
  id: string,
  context: AppLoadContext,
): Promise<string> {
  const env = getEnv(context);
  const db = getDb(env);
  const token = randomToken(32);
  await db.insert(sessions).values({
    token,
    accountId: id,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
  });
  return sessionCookie.serialize(token, {
    secure: env.APP_URL?.startsWith("https") ?? false,
  });
}

export async function logout(request: Request, context: AppLoadContext) {
  const env = getEnv(context);
  const db = getDb(env);
  const token = await sessionCookie.parse(request.headers.get("Cookie"));
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  return sessionCookie.serialize(null);
}

export async function getAccountForRequest(
  request: Request,
  context: AppLoadContext,
): Promise<AccountRow | null> {
  const env = getEnv(context);
  const db = getDb(env);
  const token = await sessionCookie.parse(request.headers.get("Cookie"));
  if (!token) return null;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
  });
  if (!session || new Date(session.expiresAt) < new Date()) return null;

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, session.accountId),
  });
  return account && account.active ? account : null;
}

export function requireAccount(account: AccountRow | null): AccountRow {
  if (!account) throw redirect("/crm/login");
  return account;
}

export function requireRole(
  account: AccountRow | null,
  roles: AccountRow["role"][],
): AccountRow {
  const acc = requireAccount(account);
  if (!roles.includes(acc.role)) throw new Response("Forbidden", { status: 403 });
  return acc;
}
