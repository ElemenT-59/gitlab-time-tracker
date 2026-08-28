import { formatHours } from '../lib/dateUtils.js'

const SERIES_VARS = [
  '--series-1',
  '--series-2',
  '--series-3',
  '--series-4',
  '--series-5',
  '--series-6',
  '--series-7',
]

export default function ProjectBreakdown({ projects }) {
  if (projects.length === 0) {
    return <p className="link-muted">Нет записей времени за выбранный период.</p>
  }

  const sorted = [...projects].sort((a, b) => b.seconds - a.seconds)
  const top = sorted.slice(0, 7)
  const restSeconds = sorted.slice(7).reduce((sum, p) => sum + p.seconds, 0)

  const rows = top.map((p, i) => ({ ...p, colorVar: SERIES_VARS[i] }))
  if (restSeconds > 0) {
    rows.push({ name: 'Остальные проекты', seconds: restSeconds, colorVar: '--series-other' })
  }

  const maxSeconds = Math.max(...rows.map((r) => r.seconds), 1)

  return (
    <div className="project-bars">
      {rows.map((row) => (
        <div key={row.name}>
          <div className="project-bar__row">
            <span className="project-bar__name">
              <span className="project-bar__dot" style={{ background: `var(${row.colorVar})` }} />
              <span className="project-bar__name-text" title={row.name}>
                {row.name}
              </span>
            </span>
            <span className="project-bar__value">{formatHours(row.seconds)}</span>
          </div>
          <div className="project-bar__track">
            <div
              className="project-bar__fill"
              style={{
                width: `${Math.max((row.seconds / maxSeconds) * 100, 3)}%`,
                background: `var(${row.colorVar})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
