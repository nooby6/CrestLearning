/**
 * Shown the instant a page link is clicked, while the server prepares the page.
 * Same frame as a real page (navy banner, cards) so the switch is seamless.
 */
export function PageSkeleton() {
  const bar = "animate-pulse bg-navy-100/70";
  return (
    <div aria-busy="true" aria-label="Loading" className="fade-in">
      <div className="page-banner">
        <div className="h-2.5 w-24 animate-pulse bg-gold-500/50" />
        <div className="mt-3 h-6 w-64 max-w-full animate-pulse bg-white/25" />
        <div className="mt-2.5 h-3 w-96 max-w-full animate-pulse bg-white/15" />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <div className={`h-2.5 w-20 ${bar}`} />
            <div className={`mt-3 h-7 w-24 ${bar}`} />
          </div>
        ))}
      </div>
      <div className="card">
        <div className="h-10 bg-navy-800" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
            <div className={`h-8 w-8 shrink-0 ${bar}`} />
            <div className="min-w-0 flex-1">
              <div className={`h-3 w-1/3 ${bar}`} />
              <div className={`mt-2 h-2.5 w-1/2 ${bar}`} />
            </div>
            <div className={`hidden h-5 w-16 sm:block ${bar}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
