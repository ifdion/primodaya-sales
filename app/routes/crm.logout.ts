import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getAccountForRequest, logout } from "../lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  if (!(await getAccountForRequest(request, context))) {
    return redirect("/crm/login");
  }
  const header = await logout(request, context);
  return redirect("/crm/login", { headers: { "Set-Cookie": header } });
}

export function loader({ request, context }: LoaderFunctionArgs) {
  return action({ request, context } as ActionFunctionArgs);
}
