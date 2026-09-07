import { auditLogs } from "../../db/schema";
import type { Db } from "./db";

export async function logAudit(
  db: Db,
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  detail?: string | null,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorId: actorId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      detail: detail ?? null,
    });
  } catch {
    // never block a business flow on audit logging
  }
}
