import { formatDayLabel, formatHours, isToday } from '../lib/dateUtils.js'

function EntryRow({ entry, colorVar }) {
  const ref = entry.issue || entry.mergeRequest
  const kindLabel = entry.issue ? 'issue' : entry.mergeRequest ? 'MR' : null

  return (
    <div className="day-entry">
      <div className="day-entry__main">
        <div className="day-entry__title">
          {ref?.webUrl ? (
            <a href={ref.webUrl} target="_blank" rel="noreferrer">
              {ref.title}
            </a>
          ) : (
            entry.summary || entry.projectName || 'Запись времени'
          )}
        </div>
        <div className="day-entry__meta">
          <span className="project-tag">
            <span className="project-tag__dot" style={{ background: `var(${colorVar})` }} />
            {entry.projectName}
          </span>
          {kindLabel && ref?.iid ? ` · ${kindLabel} !${ref.iid}` : ''}
          {entry.summary && ref ? ` · ${entry.summary}` : ''}
        </div>
      </div>
      <div className="day-entry__time">{formatHours(entry.timeSpentSeconds)}</div>
    </div>
  )
}

function DayCard({ day, colorForProject }) {
  const today = isToday(day.date)
  return (
    <div className="card day-card">
      <div className="day-card__header">
        <span className={`day-card__date ${today ? 'is-today' : ''}`}>{formatDayLabel(day.date)}</span>
        <span className="day-card__total">{formatHours(day.totalSeconds)}</span>
      </div>
      {day.entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} colorVar={colorForProject(entry.projectName)} />
      ))}
    </div>
  )
}

export default function DayList({ days, colorForProject }) {
  const activeDays = days.filter((d) => d.entries.length > 0).slice().reverse()

  if (activeDays.length === 0) {
    return (
      <div className="card empty-state">
        <div className="empty-state__title">Пока нет записей</div>
        <p>За выбранный период не найдено залогированного времени в GitLab.</p>
      </div>
    )
  }

  return (
    <div className="day-list">
      {activeDays.map((day) => (
        <DayCard key={day.iso} day={day} colorForProject={colorForProject} />
      ))}
    </div>
  )
}
