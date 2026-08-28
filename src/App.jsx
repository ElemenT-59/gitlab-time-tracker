import { useEffect, useMemo, useState, useCallback } from 'react'
import SettingsModal from './components/SettingsModal.jsx'
import DateRangePicker from './components/DateRangePicker.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import DailyBarChart from './components/DailyBarChart.jsx'
import ProjectBreakdown from './components/ProjectBreakdown.jsx'
import DayList from './components/DayList.jsx'
import { fetchTimelogs, GitlabApiError } from './lib/gitlabApi.js'
import { loadSettings, saveSettings, loadThemePreference, saveThemePreference } from './lib/storage.js'
import { datesBetween, dayCount, resolvePreset, toISODate } from './lib/dateUtils.js'

const SERIES_VARS = [
  '--series-1',
  '--series-2',
  '--series-3',
  '--series-4',
  '--series-5',
  '--series-6',
  '--series-7',
]

function buildDays(range, timelogs) {
  const dates = datesBetween(range.start, range.end)
  const byIso = new Map(dates.map((date) => [toISODate(date), { date, iso: toISODate(date), totalSeconds: 0, entries: [] }]))

  for (const node of timelogs) {
    const spentDate = new Date(node.spentAt)
    const iso = toISODate(spentDate)
    const bucket = byIso.get(iso)
    if (!bucket) continue // outside range due to timezone edge — ignore
    const projectName = node.project?.fullPath || node.project?.name || 'Без проекта'
    bucket.entries.push({
      id: node.id,
      projectName,
      issue: node.issue,
      mergeRequest: node.mergeRequest,
      summary: node.summary,
      timeSpentSeconds: node.timeSpent,
    })
    bucket.totalSeconds += node.timeSpent
  }

  for (const bucket of byIso.values()) {
    bucket.entries.sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds)
  }

  return Array.from(byIso.values())
}

function buildProjectTotals(timelogs) {
  const totals = new Map()
  for (const node of timelogs) {
    const name = node.project?.fullPath || node.project?.name || 'Без проекта'
    totals.set(name, (totals.get(name) || 0) + node.timeSpent)
  }
  return Array.from(totals.entries()).map(([name, seconds]) => ({ name, seconds }))
}

export default function App() {
  const [settings, setSettings] = useState(() => loadSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState(() => loadThemePreference())

  const [presetKey, setPresetKey] = useState('30d')
  const [range, setRange] = useState(() => resolvePreset('30d'))

  const [timelogs, setTimelogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastSynced, setLastSynced] = useState(null)

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])

  const runSync = useCallback(
    async (activeSettings, activeRange) => {
      if (!activeSettings) return
      setLoading(true)
      setError('')
      try {
        const nodes = await fetchTimelogs(activeSettings, {
          username: activeSettings.username,
          startDate: toISODate(activeRange.start),
          endDate: toISODate(activeRange.end),
        })
        setTimelogs(nodes)
        setLastSynced(new Date())
      } catch (err) {
        const message = err instanceof GitlabApiError ? err.message : 'Не удалось загрузить данные из GitLab.'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (settings) {
      runSync(settings, range)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, range.start?.getTime(), range.end?.getTime()])

  function handleRangeChange(key, customRange) {
    setPresetKey(key)
    setRange(key === 'custom' ? customRange : resolvePreset(key))
  }

  function handleSettingsSave(newSettings) {
    saveSettings(newSettings)
    setSettings(newSettings)
    setShowSettings(false)
  }

  const days = useMemo(() => buildDays(range, timelogs), [range, timelogs])
  const projectTotals = useMemo(() => buildProjectTotals(timelogs), [timelogs])

  const colorForProject = useMemo(() => {
    const sorted = [...projectTotals].sort((a, b) => b.seconds - a.seconds)
    const map = new Map()
    sorted.forEach((p, i) => {
      map.set(p.name, i < SERIES_VARS.length ? SERIES_VARS[i] : '--series-other')
    })
    return (name) => map.get(name) || '--series-other'
  }, [projectTotals])

  const totalSeconds = timelogs.reduce((sum, n) => sum + n.timeSpent, 0)
  const daysTracked = days.filter((d) => d.totalSeconds > 0).length
  const daysInRange = dayCount(range.start, range.end)
  const avgSecondsPerActiveDay = daysTracked > 0 ? totalSeconds / daysTracked : 0
  const topProject = [...projectTotals].sort((a, b) => b.seconds - a.seconds)[0] || null

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <div className="app-brand__mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21.5 2.7 9.7a1 1 0 0 1 .18-1.4l1.1-.85a1 1 0 0 1 1.28.05L12 13.5l6.74-6a1 1 0 0 1 1.28-.05l1.1.85a1 1 0 0 1 .18 1.4L12 21.5Z"
                fill="white"
              />
            </svg>
          </div>
          <div>
            <div className="app-brand__title">GitLab Time Tracker</div>
            <div className="app-brand__subtitle">
              {settings ? `@${settings.username}` : 'Учёт времени по дням'}
            </div>
          </div>
        </div>

        <div className="app-header__controls">
          {settings && <DateRangePicker presetKey={presetKey} range={range} onChange={handleRangeChange} />}
          {settings && (
            <button className="btn" onClick={() => runSync(settings, range)} disabled={loading}>
              {loading ? <span className="spinner" /> : '⟳'} Синхронизировать
            </button>
          )}
          <button
            className="btn btn-icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Переключить тему"
            title="Переключить тему"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-icon" onClick={() => setShowSettings(true)} aria-label="Настройки" title="Настройки">
            ⚙️
          </button>
        </div>
      </header>

      {settings && (
        <div className="sync-status" style={{ marginBottom: 12 }}>
          {loading
            ? 'Синхронизация…'
            : lastSynced
              ? `Обновлено: ${lastSynced.toLocaleTimeString('ru-RU')}`
              : 'Ещё не синхронизировано'}
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="btn" onClick={() => runSync(settings, range)}>
            Повторить
          </button>
        </div>
      )}

      {!settings ? (
        <div className="card empty-state">
          <div className="empty-state__title">Подключите GitLab</div>
          <p>Укажите адрес вашего GitLab и personal access token, чтобы увидеть время, залогированное по issue и merge request&rsquo;ам.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowSettings(true)}>
            Подключить GitLab
          </button>
        </div>
      ) : (
        <>
          <SummaryCards
            totalSeconds={totalSeconds}
            daysTracked={daysTracked}
            daysInRange={daysInRange}
            avgSecondsPerActiveDay={avgSecondsPerActiveDay}
            topProject={topProject}
          />

          <div className="card card-pad">
            <div className="card-header">
              <div>
                <div className="card-title">Часы по дням</div>
                <div className="card-subtitle">Наведите курсор на столбец, чтобы увидеть детали</div>
              </div>
            </div>
            <DailyBarChart days={days} />
          </div>

          <div className="content-grid">
            <div>
              <DayList days={days} colorForProject={colorForProject} />
            </div>
            <div className="card card-pad">
              <div className="card-header">
                <div className="card-title">По проектам</div>
              </div>
              <ProjectBreakdown projects={projectTotals} />
            </div>
          </div>
        </>
      )}

      {(showSettings || !settings) && (
        <SettingsModal
          initialSettings={settings}
          canClose={Boolean(settings)}
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  )
}
