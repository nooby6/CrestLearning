import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { appUrl } from "./env";

/**
 * "Sign in with Google" for existing accounts only: Google proves the email address,
 * and it must match the email the office saved on an active Crest account. No sign-ups.
 * Authorization-code flow with PKCE and a state cookie.
 */
export const OAUTH_COOKIE = "crest_google_oauth";
export const redirectUri = () => `${appUrl()}/api/auth/google/callback`;

const b64url = (b: Buffer) => b.toString("base64url");

export function startGoogle() {
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), cookie: JSON.stringify({ state, verifier }) };
}

/** Exchanges the code and returns Google's verified email, or null. */
export async function finishGoogle(code: string, verifier: string): Promise<string | null> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  }).catch(() => null);
  if (!tokenRes?.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return null;
  // Asked of Google directly over TLS with the fresh access token, so the answer can be trusted as is.
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } }).catch(() => null);
  if (!infoRes?.ok) return null;
  const info = (await infoRes.json()) as { email?: string; email_verified?: boolean };
  return info.email && info.email_verified ? info.email.toLowerCase() : null;
}
