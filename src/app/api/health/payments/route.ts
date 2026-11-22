import { NextResponse } from "next/server";
import { IntaSendError, IntaSendNetworkError, intasendConfigured, intasendTestMode, listWallets } from "@/lib/intasend";

export const dynamic = "force-dynamic";

/** Is the payment provider set up and answering? Returns yes/no only: no balances, no keys. */
export async function GET() {
  if (!intasendConfigured()) return NextResponse.json({ provider: "intasend", configured: false });
  let reachable = false;
  let problem: string | null = null;
  try {
    await listWallets();
    reachable = true;
  } catch (e) {
    problem =
      e instanceof IntaSendError
        ? `IntaSend rejected the request: ${e.message}`
        : e instanceof IntaSendNetworkError
          ? `Couldn’t reach IntaSend (${e.message})`
          : "Couldn’t reach IntaSend";
  }
  return NextResponse.json({ provider: "intasend", configured: true, mode: intasendTestMode() ? "test" : "live", reachable, problem });
}
