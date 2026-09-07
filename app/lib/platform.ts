import type { AppLoadContext } from "react-router";

export function getEnv(context: AppLoadContext): Env {
  return context.cloudflare.env;
}
