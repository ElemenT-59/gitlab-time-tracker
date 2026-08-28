import { useEffect, useRef, useState } from 'react'
import { RANGE_PRESETS, toISODate } from '../lib/dateUtils.js'

export default function DateRangePicker({ presetKey, range, onChange }) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState(toISODate(range.start))
  const [customEnd, setCustomEnd] = useState(toISODate(range.end))
  const ref = useRef(null)

  useEffect(() => {
    setCustomStart(toISODate(range.start))
    setCustomEnd(toISODate(range.end))
  }, [range.start, range.end])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLabel = RANGE_PRESETS.find((p) => p.key === presetKey)?.label || 'Свой диапазон'

  function applyCustom() {
    if (!customStart || !customEnd) return
    const start = new Date(`${customStart}T00:00:00`)
    const end = new Date(`${customEnd}T00:00:00`)
    if (start.getTime() > end.getTime()) return
    onChange('custom', { start, end })
    setOpen(false)
  }

  return (
    <div className="range-picker" ref={ref}>
      <button className="btn" onClick={() => setOpen((v) => !v)}>
        📅 {currentLabel}
      </button>
      {open && (
        <div className="range-picker__panel">
          {RANGE_PRESETS.filter((p) => p.key !== 'custom').map((preset) => (
            <button
              key={preset.key}
              className={`range-picker__row ${presetKey === preset.key ? 'is-selected' : ''}`}
              onClick={() => {
                onChange(preset.key)
                setOpen(false)
              }}
            >
              <span>{preset.label}</span>
              {presetKey === preset.key && <span className="range-picker__check">✓</span>}
            </button>
          ))}
          <div className="range-picker__custom">
            <span className="field__hint">Свой диапазон</span>
            <div className="range-picker__custom-row">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={applyCustom}>
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
