export function buildSessionCookieString(
  name: string,
  value: string,
  req: Request,
  maxAgeSeconds: number
): string {
  const url = new URL(req.url);
  const isSecure =
    url.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=None${isSecure ? "; Secure" : ""}; Max-Age=${maxAgeSeconds}`;
}

export function buildClearCookieString(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`;
}
