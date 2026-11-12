/**
 * A sample of the weekly report parents read in the portal, drawn with the portal's own styles.
 * Clearly captioned as an example; the names are placeholders.
 */
const ROWS = [
  { subject: "Mathematics", teacher: "Maths teacher", lessons: "2 of 2 attended", topics: "Simultaneous equations; graphs of linear functions", homework: "Exercise 6B, due Friday" },
  { subject: "Chemistry", teacher: "Chemistry teacher", lessons: "1 of 1 attended", topics: "Rates of reaction: temperature and concentration", homework: "Past paper questions 3–5" },
];

export function ReportPreview() {
  return (
    <figure className="m-0">
      <div className="border border-line border-t-[3px] border-t-navy-800 bg-white shadow-[0_18px_40px_-24px_rgba(10,29,79,0.45)]">
        <div className="flex items-center justify-between gap-3 bg-navy-800 px-5 py-3 text-white">
          <span className="font-display text-sm font-semibold">Weekly report</span>
          <span className="text-xs text-navy-100">Week of 9 November</span>
        </div>
        <div className="divide-y divide-line">
          {ROWS.map((r) => (
            <div key={r.subject} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-display text-[15px] font-semibold text-navy-900">{r.subject}</p>
                <p className="text-xs font-medium text-emerald-700">{r.lessons}</p>
              </div>
              <dl className="mt-2 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
                <dt className="text-navy-400">Covered</dt>
                <dd className="text-navy-800">{r.topics}</dd>
                <dt className="text-navy-400">Homework</dt>
                <dd className="text-navy-800">{r.homework}</dd>
              </dl>
            </div>
          ))}
          <div className="bg-ivory px-5 py-4">
            <p className="text-[13px] leading-relaxed text-navy-800">
              “Confident with substitution now. Next week we’ll practise word problems so the method holds up under exam conditions.”
            </p>
            <p className="mt-1.5 text-xs text-navy-500">Teacher’s comment, Mathematics</p>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-navy-500">An example of the report parents read each week. Every family sees only their own students.</figcaption>
    </figure>
  );
}
