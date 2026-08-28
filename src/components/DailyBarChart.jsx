import { useEffect, useMemo, useRef, useState } from 'react'
import { formatHours, formatDayLabel, formatDayShort, isToday, toISODate } from '../lib/dateUtils.js'

const HEIGHT = 200
const MARGIN = { top: 10, right: 12, bottom: 24, left: 40 }
const MIN_SLOT = 26

function computeYAxis(maxSeconds) {
  const maxHours = maxSeconds / 3600
  if (maxHours <= 0) {
    return { axisMax: 4 * 3600, ticks: [0, 3600, 7200, 10800, 14400] }
  }
  const rawStep = maxHours / 4
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)))
  const residual = rawStep / magnitude
  let niceStep
  if (residual > 5) niceStep = 10 * magnitude
  else if (residual > 2) niceStep = 5 * magnitude
  else if (residual > 1) niceStep = 2 * magnitude
  else niceStep = magnitude
  niceStep = Math.max(niceStep, 0.5)
  const ticks = [0, 1, 2, 3, 4].map((i) => i * niceStep * 3600)
  return { axisMax: ticks[4], ticks }
}

export default function DailyBarChart({ days }) {
  const wrapperRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(720)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return undefined
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width
      if (w) setContainerWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const maxSeconds = Math.max(0, ...days.map((d) => d.totalSeconds))
  const { axisMax, ticks } = useMemo(() => computeYAxis(maxSeconds), [maxSeconds])

  const dense = days.length > 0 && (containerWidth - MARGIN.left - MARGIN.right) / days.length < MIN_SLOT
  const plotWidth = dense
    ? Math.max(days.length * MIN_SLOT, containerWidth - MARGIN.left - MARGIN.right)
    : containerWidth - MARGIN.left - MARGIN.right

  const width = plotWidth + MARGIN.left + MARGIN.right
  const height = HEIGHT + MARGIN.top + MARGIN.bottom
  const slot = days.length ? plotWidth / days.length : 0
  const barWidth = Math.max(2, Math.min(24, slot * 0.55))

  const showEveryLabel = days.length <= 10
  const labelStep = Math.max(1, Math.ceil(days.length / (dense ? 14 : 9)))

  function yFor(seconds) {
    return MARGIN.top + HEIGHT - (seconds / axisMax) * HEIGHT
  }

  return (
    <div className="bar-chart" ref={wrapperRef} style={{ position: 'relative' }}>
      {days.length > 0 && (
        <svg width={width} height={height} role="img" aria-label="Часы по дням">
          {ticks.map((t) => (
            <g key={t}>
              <line
                className="bar-chart__gridline"
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={yFor(t)}
                y2={yFor(t)}
              />
              <text className="bar-chart__tick" x={MARGIN.left - 8} y={yFor(t) + 3} textAnchor="end">
                {t === 0 ? '0' : `${Math.round((t / 3600) * 10) / 10}ч`}
              </text>
            </g>
          ))}
          <line
            className="bar-chart__axis-line"
            x1={MARGIN.left}
            x2={width - MARGIN.right}
            y1={MARGIN.top + HEIGHT}
            y2={MARGIN.top + HEIGHT}
          />

          {days.map((d, i) => {
            const cx = MARGIN.left + slot * i + slot / 2
            const barH = d.totalSeconds > 0 ? Math.max((d.totalSeconds / axisMax) * HEIGHT, 3) : 2
            const y = MARGIN.top + HEIGHT - barH
            const hovered = hover === i
            const today = isToday(d.date)
            // Anchor the step from the last day rather than the first, so the
            // final gap is never shorter than the rest — a fixed "today is
            // always labeled" rule broke even spacing whenever today didn't
            // land on-step.
            const showLabel = showEveryLabel || (days.length - 1 - i) % labelStep === 0

            return (
              <g key={toISODate(d.date)}>
                <rect
                  className={`bar-chart__bar ${hovered ? 'is-hovered' : ''} ${d.totalSeconds === 0 ? 'is-empty' : ''}`}
                  x={cx - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={4}
                  ry={4}
                />
                <rect
                  x={cx - slot / 2}
                  y={MARGIN.top}
                  width={slot}
                  height={HEIGHT}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                  onBlur={() => setHover((h) => (h === i ? null : h))}
                  tabIndex={0}
                />
                {showLabel && (
                  <text
                    className={`bar-chart__day-label ${today ? 'is-today' : ''}`}
                    x={cx}
                    y={MARGIN.top + HEIGHT + 16}
                    textAnchor="middle"
                  >
                    {formatDayShort(d.date)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}

      {hover !== null && days[hover] && (
        <div
          className="chart-tooltip"
          style={{
            left: MARGIN.left + slot * hover + slot / 2,
            top: MARGIN.top + HEIGHT - Math.max((days[hover].totalSeconds / axisMax) * HEIGHT, 3),
          }}
        >
          <div className="chart-tooltip__value">{formatHours(days[hover].totalSeconds)}</div>
          <div className="chart-tooltip__label">{formatDayLabel(days[hover].date)}</div>
        </div>
      )}
    </div>
  )
}
