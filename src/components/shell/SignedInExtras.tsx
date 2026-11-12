import { currentSession } from "@/lib/session";
import { SessionTimeout } from "./SessionTimeout";

/** The 3-hour sign-out countdown, for pages behind sign-in. */
export async function SignedInExtras() {
  const session = await currentSession();
  return session ? <SessionTimeout endsAt={session.endsAt.toISOString()} serverNow={Date.now()} /> : null;
}
