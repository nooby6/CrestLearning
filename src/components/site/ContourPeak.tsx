/**
 * The hero image: a topographic map of a peak — the "crest" — drawn as contour lines.
 * Four rings are the stages of a student's climb, labelled in a column at the right; the summit carries the gold bar
 * from the logo's E. Shapes are generated deterministically, so the server and browser draw the same thing.
 */

const W = 870;
const H = 560;
const CX = 280;
const CY = 300;
const RINGS = 15;
const LABEL_X = 612;
/** Highest stage first; y is where its label sits. */
const STAGES: { ring: number; label: string; y: number }[] = [
  { ring: 2, label: "A Level and IB Diploma", y: 236 },
  { ring: 5, label: "IGCSE and GCSE", y: 312 },
  { ring: 9, label: "Lower secondary", y: 392 },
  { ring: 13, label: "Primary", y: 476 },
];

type Pt = [number, number];

function ringPoints(i: number): Pt[] {
  const t = i / (RINGS - 1); // 0 = summit, 1 = foot
  const rx = 28 + t * 250;
  const ry = 22 + t * 220;
  const cx = CX + 40 * (1 - t);
  const cy = CY - 46 * (1 - t);
  const N = 44;
  return Array.from({ length: N }, (_, k) => {
    const a = (k / N) * Math.PI * 2;
    const w = 1 + 0.07 * Math.sin(3 * a + i * 0.6) + 0.05 * Math.sin(5 * a - i * 0.9) + 0.03 * Math.cos(7 * a + i * 1.7) + 0.05 * t * Math.sin(2 * a + 1.2);
    return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w];
  });
}

/** Smooth closed curve through the points (Catmull–Rom as cubic Béziers). */
function smooth(pts: Pt[]) {
  const N = pts.length;
  const p = (n: number) => pts[(n + N) % N];
  const f = (v: number) => String(Math.round(v));
  let d = `M${f(p(0)[0])},${f(p(0)[1])}`;
  for (let k = 0; k < N; k++) {
    const [x0, y0] = p(k - 1);
    const [x1, y1] = p(k);
    const [x2, y2] = p(k + 1);
    const [x3, y3] = p(k + 2);
    d += `C${f(x1 + (x2 - x0) / 6)},${f(y1 + (y2 - y0) / 6)} ${f(x2 - (x3 - x1) / 6)},${f(y2 - (y3 - y1) / 6)} ${f(x2)},${f(y2)}`;
  }
  return d + "Z";
}

/** The point on the right-hand side of a ring closest to a given height. */
function rightAt(pts: Pt[], y: number, cx: number): Pt {
  return pts.filter((q) => q[0] > cx).reduce((m, q) => (Math.abs(q[1] - y) < Math.abs(m[1] - y) ? q : m));
}

export function ContourPeak({ className }: { className?: string }) {
  const rings = Array.from({ length: RINGS }, (_, i) => {
    const pts = ringPoints(i);
    return { i, pts, d: smooth(pts) };
  });
  const stageOf = new Map(STAGES.map((s) => [s.ring, s]));
  const summit: Pt = [CX + 40, CY - 46];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label="A contour map of a peak. Its rings mark the stages from Primary up to A Level and the IB Diploma."
    >
      {/* Drawn from the foot upwards, so the lines climb to the summit as they appear. */}
      {[...rings].reverse().map(({ i, d }, order) => {
        const stage = stageOf.has(i);
        return (
          <path
            key={i}
            d={d}
            pathLength={1}
            fill="none"
            stroke={stage ? "#C69A3A" : "#FFFFFF"}
            strokeOpacity={stage ? 1 : 0.14 + (1 - i / RINGS) * 0.18}
            strokeWidth={stage ? 1.75 : 1}
            className="contour-line"
            style={{ animationDelay: `${order * 60}ms` }}
          />
        );
      })}

      {STAGES.map((s, n) => {
          const ring = rings[s.ring];
          const cx = CX + 40 * (1 - s.ring / (RINGS - 1));
          const [x, y] = rightAt(ring.pts, s.y, cx);
          return (
            <g key={s.ring} className="contour-label max-sm:hidden" style={{ animationDelay: `${950 + n * 110}ms` }}>
              <line x1={x} y1={y} x2={LABEL_X - 10} y2={y} stroke="#C69A3A" strokeOpacity={0.55} strokeWidth={1} />
              <rect x={x - 3.5} y={y - 3.5} width={7} height={7} fill="#C69A3A" />
              <text x={LABEL_X} y={y + 6} fill="#FFFFFF" fontSize={18} fontWeight={600} fontFamily="var(--font-montserrat), sans-serif">
                {s.label}
              </text>
            </g>
          );
        })}

      {/* Summit: the gold bar from the logo's E. */}
      <rect x={summit[0] - 16} y={summit[1] - 3.5} width={32} height={7} fill="#C69A3A" />
    </svg>
  );
}
