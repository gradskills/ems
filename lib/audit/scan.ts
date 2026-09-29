// ─────────────────────────────────────────────────────────────
// Prospect audit — a real scan of a business's public footprint.
//
//  • Website (fetched live): reachability, load time, HTTPS + certificate,
//    mobile viewport, on-page SEO, analytics/ad pixels, contact & WhatsApp
//    links, linked LinkedIn / Instagram, how dated the site looks.
//  • Google Business Profile + reviews via the Google Places API — only when
//    GOOGLE_PLACES_API_KEY is set. Without it those rows come back "unknown"
//    (never guessed), and the page offers a one-click manual check instead.
//
// Server-only: imported from app/api/prospect-audit.
// ─────────────────────────────────────────────────────────────
import type { ProspectAuditResult, ProspectCheck } from "@/lib/types";
import { safeFetch, readCertificate, BlockedUrlError, type FetchResult, type CertInfo } from "@/lib/audit/safe-fetch";

export interface AuditInput {
  company: string; // name, or a URL typed into the search box
  website?: string;
  city?: string;
  instagram?: string; // handle on file for the lead, if any
}

interface Place {
  name: string;
  address?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  status?: string;
  mapsUrl?: string;
  phone?: string;
}

// ── helpers ──────────────────────────────────────────────────
// a typed domain / URL (incl. IPs and host:port, which the fetch guard then refuses)
const looksLikeUrl = (s: string) => {
  const t = s.trim();
  return /^https?:\/\//i.test(t) || /^[\w.-]+:\d+(\/|$)/.test(t) || /^(\d{1,3}\.){3}\d{1,3}(\/|$)/.test(t) || /^([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(t);
};
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function normaliseUrl(raw: string): string {
  const s = raw.trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function companyFromHost(u: string): string {
  const base = hostOf(u).split(".")[0] ?? u;
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
function metaContent(html: string, key: string): string | undefined {
  const re = /<meta\b[^>]*>/gi;
  for (const m of html.match(re) ?? []) {
    const n = (attr(m, "name") ?? attr(m, "property") ?? "").toLowerCase();
    if (n === key) return attr(m, "content")?.trim();
  }
  return undefined;
}
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

// ── Google Places (optional) ─────────────────────────────────
async function findPlace(company: string, city?: string): Promise<Place | null | undefined> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return undefined; // not configured
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri,places.nationalPhoneNumber",
      },
      body: JSON.stringify({ textQuery: [company, city].filter(Boolean).join(", "), regionCode: "IN", pageSize: 1 }),
    });
    if (!res.ok) { console.warn("[audit] places:", res.status, await res.text().catch(() => "")); return undefined; }
    const json = (await res.json()) as { places?: Record<string, unknown>[] };
    const p = json.places?.[0];
    if (!p) return null;
    return {
      name: (p.displayName as { text?: string } | undefined)?.text ?? company,
      address: p.formattedAddress as string | undefined,
      website: p.websiteUri as string | undefined,
      rating: p.rating as number | undefined,
      reviews: p.userRatingCount as number | undefined,
      status: p.businessStatus as string | undefined,
      mapsUrl: p.googleMapsUri as string | undefined,
      phone: p.nationalPhoneNumber as string | undefined,
    };
  } catch (e) {
    console.warn("[audit] places failed:", (e as Error).message);
    return undefined;
  }
}

// ── website scan ─────────────────────────────────────────────
interface SiteScan {
  requested: string;
  page?: FetchResult;
  error?: string;
  httpsOk: boolean;
  httpRedirectsToHttps?: boolean;
  cert?: CertInfo;
  hasSitemap?: boolean;
}

// Node's fetch reports "fetch failed" and hides the real reason in `cause`
function describeFetchError(e: unknown): string {
  const err = e as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (err?.name === "TimeoutError" || err?.name === "AbortError") return "Timed out after 10s";
  const code = err?.cause?.code ?? "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Domain doesn't resolve";
  if (code === "ECONNREFUSED") return "Server refused the connection";
  if (/CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code)) return `Certificate problem: ${err.cause?.message ?? code}`;
  return err?.cause?.message ?? err?.message ?? "No response";
}

