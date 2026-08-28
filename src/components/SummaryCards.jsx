import { formatHours } from '../lib/dateUtils.js'

export default function SummaryCards({ totalSeconds, daysTracked, daysInRange, avgSecondsPerActiveDay, topProject }) {
  const tiles = [
    {
      label: 'Всего времени',
      value: formatHours(totalSeconds),
    },
    {
      label: 'Дней с активностью',
      value: `${daysTracked} из ${daysInRange}`,
    },
    {
      label: 'Среднее в рабочий день',
      value: formatHours(avgSecondsPerActiveDay),
    },
    {
      label: 'Основной проект',
      value: topProject ? formatHours(topProject.seconds) : '—',
      sub: topProject ? topProject.name : 'Нет данных за период',
    },
  ]

  return (
    <div className="stat-grid">
      {tiles.map((tile) => (
        <div key={tile.label} className="card stat-tile">
          <div className="stat-tile__label">{tile.label}</div>
          <div className="stat-tile__value">{tile.value}</div>
          {tile.sub && <div className="stat-tile__sub" title={tile.sub}>{tile.sub}</div>}
        </div>
      ))}
    </div>
  )
}
