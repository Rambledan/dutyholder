import "server-only";
import { headers } from "next/headers";

// The site's own address, for links in emails. APP_URL wins when set
// (e.g. https://dutyholder.vercel.app); otherwise use the current request.
export async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
