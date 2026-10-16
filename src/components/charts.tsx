// Hand-built SVG charts: the kit has no chart component. Colours come from the
// --gbs-* tokens through CSS classes, so they follow the theme.

interface BurndownProps {
  /** Working days of the sprint, as day-of-month numbers. */
  days: number[];
  /** Remaining points at the end of each day so far. */
  actual: { day: number; remaining: number }[];
  total: number;
}

const W = 680;
const H = 240;
const PAD = { left: 36, right: 16, top: 12, bottom: 28 };

export function BurndownChart({ days, actual, total }: BurndownProps) {
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (plotW * i) / (days.length - 1);
  const y = (v: number) => PAD.top + plotH * (1 - v / total);
  const ticks = [0, 10, 20, 30];
  const points = actual.map((p) => ({ ...p, i: days.indexOf(p.day) }));
  const today = points[points.length - 1];
  const ideal = (i: number) => total * (1 - i / (days.length - 1));

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="burndown-desc" className="chart-svg">
        <desc id="burndown-desc">
          Burndown for the sprint: {total} points at the start, {today.remaining} remaining on {today.day} October,
          against an ideal of {ideal(today.i).toFixed(1)}.
        </desc>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.left - 10} y={y(t)} className="chart-tick" textAnchor="end" dominantBaseline="middle">
              {t}
            </text>
          </g>
        ))}
        {days.map((d, i) => (
          <text key={d} x={x(i)} y={H - 8} className="chart-tick" textAnchor="middle">
            {d}
          </text>
        ))}
        <line x1={x(today.i)} x2={x(today.i)} y1={PAD.top} y2={PAD.top + plotH} className="chart-today" />
        <line x1={x(0)} y1={y(total)} x2={x(days.length - 1)} y2={y(0)} className="chart-ideal" />
        <polyline points={points.map((p) => `${x(p.i)},${y(p.remaining)}`).join(" ")} className="chart-line" />
        {points.map((p) => (
          <g key={p.day} className="chart-point">
            <circle cx={x(p.i)} cy={y(p.remaining)} r={4} className="chart-dot" />
            {/* A larger, invisible target carries the hover tooltip. */}
            <circle cx={x(p.i)} cy={y(p.remaining)} r={12} className="chart-hit">
              <title>
                {p.day} Oct: {p.remaining} pts remaining (ideal {ideal(p.i).toFixed(1)})
              </title>
            </circle>
          </g>
        ))}
        <text x={x(today.i) + 10} y={y(today.remaining) - 10} className="chart-value">
          {today.remaining} pts
        </text>
      </svg>
    </figure>
  );
}

interface BarChartProps {
  bars: { label: string; value: number }[];
  max: number;
}

const BW = 360;
const BH = 240;
const BPAD = { left: 30, right: 10, top: 24, bottom: 28 };

/** Vertical bars with 4px rounded tops; the most recent bar carries the accent. */
export function BarChart({ bars, max }: BarChartProps) {
  const plotW = BW - BPAD.left - BPAD.right;
  const plotH = BH - BPAD.top - BPAD.bottom;
  const band = plotW / bars.length;
  const barW = 48;
  const y = (v: number) => BPAD.top + plotH * (1 - v / max);
  const ticks = [0, 10, 20, 30];
  const r = 4;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${BW} ${BH}`} role="img" aria-labelledby="delivery-desc" className="chart-svg">
        <desc id="delivery-desc">
          Completed story points: {bars.map((b) => `${b.label} ${b.value}`).join(", ")}.
        </desc>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={BPAD.left} x2={BW - BPAD.right} y1={y(t)} y2={y(t)}
              className={t === 0 ? "chart-baseline" : "chart-grid"} />
            <text x={BPAD.left - 8} y={y(t)} className="chart-tick" textAnchor="end" dominantBaseline="middle">
              {t}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = BPAD.left + band * i + band / 2;
          const x0 = cx - barW / 2;
          const top = y(b.value);
          const bottom = y(0);
          const latest = i === bars.length - 1;
          return (
            <g key={b.label}>
              <path
                d={`M${x0},${bottom} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${bottom} Z`}
                className={latest ? "chart-bar" : "chart-bar is-muted"}
              >
                <title>
                  {b.label}: {b.value} points completed
                </title>
              </path>
              <text x={cx} y={top - 8} className="chart-value" textAnchor="middle">
                {b.value}
              </text>
              <text x={cx} y={BH - 8} className="chart-tick" textAnchor="middle">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