async function scanSite(url: string): Promise<SiteScan> {
  const u = new URL(url);
  const httpsUrl = `https://${u.host}${u.pathname}${u.search}`;
  const httpUrl = `http://${u.host}${u.pathname}${u.search}`;

  // try HTTPS first; fall back to plain HTTP
  let page: FetchResult | undefined;
  let error: string | undefined;
  let httpsOk = false;
  try {
    page = await safeFetch(httpsUrl);
    httpsOk = page.url.startsWith("https://");
  } catch (e) {
    if (e instanceof BlockedUrlError) throw e;
    error = describeFetchError(e);
    try {
      page = await safeFetch(httpUrl);
      httpsOk = page.url.startsWith("https://");
      error = undefined;
    } catch (e2) {
      if (e2 instanceof BlockedUrlError) throw e2;
      // keep the HTTPS reason when plain HTTP just bounces back to the broken HTTPS
      if (!error) error = describeFetchError(e2);
    }
  }
  if (!page) {
    // A server that answers on :443 with a bad certificate is "up but blocked by
    // the browser" — report it as the certificate problem it is.
    const cert = await readCertificate(u.hostname).catch(() => undefined);
    return { requested: url, error, httpsOk: false, cert: cert && !cert.valid && cert.daysLeft != null ? cert : undefined };
  }

  const finalHost = new URL(page.url).hostname;
  const origin = new URL(page.url).origin;
  const [httpProbe, cert, sitemap] = await Promise.all([
    safeFetch(`http://${finalHost}/`, { timeoutMs: 6000, maxBytes: 2048 }).catch(() => undefined),
    readCertificate(finalHost).catch((e) => ({ valid: false, error: (e as Error).message }) as CertInfo),
    safeFetch(`${origin}/sitemap.xml`, { timeoutMs: 6000, maxBytes: 4096 }).catch(() => undefined),
  ]);
  return {
    requested: url,
    page,
    httpsOk,
    httpRedirectsToHttps: httpProbe ? httpProbe.url.startsWith("https://") : undefined,
    cert,
    hasSitemap: !!sitemap && sitemap.status < 400 && /<(urlset|sitemapindex)/i.test(sitemap.body),
  };
}

interface Parsed {
  jsRendered: boolean; // page content is built by JavaScript — links may be missing from the HTML
  title?: string;
  description?: string;
  viewport?: string;
  h1: number;
  canonical: boolean;
  ogImage: boolean;
  noindex: boolean;
  imgs: number;
  imgsNoAlt: number;
  analytics: string[];
  cms?: string;
  copyrightYear?: number;
  phone: boolean;
  email: boolean;
  whatsapp: boolean;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
}

