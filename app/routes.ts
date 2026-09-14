import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("crm/login", "routes/crm.login.tsx"),
  route("crm/forgot-password", "routes/crm.forgot-password.tsx"),
  route("crm/reset-password/:token", "routes/crm.reset-password.$token.tsx"),
  route("crm/setup", "routes/crm.setup.tsx"),
  route("crm/invite/:token", "routes/crm.invite.$token.tsx"),
  route("crm/logout", "routes/crm.logout.ts"),
  route("crm", "routes/crm.tsx", [
    index("routes/crm.index.tsx"),
    route("dashboard", "routes/crm.dashboard.tsx"),
    route("leads/new", "routes/crm.leads.new.tsx"),
    route("leads/:id", "routes/crm.leads.$id.tsx"),
    route("team", "routes/crm.team.tsx"),
  ]),
  route("landing-page-1", "routes/landing-page-1.tsx"),
  route("offering/:id", "routes/offering.$id.tsx"),
  route("verify/:id", "routes/verify.$id.tsx"),
  route("api/pdf/:offerId", "routes/api.pdf.$offerId.ts"),
  route("db", "routes/db.tsx"),
  route("favicon.ico", "routes/favicon.ico.ts"),
  route("robots.txt", "routes/robots.txt.ts"),
] satisfies RouteConfig;
