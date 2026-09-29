// ─────────────────────────────────────────────────────────────
// Server-side fetching of arbitrary prospect websites.
//
// The URL comes from whoever uses the audit, so every hop is checked to point
// at the public internet: no localhost, private ranges, link-local/cloud
// metadata addresses or odd ports. Redirects are followed by hand (so each one
// is re-checked), and the body is capped in both time and size.
// ─────────────────────────────────────────────────────────────
import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 GradskillsAudit/1.0";

export class BlockedUrlError extends Error {}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast / reserved
    );
  }
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

/** Throws BlockedUrlError unless `url` is http(s) on a default port and resolves only to public IPs. */
export async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedUrlError("Only http(s) websites can be audited.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new BlockedUrlError("Only standard web ports can be audited.");
  if (url.username || url.password) throw new BlockedUrlError("URLs with credentials aren't allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host.includes(".") || /(^|\.)(localhost|local|internal|intranet|lan|home)$/i.test(host)) {
    throw new BlockedUrlError("That address isn't a public website.");
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new BlockedUrlError("That address isn't a public website.");
    return;
  }
  const addrs = await dns.lookup(host, { all: true }).catch(() => []);
  // not a safety problem — the audit reports it as a dead / lapsed domain
  if (!addrs.length) throw new Error("Domain doesn't resolve — the site is down or the domain has lapsed");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new BlockedUrlError("That address isn't a public website.");
}

export interface FetchResult {
  url: string; // final URL after redirects
  status: number;
  headers: Headers;
  body: string; // possibly truncated to maxBytes
  ms: number; // total time including redirects
  redirects: string[];
}

export async function safeFetch(
  input: string,
  { timeoutMs = 10_000, maxBytes = 1_500_000, maxRedirects = 5 }: { timeoutMs?: number; maxBytes?: number; maxRedirects?: number } = {}
): Promise<FetchResult> {
  const started = Date.now();
  const deadline = AbortSignal.timeout(timeoutMs);
  let current = new URL(input);
  const redirects: string[] = [];

  for (let hop = 0; ; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, {
      redirect: "manual",
      signal: deadline,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-IN,en;q=0.9" },
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      if (hop >= maxRedirects) throw new Error("Too many redirects.");
      void res.body?.cancel();
      current = new URL(loc, current);
      redirects.push(current.toString());
      continue;
    }
    const body = await readCapped(res, maxBytes);
    return { url: current.toString(), status: res.status, headers: res.headers, body, ms: Date.now() - started, redirects };
  }
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  void reader.cancel().catch(() => {});
  const buf = new Uint8Array(Math.min(size, maxBytes));
  let off = 0;
  for (const c of chunks) {
    const take = Math.min(c.byteLength, buf.byteLength - off);
    buf.set(c.subarray(0, take), off);
    off += take;
    if (off >= buf.byteLength) break;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

export interface CertInfo {
  valid: boolean;
  error?: string;
  daysLeft?: number;
  issuer?: string;
}

/** Reads the TLS certificate a host presents on :443. */
export async function readCertificate(host: string, timeoutMs = 7000): Promise<CertInfo> {
  await assertPublicUrl(new URL(`https://${host}`));
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: net.isIP(host) ? undefined : host, rejectUnauthorized: false });
    const done = (r: CertInfo) => { socket.destroy(); resolve(r); };
    socket.setTimeout(timeoutMs, () => done({ valid: false, error: "Timed out connecting over HTTPS" }));
    socket.once("error", (e) => done({ valid: false, error: e.message }));
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      const daysLeft = cert?.valid_to ? Math.floor((Date.parse(cert.valid_to) - Date.now()) / 86_400_000) : undefined;
      const issuer = typeof cert?.issuer?.O === "string" ? cert.issuer.O : undefined;
      done({
        valid: socket.authorized,
        error: socket.authorized ? undefined : String(socket.authorizationError ?? "Untrusted certificate"),
        daysLeft,
        issuer,
      });
    });
  });
}
