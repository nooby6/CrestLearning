import "server-only";
import { createSign } from "node:crypto";

/**
 * Video provider for the online classroom.
 *
 *   Production → JaaS (Jitsi as a Service, 8x8.vc). Set JAAS_APP_ID, JAAS_API_KEY_ID, JAAS_PRIVATE_KEY.
 *                Each join gets a short-lived signed token; the teacher is the moderator.
 *   Self-hosted → set JITSI_DOMAIN to your own Jitsi Meet server.
 *   Otherwise   → public meet.jit.si, which caps embedded calls at a few minutes. Fine for a demo only.
 */
export type RoomConfig = {
  provider: "jaas" | "jitsi";
  domain: string;
  scriptSrc: string;
  roomName: string;
  jwt?: string;
  demoLimited: boolean;
};

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

function jaasToken(opts: {
  appId: string;
  keyId: string;
  privateKey: string;
  room: string;
  user: { id: string; name: string; email?: string | null; avatar?: string | null };
  moderator: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: opts.keyId };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: opts.appId,
    room: opts.room,
    nbf: now - 10,
    exp: now + 3 * 60 * 60,
    context: {
      user: {
        id: opts.user.id,
        name: opts.user.name,
        email: opts.user.email ?? undefined,
        avatar: opts.user.avatar ?? undefined,
        moderator: opts.moderator ? "true" : "false",
      },
      features: { livestreaming: "false", recording: "false", transcription: "false", "outbound-call": "false" },
    },
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  // Keys pasted into Vercel env vars often have literal "\n" — normalise them.
  const key = opts.privateKey.includes("\\n") ? opts.privateKey.replace(/\\n/g, "\n") : opts.privateKey;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(key);
  return `${unsigned}.${b64url(sig)}`;
}

export function roomConfig(
  meetingRoom: string,
  user: { id: string; name: string; email?: string | null; avatar?: string | null },
  moderator: boolean,
): RoomConfig {
  const { JAAS_APP_ID, JAAS_API_KEY_ID, JAAS_PRIVATE_KEY, JITSI_DOMAIN } = process.env;

  if (JAAS_APP_ID && JAAS_API_KEY_ID && JAAS_PRIVATE_KEY) {
    return {
      provider: "jaas",
      domain: "8x8.vc",
      scriptSrc: `https://8x8.vc/${JAAS_APP_ID}/external_api.js`,
      roomName: `${JAAS_APP_ID}/${meetingRoom}`,
      jwt: jaasToken({ appId: JAAS_APP_ID, keyId: JAAS_API_KEY_ID, privateKey: JAAS_PRIVATE_KEY, room: meetingRoom, user, moderator }),
      demoLimited: false,
    };
  }
  const domain = JITSI_DOMAIN || "meet.jit.si";
  return {
    provider: "jitsi",
    domain,
    scriptSrc: `https://${domain}/external_api.js`,
    roomName: meetingRoom,
    demoLimited: domain === "meet.jit.si",
  };
}
