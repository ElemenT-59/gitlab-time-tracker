const DAY_MS = 24 * 60 * 60 * 1000

const WEEKDAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTH_LABELS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]
const MONTH_LABELS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfWeek(date) {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as first day
  return addDays(d, diff)
}

export function startOfMonth(date) {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

export function endOfMonth(date) {
  const d = startOfMonth(date)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  return d
}

export function datesBetween(start, end) {
  const dates = []
  let cursor = startOfDay(start)
  const last = startOfDay(end)
  while (cursor.getTime() <= last.getTime()) {
    dates.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }
  return dates
}

export function dayCount(start, end) {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS) + 1
}

export const RANGE_PRESETS = [
  { key: 'today', label: 'Сегодня' },
  { key: '7d', label: 'Последние 7 дней' },
  { key: '30d', label: 'Последние 30 дней' },
  { key: 'thisWeek', label: 'Эта неделя' },
  { key: 'thisMonth', label: 'Этот месяц' },
  { key: 'custom', label: 'Свой диапазон' },
]

export function resolvePreset(key, today = new Date()) {
  const now = startOfDay(today)
  switch (key) {
    case 'today':
      return { start: now, end: now }
    case '7d':
      return { start: addDays(now, -6), end: now }
    case '30d':
      return { start: addDays(now, -29), end: now }
    case 'thisWeek':
      return { start: startOfWeek(now), end: now }
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) > now ? now : endOfMonth(now) }
    default:
      return { start: addDays(now, -29), end: now }
  }
}

export function formatHours(seconds) {
  if (!seconds) return '0ч'
  const totalMinutes = Math.round(seconds / 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}м`
  if (m === 0) return `${h}ч`
  return `${h}ч ${m}м`
}

export function secondsToHoursDecimal(seconds) {
  return Math.round((seconds / 3600) * 10) / 10
}

export function formatDayLabel(date, { withWeekday = true, withYear = false } = {}) {
  const weekday = WEEKDAY_LABELS[date.getDay()]
  const day = date.getDate()
  const month = MONTH_LABELS[date.getMonth()]
  const year = withYear ? `, ${date.getFullYear()}` : ''
  return withWeekday ? `${weekday}, ${day} ${month}${year}` : `${day} ${month}${year}`
}

export function formatDayShort(date) {
  return `${date.getDate()} ${MONTH_LABELS_SHORT[date.getMonth()]}`
}

export function isToday(date, today = new Date()) {
  return toISODate(date) === toISODate(today)
}
