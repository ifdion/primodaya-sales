import { z } from "zod";

export function capsFromEnv(env: Env): { sales: number; manager: number } {
  return {
    sales: Number(env.MAX_SALES_DISCOUNT ?? "10"),
    manager: Number(env.MAX_MANAGER_DISCOUNT ?? "25"),
  };
}

export function validateDiscount(
  env: Env,
  lead: { price: number | null; allowManagerDiscount: boolean | null },
  discountPct: number,
): string | null {
  if (!Number.isFinite(discountPct) || discountPct < 0) {
    return "Discount must be a non-negative number.";
  }
  if (!lead.price) return "Price must be assigned before applying a discount.";
  const { sales, manager } = capsFromEnv(env);
  const cap = lead.allowManagerDiscount ? manager : sales;
  if (discountPct > cap) {
    return `Discount ${discountPct}% exceeds the allowed cap of ${cap}%${
      lead.allowManagerDiscount
        ? ""
        : " — ask your Sales Manager to approve a manager discount."
    }`;
  }
  return null;
}

export const leadInputSchema = z.object({
  leadName: z.string().min(2, "Lead name is required"),
  leadEmail: z.string().email("Valid email required"),
  leadPhone: z.string().min(8, "Valid phone required"),
  evBrand: z.string().min(1, "EV brand is required"),
  evModel: z.string().min(1, "EV model is required"),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date required"),
  productTier: z.enum(["COMPACT", "CORE", "ULTRA"]),
});

export const pricingInputSchema = z.object({
  price: z.coerce.number().positive("Price must be positive"),
  validityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Validity date required"),
});

export const discountInputSchema = z.object({
  discount: z.coerce.number().min(0).max(100),
});
