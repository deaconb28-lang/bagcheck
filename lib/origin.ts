/**
 * The origin this deployment is actually reachable at.
 *
 * **`req.url` is not it.** Behind a proxy — which is every real deployment —
 * a route handler sees the address the container is listening on, so
 * `new URL("/x", req.url)` resolves to something like
 * `https://localhost:8080/x`. That is invisible on a relative redirect and
 * catastrophic on an absolute one: the SnapTrade portal was being handed
 * `https://localhost:8080/api/snaptrade/callback` as the URL to send people
 * back to, and the callback was redirecting browsers to a localhost they
 * could never reach. From the outside that is a connect button that does
 * nothing.
 *
 * Three sources, most trustworthy first. `APP_URL` is the deployment stating
 * its own address and always wins. Otherwise the proxy's forwarding headers,
 * which Railway and every other host in front of Node set. Only then the
 * request, which is right in development and wrong everywhere else.
 */
export function originOf(req: Request): string {
  const declared = process.env.APP_URL?.trim();
  if (declared) return declared.replace(/\/+$/, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return new URL(req.url).origin;
}

/** An absolute URL on this deployment's real origin. */
export function absoluteUrl(req: Request, path: string): string {
  return new URL(path, `${originOf(req)}/`).toString();
}