function parse(html: string): Parsed {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const find = (re: RegExp) => hrefs.find((h) => re.test(h));
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const analytics: string[] = [];
  if (/googletagmanager\.com\/gtm|GTM-[A-Z0-9]+/i.test(html)) analytics.push("Google Tag Manager");
  if (/gtag\(|google-analytics\.com|googletagmanager\.com\/gtag|G-[A-Z0-9]{6,}/.test(html)) analytics.push("Google Analytics");
  if (/connect\.facebook\.net|fbq\(/.test(html)) analytics.push("Meta Pixel");
  if (/clarity\.ms/.test(html)) analytics.push("Microsoft Clarity");
  if (/static\.hotjar\.com/.test(html)) analytics.push("Hotjar");
  const cms =
    /wp-content|wp-includes/i.test(html) ? "WordPress" :
    /static\.wixstatic\.com|wix\.com/i.test(html) ? "Wix" :
    /cdn\.shopify\.com/i.test(html) ? "Shopify" :
    /squarespace\.com/i.test(html) ? "Squarespace" :
    /webflow\.(com|io)/i.test(html) ? "Webflow" :
    /__NEXT_DATA__|\/_next\//.test(html) ? "Next.js" :
    metaContent(html, "generator");
  const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1])).filter((y) => y > 1995 && y < 2100);
  const ig = find(/instagram\.com\/(?!p\/|reel\/|explore\/|accounts\/)[A-Za-z0-9_.]+/i);
  const visibleText = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, " ").replace(/\s+/g, " ").trim();
  return {
    jsRendered: visibleText.length < 250 && /<script\b[^>]*\bsrc=/i.test(html),
    title: title ? decode(title) : undefined,
    description: metaContent(html, "description"),
    viewport: metaContent(html, "viewport"),
    h1: (html.match(/<h1\b/gi) ?? []).length,
    canonical: /<link[^>]+rel\s*=\s*["']canonical["']/i.test(html),
    ogImage: !!metaContent(html, "og:image"),
    noindex: /noindex/i.test(metaContent(html, "robots") ?? ""),
    imgs: imgs.length,
    imgsNoAlt: imgs.filter((t) => !/\balt\s*=\s*["'][^"']+["']/i.test(t)).length,
    analytics,
    cms,
    copyrightYear: years.length ? Math.max(...years) : undefined,
    phone: hrefs.some((h) => /^tel:/i.test(h)),
    email: hrefs.some((h) => /^mailto:/i.test(h)),
    whatsapp: hrefs.some((h) => /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(h)),
    linkedin: find(/linkedin\.com\/(company|in|school)\//i),
    instagram: ig,
    facebook: find(/facebook\.com\/(?!sharer|dialog|plugins|tr\b)[A-Za-z0-9.]+/i),
    youtube: find(/youtube\.com\/(@|c\/|channel\/|user\/)/i),
  };
}

const igHandle = (u?: string) => u?.match(/instagram\.com\/([A-Za-z0-9_.]+)/i)?.[1];

const JS_NOTE = "Site is built with JavaScript, so its links couldn't be read — verify manually";

// ── the audit ────────────────────────────────────────────────
export async function runProspectAudit(input: AuditInput): Promise<ProspectAuditResult> {
  const raw = input.company.trim();
  const typedUrl = looksLikeUrl(raw) ? raw : undefined;
  const company = typedUrl ? companyFromHost(normaliseUrl(typedUrl)) : raw;
  const notes: string[] = [];

  const place = await findPlace(company, input.city);
  if (place === undefined) notes.push("Google Business & reviews weren't checked automatically — add a GOOGLE_PLACES_API_KEY to enable them. Use Verify ↗ to check by hand.");

  const website = input.website?.trim() || typedUrl || place?.website;
  const scan = website ? await scanSite(normaliseUrl(website)) : undefined;
  const page = scan?.page;
  const html = page && page.status < 400 ? page.body : "";
  const p = html ? parse(html) : undefined;
  const year = new Date().getFullYear();
  const checks: ProspectCheck[] = [];
  const needsSite = (key: string, label: string) =>
    checks.push({ key, label, status: "unknown", detail: website ? "Couldn't load the website to check this." : "Needs the website — add its URL to check." });

  // 1) Website
  if (!website) {
    if (place) checks.push({ key: "website", label: "Website", status: "fail", detail: "No website on their Google Business listing", evidence: [place.name] });
    else checks.push({ key: "website", label: "Website", status: "unknown", detail: "No website found — enter the URL if they have one." });
  } else if (!page) {
    const certBroken = !!scan?.cert;
    checks.push({
      key: "website", label: "Website", status: "fail",
      detail: certBroken ? `Browsers block ${hostOf(normaliseUrl(website))} with a security warning` : `${hostOf(normaliseUrl(website))} isn't loading`,
      evidence: [scan?.error ?? "No response"],
    });
  } else if (page.status >= 400) {
    checks.push({ key: "website", label: "Website", status: "fail", detail: `${hostOf(page.url)} returns an error (HTTP ${page.status})` });
  } else {
    const ev = [`Loaded ${hostOf(page.url)} in ${secs(page.ms)}`, `${Math.round(html.length / 1024)} KB of HTML`];
    if (p?.cms) ev.push(`Built with ${p.cms}`);
    if (p?.copyrightYear) ev.push(`Footer © ${p.copyrightYear}`);
    const dated = p?.copyrightYear && p.copyrightYear <= year - 3;
    const slow = page.ms > 3500;
    checks.push({
      key: "website", label: "Website",
      status: slow || dated ? "warn" : "pass",
      detail: slow ? `Live but slow — took ${secs(page.ms)} to load` : dated ? `Live, but looks dated (footer says © ${p!.copyrightYear})` : `Live — loaded in ${secs(page.ms)}`,
      evidence: ev,
    });
  }

  // 2) SSL / HTTPS
  if (!page && scan?.cert) {
    const c = scan.cert;
    checks.push({
      key: "ssl", label: "SSL / HTTPS", status: "fail",
      detail: c.daysLeft != null && c.daysLeft < 0 ? `Certificate expired ${-c.daysLeft} day${c.daysLeft === -1 ? "" : "s"} ago` : `Certificate problem: ${c.error}`,
      evidence: [c.issuer ? `Issued by ${c.issuer}` : "", c.error ?? ""].filter(Boolean),
    });
  } else if (!page || page.status >= 400) needsSite("ssl", "SSL / HTTPS");
  else if (!scan!.httpsOk) checks.push({ key: "ssl", label: "SSL / HTTPS", status: "fail", detail: "Site isn't served over HTTPS — browsers show “Not secure”", evidence: [scan!.cert?.error ?? "No working HTTPS"] });
  else {
    const c = scan!.cert;
    const ev = [c?.issuer ? `Certificate by ${c.issuer}` : "Certificate found", c?.daysLeft != null ? `Expires in ${c.daysLeft} days` : ""].filter(Boolean);
    if (scan!.httpRedirectsToHttps === false) ev.push("http:// version does NOT redirect to https://");
    const expiring = c?.daysLeft != null && c.daysLeft < 21;
    const status = c && !c.valid ? "fail" : expiring || scan!.httpRedirectsToHttps === false ? "warn" : "pass";
    checks.push({
      key: "ssl", label: "SSL / HTTPS", status,
      detail: status === "fail" ? `Certificate problem: ${c?.error}` : expiring ? `Certificate expires in ${c!.daysLeft} days` : scan!.httpRedirectsToHttps === false ? "HTTPS works, but http:// isn't redirected to it" : "Secure — valid HTTPS certificate",
      evidence: ev,
    });
  }

  // 3) Mobile
  if (!p) needsSite("mobile", "Mobile experience");
  else if (p.viewport && /width\s*=\s*device-width/i.test(p.viewport)) checks.push({ key: "mobile", label: "Mobile experience", status: "pass", detail: "Has a mobile (responsive) viewport", evidence: [`viewport: ${p.viewport}`] });
  else checks.push({ key: "mobile", label: "Mobile experience", status: "fail", detail: "No mobile viewport — the site renders as a shrunken desktop page on phones" });

  // 4) SEO basics
  if (!p) needsSite("seo", "On-page SEO");
  else {
    const issues: string[] = [];
    if (!p.title) issues.push("No page title");
    else if (p.title.length < 10 || p.title.length > 70) issues.push(`Title is ${p.title.length} characters (aim for 10–70)`);
    if (!p.description) issues.push("No meta description (Google shows random page text)");
    if (p.h1 === 0) issues.push("No H1 heading");
    if (!p.canonical) issues.push("No canonical tag");
    if (!scan!.hasSitemap) issues.push("No sitemap.xml");
    if (!p.ogImage) issues.push("No social share image (og:image)");
    if (p.imgs && p.imgsNoAlt / p.imgs > 0.5) issues.push(`${p.imgsNoAlt} of ${p.imgs} images have no alt text`);
    if (p.noindex) issues.unshift("Page is set to NOINDEX — hidden from Google");
    const status = p.noindex || issues.length >= 4 ? "fail" : issues.length ? "warn" : "pass";
    checks.push({
      key: "seo", label: "On-page SEO", status,
      detail: status === "pass" ? "Title, description, headings & sitemap in place" : `${issues.length} SEO issue${issues.length === 1 ? "" : "s"} on the homepage`,
      evidence: issues.length ? issues : [p.title ? `Title: “${p.title}”` : ""].filter(Boolean),
    });
  }

  // 5) Analytics & ad tracking
  if (!p) needsSite("tracking", "Analytics & ad tracking");
  else if (!p.analytics.length && p.jsRendered) checks.push({ key: "tracking", label: "Analytics & ad tracking", status: "unknown", detail: "Site is built with JavaScript — tracking may load later; verify with Tag Assistant" });
  else checks.push({
    key: "tracking", label: "Analytics & ad tracking",
    status: p.analytics.length >= 2 ? "pass" : p.analytics.length === 1 ? "warn" : "fail",
    detail: p.analytics.length ? `Found ${p.analytics.join(", ")}` : "No analytics or ad pixel — visits and ad results aren't measured",
    evidence: p.analytics,
  });

  // 6) Contact & WhatsApp
  if (!p) needsSite("contact", "Contact & WhatsApp");
  else {
    const have = [p.phone && "click-to-call", p.whatsapp && "WhatsApp", p.email && "email"].filter(Boolean) as string[];
    if (!have.length && p.jsRendered) checks.push({ key: "contact", label: "Contact & WhatsApp", status: "unknown", detail: JS_NOTE });
    else checks.push({
      key: "contact", label: "Contact & WhatsApp",
      status: p.phone && p.whatsapp ? "pass" : have.length ? "warn" : "fail",
      detail: have.length ? `Has ${have.join(", ")}${p.whatsapp ? "" : " — no WhatsApp button"}` : "No click-to-call, WhatsApp or email link on the homepage",
      evidence: have,
    });
  }

  // 7) LinkedIn (can't be scraped — only what the site links to)
  if (!p) needsSite("linkedin", "LinkedIn presence");
  else if (!p.linkedin && p.jsRendered) checks.push({ key: "linkedin", label: "LinkedIn presence", status: "unknown", detail: JS_NOTE });
  else checks.push({
    key: "linkedin", label: "LinkedIn presence",
    status: p.linkedin ? "pass" : "warn",
    detail: p.linkedin ? "LinkedIn page linked from the website" : "No LinkedIn page linked from the website — verify manually",
    evidence: p.linkedin ? [p.linkedin] : [],
  });

  // 8) Instagram (profile activity isn't publicly readable; presence only)
  const igOnFile = input.instagram?.replace(/^@/, "").trim();
  const igFound = igHandle(p?.instagram);
  if (igOnFile || igFound) checks.push({
    key: "instagram", label: "Instagram",
    status: "pass",
    detail: `Instagram @${igFound ?? igOnFile}${igFound ? " linked from the website" : " on file"}`,
    evidence: [p?.instagram ?? `https://instagram.com/${igOnFile}`, p?.facebook ? `Facebook: ${p.facebook}` : "", p?.youtube ? `YouTube: ${p.youtube}` : ""].filter(Boolean),
  });
  else if (!p) needsSite("instagram", "Instagram");
  else if (p.jsRendered) checks.push({ key: "instagram", label: "Instagram", status: "unknown", detail: JS_NOTE });
  else checks.push({
    key: "instagram", label: "Instagram",
    status: "warn",
    detail: "No Instagram linked from the website — verify manually",
    evidence: [p.facebook ? `Facebook: ${p.facebook}` : "", p.youtube ? `YouTube: ${p.youtube}` : ""].filter(Boolean),
  });

  // 9) Google Business + 10) reviews
  if (place === undefined) {
    checks.push({ key: "gmb", label: "Google Business listing", status: "unknown", detail: "Not checked automatically — use Verify ↗" });
    checks.push({ key: "reviews", label: "Google reviews", status: "unknown", detail: "Not checked automatically — use Verify ↗" });
  } else if (place === null) {
    checks.push({ key: "gmb", label: "Google Business listing", status: "fail", detail: `No Google Business listing found for “${company}”${input.city ? ` in ${input.city}` : ""}` });
    checks.push({ key: "reviews", label: "Google reviews", status: "fail", detail: "No Google reviews (no listing found)" });
  } else {
    const gaps = [!place.website && "no website", !place.phone && "no phone"].filter(Boolean) as string[];
    const closed = place.status && place.status !== "OPERATIONAL";
    checks.push({
      key: "gmb", label: "Google Business listing",
      status: closed ? "fail" : gaps.length ? "warn" : "pass",
      detail: closed ? `Listing marked ${place.status?.toLowerCase().replace(/_/g, " ")}` : gaps.length ? `Listing found, but ${gaps.join(" & ")}` : "Listing found with website & phone",
      evidence: [place.name, place.address ?? ""].filter(Boolean),
    });
    const n = place.reviews ?? 0;
    const r = place.rating;
    checks.push({
      key: "reviews", label: "Google reviews",
      status: !n ? "fail" : n < 25 || (r ?? 0) < 4 ? "warn" : "pass",
      detail: n ? `${r?.toFixed(1)}★ from ${n} review${n === 1 ? "" : "s"}` : "No Google reviews yet",
    });
  }

  // ── opportunity score: only what was actually checked ──
  const weight = (c: ProspectCheck) =>
    c.status === "fail" ? (c.key === "website" ? 35 : 10) : c.status === "warn" ? 5 : 0;
  const checked = checks.filter((c) => c.status !== "unknown");
  if (p?.jsRendered) notes.push("This site builds its page with JavaScript, so contact and social links added after load aren't visible to the scan — those rows are marked unknown.");
  const score = checked.length ? Math.max(15, Math.min(97, 20 + checked.reduce((s, c) => s + weight(c), 0))) : 0;

  return {
    id: `audit-${Date.now()}`,
    company: place?.name && !typedUrl ? place.name : company,
    url: page?.url,
    checks,
    score,
    opener: opener(company, checks, page, p, place ?? undefined),
    createdAt: new Date().toISOString(),
    notes: notes.length ? notes : undefined,
    place: place ? { name: place.name, address: place.address, mapsUrl: place.mapsUrl, phone: place.phone } : undefined,
  };
}

// A specific, factual first line built from the strongest real finding.
function opener(company: string, checks: ProspectCheck[], page?: FetchResult, p?: Parsed, place?: Place): string {
  const by = (k: string) => checks.find((c) => c.key === k);
  const host = page ? hostOf(page.url) : "";
  const say = (s: string) => `"I had a quick look at ${company} online and ${s} — happy to show you what I found."`;
  if (!checks.some((c) => c.status !== "unknown")) {
    return `"I was looking into ${company} online — how are most of your customers finding you today? I help local businesses get found and turn that into more enquiries."`;
  }
  if (!page && by("ssl")?.status === "fail") return say(`noticed your website opens with a browser security warning (${by("ssl")!.detail.toLowerCase()}) — most visitors turn back at that screen`);
  if (by("website")?.status === "fail") return say(place ? "noticed your Google listing doesn't have a website — most customers check one before they call, so those enquiries are going to competitors" : "couldn't get your website to load — anyone searching for you right now hits a dead end");
  if (by("ssl")?.status === "fail") return say(`noticed ${host} isn't on HTTPS, so Chrome shows visitors a “Not secure” warning — that quietly costs trust and Google ranking`);
  if (by("mobile")?.status === "fail") return say(`noticed ${host} has no mobile layout — most local searches happen on phones, so it's hard to use for most of your visitors`);
  if (by("reviews")?.status === "fail") return say("saw there are no Google reviews yet — a handful of recent ones makes a big difference to whether new customers pick you");
  if (page && page.ms > 3500) return say(`your homepage took ${secs(page.ms)} to load for me — people usually give up after about 3 seconds`);
  if (p?.copyrightYear && p.copyrightYear <= new Date().getFullYear() - 3) return say(`your website footer still says © ${p.copyrightYear}, which makes the business look less active than it is`);
  if (by("tracking")?.status === "fail") return say("noticed there's no analytics or ad pixel on your site, so there's no way to tell which marketing is actually bringing customers in");
  if (by("seo")?.status === "fail") return say(`found ${by("seo")!.evidence?.length ?? "several"} basic SEO gaps on ${host} (like ${by("seo")!.evidence?.[0]?.toLowerCase()}) that keep you lower on Google`);
  if (by("contact")?.status !== "pass" && p) return say("noticed there's no WhatsApp button on your site — for most of our clients that's where the majority of enquiries now come from");
  if (by("reviews")?.status === "warn") return say(`saw you have ${by("reviews")!.detail} on Google — growing that is one of the quickest wins for local enquiries`);
  return `"I had a look at ${company} online — your digital footprint is solid. I work with businesses like yours to turn that into more enquiries; worth a quick chat?"`;
}
