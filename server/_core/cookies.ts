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
  const domainAttr = url.hostname.endsWith("trfarias.com.br") ? "; Domain=.trfarias.com.br" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=None${isSecure ? "; Secure" : ""}${domainAttr}; Max-Age=${maxAgeSeconds}`;
}

export function buildClearCookieString(name: string, req?: Request): string {
  const domainAttr = req && new URL(req.url).hostname.endsWith("trfarias.com.br") ? "; Domain=.trfarias.com.br" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=None; Secure${domainAttr}; Max-Age=0`;
}
