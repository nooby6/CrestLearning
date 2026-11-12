/** Top of an inner page: navy band, page title, one or two lines on what the page covers. */
export function PageIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b-4 border-gold-500 bg-navy-800 text-white">
      {/* A quiet echo of the home page's contour lines. */}
      <svg aria-hidden viewBox="0 0 400 200" className="pointer-events-none absolute -right-16 -top-10 hidden h-[300px] w-[600px] opacity-[0.14] md:block">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <ellipse key={i} cx={260} cy={110} rx={40 + i * 26} ry={26 + i * 17} fill="none" stroke="#FFFFFF" strokeWidth={1} transform={`rotate(-8 260 110)`} />
        ))}
      </svg>
      <div className="site-wrap relative py-14 sm:py-16">
        <h1 className="max-w-3xl font-display text-[clamp(28px,8.6vw,34px)] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">{title}</h1>
        {children && <div className="mt-4 max-w-[60ch] text-[17px] leading-[1.65] text-navy-100">{children}</div>}
      </div>
    </section>
  );
}

/** A content section with a heading on the left and the content on the right (stacks on phones). */
export function Section({ title, intro, children, tone = "white" }: { title: string; intro?: React.ReactNode; children: React.ReactNode; tone?: "white" | "canvas" }) {
  return (
    <section className={tone === "canvas" ? "border-y border-line bg-canvas py-16 sm:py-20" : "bg-white py-16 sm:py-20"}>
      <div className="site-wrap grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <div>
          <h2 className="site-h2">{title}</h2>
          {intro && <div className="mt-4 text-[16px] leading-[1.65] text-navy-700">{intro}</div>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function EnquireBand() {
  return (
    <section className="bg-navy-800 text-white">
      <div className="site-wrap flex flex-col gap-6 py-14 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-[26px] font-bold leading-tight sm:text-[30px]">Ready to talk about your student?</h2>
          <p className="mt-2 text-navy-100">Send a short enquiry and the office will be in touch.</p>
        </div>
        <a href="/admissions#enquire" className="btn-gold self-start px-6 py-3 text-[15px] md:self-auto">
          Enquire about a place
        </a>
      </div>
    </section>
  );
}
