import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  role: text("role", {
    enum: ["SUPER_ADMIN", "SALES_MANAGER", "SALES"],
  }).notNull(),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  offerId: text("offer_id").notNull().unique(),
  leadName: text("lead_name").notNull(),
  leadEmail: text("lead_email").notNull(),
  leadPhone: text("lead_phone").notNull(),
  evBrand: text("ev_brand").notNull(),
  evModel: text("ev_model").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  productTier: text("product_tier", {
    enum: ["COMPACT", "CORE", "ULTRA"],
  }).notNull(),

  salesRepId: text("sales_rep_id")
    .notNull()
    .references(() => accounts.id),
  salesManagerId: text("sales_manager_id")
    .notNull()
    .references(() => accounts.id),

  price: real("price"),
  discount: real("discount").default(0),
  allowManagerDiscount: integer("allow_manager_discount", {
    mode: "boolean",
  }).default(false),

  validityDate: text("validity_date"),
  viewedAt: integer("viewed_at", { mode: "timestamp" }),

  status: text("status", {
    enum: [
      "PENDING_PRICING",
      "OFFER_GENERATED",
      "PRE_ACCEPTED",
      "ACCEPTED",
      "EXPIRED",
    ],
  })
    .default("PENDING_PRICING")
    .notNull(),

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const invites = sqliteTable("invites", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["SALES_MANAGER", "SALES"] }).notNull(),
  createdById: text("created_by_id")
    .notNull()
    .references(() => accounts.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  detail: text("detail"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});
