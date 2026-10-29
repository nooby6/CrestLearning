import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/roles";
import { Wordmark } from "@/components/brand/Logo";
import { ensureBootstrapAdmin } from "@/lib/bootstrap";
import { SignInForm } from "./SignInForm";
import { CrestFeatureGrid } from "@/components/ui/bento-grid";

export const metadata = { title: "Sign in" };

const CURRICULA = ["Cambridge", "Edexcel", "CBE", "IB"];

export default async function SignInPage() {
  await ensureBootstrapAdmin();
  const me = await getCurrentUser();
  if (me?.active) redirect(homePath(me));

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* Brand panel: what Crest does, as a bento grid of live tiles */}
      <aside className="hidden border-r border-navy-950 bg-navy-800 lg:flex lg:flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-10 py-6">
          <Wordmark tone="light" />
          <p className="flex items-center gap-2 font-display text-[10px] font-semibold tracking-[0.3em] text-navy-200">
            <MapPin className="h-3.5 w-3.5 text-gold-500" strokeWidth={2} />
            NAIROBI, KENYA
          </p>
        </div>
        <div className="flex flex-1 flex-col justify-center px-10 py-10">
          <p className="font-display text-[11px] font-semibold tracking-[0.42em] text-gold-400">LEARN. GROW. EXCEL.</p>
          <h2 className="mb-8 mt-3 max-w-md font-display text-3xl font-semibold leading-tight text-white">Tuition and homeschooling, run in one place.</h2>
          <CrestFeatureGrid />
        </div>
        <div className="flex items-center border-t border-white/10 px-10 py-4 font-display text-[10px] font-semibold tracking-[0.24em] text-navy-200">
          {CURRICULA.map((c, i) => (
            <span key={c} className="flex items-center">
              {i > 0 && <span className="mx-3 h-3 w-px bg-gold-500" aria-hidden />}
              {c.toUpperCase()}
            </span>
          ))}
        </div>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center bg-ivory px-6 py-12">
        <div className="w-full max-w-sm border border-line bg-white p-8">
          <div className="mb-8 lg:hidden">
            <Wordmark />
          </div>
          <div className="mb-6">
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">Sign in to Crest</h1>
            <p className="mt-1.5 text-sm text-navy-500">Parents, students and teachers use the details given by the Crest Learning office.</p>
          </div>
          <SignInForm />
          <div className="mt-8 border-t border-line pt-4">
            <p className="text-center font-display text-[10px] font-semibold tracking-[0.3em] text-navy-300">CREST LEARNING · NAIROBI</p>
          </div>
        </div>
      </main>
    </div>
  );
}
