let _workerEnv: Record<string, string> = {};

export function initEnv(env: Record<string, string>): void {
  _workerEnv = env;
}

function get(key: string): string {
  return _workerEnv[key] ?? process.env[key] ?? "";
}

export const ENV = {
  get appId() { return get("VITE_APP_ID"); },
  get cookieSecret() { return get("JWT_SECRET"); },
  get databaseUrl() { return get("DATABASE_URL"); },
  get oAuthServerUrl() { return get("OAUTH_SERVER_URL"); },
  get ownerOpenId() { return get("OWNER_OPEN_ID"); },
  get isProduction() { return get("NODE_ENV") === "production"; },
  get forgeApiUrl() { return get("BUILT_IN_FORGE_API_URL"); },
  get forgeApiKey() { return get("BUILT_IN_FORGE_API_KEY"); },
  get stripeSecretKey() { return get("STRIPE_SECRET_KEY"); },
  get stripeWebhookSecret() { return get("STRIPE_WEBHOOK_SECRET"); },
};
