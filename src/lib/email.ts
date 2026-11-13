import "server-only";
import { emailConfigured } from "./env";

/**
 * Transactional email through Resend's HTTP API (no SDK).
 * Sender defaults to no-reply@crestlearning.co.ke — that domain must be verified in Resend.
 */
export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  if (!emailConfigured()) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "Crest Learning & STEM Centre <no-reply@crestlearning.co.ke>", to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
  }).catch(() => null);
  if (!res?.ok) console.error("[email] send failed", res?.status, await res?.text().catch(() => ""));
  return !!res?.ok;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain branded email: navy band, gold rule, one button. */
export function brandedEmail({ heading, paragraphs, button, footer }: { heading: string; paragraphs: string[]; button?: { label: string; url: string }; footer?: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#E2E7F0;font-family:Arial,Helvetica,sans-serif;color:#0A1D4F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #BFC8D9">
<tr><td style="background:#0A1D4F;padding:20px 28px;border-bottom:4px solid #C69A3A;color:#ffffff;font-size:16px;font-weight:bold;letter-spacing:3px">CREST LEARNING &amp; STEM CENTRE</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:20px;color:#0A1D4F">${esc(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#24366B">${esc(p)}</p>`).join("")}
${button ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#0A1D4F;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px">${esc(button.label)}</a></p><p style="margin:0 0 12px;font-size:12px;color:#4F68A6">Or paste this link into your browser:<br><span style="word-break:break-all">${esc(button.url)}</span></p>` : ""}
${footer ? `<p style="margin:18px 0 0;font-size:12px;color:#4F68A6">${esc(footer)}</p>` : ""}
</td></tr>
<tr><td style="padding:14px 28px;border-top:1px solid #BFC8D9;font-size:10px;letter-spacing:3px;color:#93A1BC">LEARN. GROW. EXCEL. · NAIROBI</td></tr>
</table></td></tr></table></body></html>`;
  const text = [heading, "", ...paragraphs, ...(button ? ["", `${button.label}: ${button.url}`] : []), ...(footer ? ["", footer] : [])].join("\n");
  return { html, text };
}
