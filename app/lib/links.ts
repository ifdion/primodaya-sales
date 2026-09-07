import { randomToken } from "./password";

export function newOfferId(): string {
  return `PM-${randomToken(6).toUpperCase()}`;
}

export function base(env: Env): string {
  return (env.APP_URL ?? "http://localhost:5173").replace(/\/$/, "");
}

export function offeringUrl(env: Env, offerId: string): string {
  return `${base(env)}/offering/${offerId}`;
}

export function verifyUrl(env: Env, offerId: string): string {
  return `${base(env)}/verify/${offerId}`;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function offerReadyMsg(leadName: string, env: Env, offerId: string): string {
  return `Offering for ${leadName} is ready. Download a PDF here ${offeringUrl(env, offerId)}`;
}

export function discountUpdatedMsg(
  leadName: string,
  discountLabel: string,
  env: Env,
  offerId: string,
): string {
  return `Offering for ${leadName} is updated with the discount ${discountLabel}. Download a PDF here ${offeringUrl(env, offerId)}`;
}

export function managerApprovedMsg(
  leadName: string,
  env: Env,
  offerId: string,
): string {
  return `The offering for ${leadName} has been approved for manager discount. You can now update the proposal here ${offeringUrl(env, offerId)}`;
}

export function acceptanceMsg(leadName: string, env: Env, offerId: string): string {
  return `I ${leadName}, accept the offer to purchase product as mentioned in the proposal linked here ${offeringUrl(env, offerId)}`;
}

export function interestMsg(tierLabel: string): string {
  return `I am interested in the ${tierLabel} package.`;
}
