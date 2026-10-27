import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6 text-center">
      <Wordmark className="mb-10" />
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">We couldn’t find that page</h1>
      <p className="mt-2 text-sm text-navy-500">It may have moved, or the link is incomplete.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to my portal
      </Link>
    </div>
  );
}
