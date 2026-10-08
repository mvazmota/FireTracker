import { formatCurrency } from '../../lib/format.js'

const WIDTH = 720
const HEIGHT = 240
const PAD = { top: 18, right: 18, bottom: 30, left: 18 }

/** Projected net worth against the FIRE target, year by year. */
export default function FireProjectionChart({ series, band, target, startYear, language }) {
  const lastYear = series.at(-1)?.year ?? 0
  const peak = Math.max(target, ...series.map((point) => point.value), ...(band || []).map((point) => point.p90), 1)
  const maxValue = peak * 1.1

  const x = (year) => PAD.left + (lastYear ? (year / lastYear) * (WIDTH - PAD.left - PAD.right) : 0)
  const y = (value) => HEIGHT - PAD.bottom - (Math.max(0, value) / maxValue) * (HEIGHT - PAD.top - PAD.bottom)

  const line = series.map((point, index) => `${index ? 'L' : 'M'}${x(point.year).toFixed(1)} ${y(point.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(lastYear).toFixed(1)} ${HEIGHT - PAD.bottom} L${x(0).toFixed(1)} ${HEIGHT - PAD.bottom} Z`
  const targetY = y(target)

  // The middle 80% of simulated futures: out along the good case, back along the
  // bad one, and closed. Drawn under the line so the plan stays the focus.
  const bandPath = band && band.length > 1
    ? `${band.map((point, index) => `${index ? 'L' : 'M'}${x(point.year).toFixed(1)} ${y(point.p90).toFixed(1)}`).join(' ')} ${[...band].reverse().map((point) => `L${x(point.year).toFixed(1)} ${y(point.p10).toFixed(1)}`).join(' ')} Z`
    : null

  // Where the projection overtakes the target, if it does.
  const crossing = series.find((point) => point.value >= target)

  // A label roughly every five years. Only multiples of the step, so the last
  // one never lands right beside the final year and collide.
  const step = Math.max(1, Math.ceil(lastYear / 6))
  const ticks = series.filter((point) => point.year % step === 0)

  return <div className="fire-chart-scroll">
    <svg className="fire-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${formatCurrency(target, language)} target`}>
      <defs>
        <linearGradient id="fireArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fb08a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7fb08a" stopOpacity="0" />
        </linearGradient>
      </defs>

      <line className="fire-target-line" x1={PAD.left} y1={targetY} x2={WIDTH - PAD.right} y2={targetY} />
      <text className="fire-target-label" x={PAD.left} y={targetY - 8}>{formatCurrency(target, language)}</text>

      <path className="fire-chart-band" d={bandPath} />
      <path className="fire-chart-area" d={area} />
      <path className="fire-chart-line" d={line} />

      {crossing && <circle className="fire-chart-dot" cx={x(crossing.year)} cy={y(crossing.value)} r="4.5" />}

      {ticks.map((point) => <text className="fire-chart-tick" key={point.year} x={x(point.year)} y={HEIGHT - 10} textAnchor="middle">{startYear + point.year}</text>)}
    </svg>
  </div>
}
