/**
 * Online-class links (Google Meet by default; Zoom and Teams links are accepted too).
 */

const MEET_CODE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

export type MeetingLink = { url: string; provider: "Google Meet" | "Zoom" | "Microsoft Teams" | "Online class" };

/**
 * Accepts "https://meet.google.com/abc-defg-hij", "meet.google.com/abc-defg-hij" or just "abc-defg-hij".
 * Returns null if it isn't a usable https link.
 */
export function parseMeetingLink(raw: string): MeetingLink | null {
  const v = raw.trim().replace(/\s+/g, "");
  if (!v) return null;
  if (MEET_CODE.test(v.toLowerCase())) return { url: `https://meet.google.com/${v.toLowerCase()}`, provider: "Google Meet" };

  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  u.protocol = "https:";
  const host = u.hostname.toLowerCase();

  if (host === "meet.google.com") {
    const code = u.pathname.replace(/^\//, "").split("/")[0].toLowerCase();
    if (!MEET_CODE.test(code)) return null;
    return { url: `https://meet.google.com/${code}`, provider: "Google Meet" };
  }
  if (host.endsWith("zoom.us")) return { url: u.toString(), provider: "Zoom" };
  if (host.endsWith("teams.microsoft.com") || host.endsWith("teams.live.com")) return { url: u.toString(), provider: "Microsoft Teams" };
  return null;
}

/** The link a session should open: a per-session override (location) or the enrollment's standing link. */
export function sessionLink(s: { location: string | null; enrollment: { meetingUrl: string | null } }) {
  const override = s.location && /^https:\/\//.test(s.location) ? s.location : null;
  return override ?? s.enrollment.meetingUrl ?? null;
}

export const providerOf = (url: string | null) => (url ? parseMeetingLink(url)?.provider ?? "Online class" : null);
