interface Env extends CloudflareEnv {}

interface CloudflareEnv {
  DB: D1Database;
  BREVO_API_KEY: string;
  APP_URL: string;
  MAX_SALES_DISCOUNT: string;
  MAX_MANAGER_DISCOUNT: string;
  DB_ADMIN_ENABLED: string;
  EMAIL_FROM: string;
  SUPER_ADMIN_WHATSAPP: string;
}
