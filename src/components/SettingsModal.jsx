import { useState } from 'react'
import { fetchCurrentUser, GitlabApiError } from '../lib/gitlabApi.js'

export default function SettingsModal({ initialSettings, onSave, onClose, canClose }) {
  const [gitlabUrl, setGitlabUrl] = useState(initialSettings?.gitlabUrl || 'https://gitlab.com')
  const [token, setToken] = useState(initialSettings?.token || '')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedUrl = gitlabUrl.trim().replace(/\/+$/, '')
    const trimmedToken = token.trim()

    if (!trimmedUrl || !trimmedToken) {
      setError('Укажите адрес GitLab и токен доступа.')
      return
    }

    setTesting(true)
    try {
      const user = await fetchCurrentUser({ gitlabUrl: trimmedUrl, token: trimmedToken })
      onSave({
        gitlabUrl: trimmedUrl,
        token: trimmedToken,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
      })
    } catch (err) {
      const message =
        err instanceof GitlabApiError
          ? err.message
          : 'Не удалось подключиться. Проверьте адрес и токен.'
      setError(message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && canClose) onClose() }}>
      <div className="modal card">
        <div className="modal__header">
          <span className="modal__title">Подключение к GitLab</span>
          {canClose && (
            <button className="modal__close" onClick={onClose} aria-label="Закрыть">
              ✕
            </button>
          )}
        </div>
        <p className="modal__intro">
          Приложение обращается к GitLab GraphQL API напрямую с вашего компьютера через
          локальный dev-сервер — токен не передаётся ни в какие сторонние сервисы и
          хранится только в localStorage вашего браузера.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="gitlabUrl">Адрес GitLab</label>
            <input
              id="gitlabUrl"
              type="text"
              placeholder="https://gitlab.com"
              value={gitlabUrl}
              onChange={(e) => setGitlabUrl(e.target.value)}
              autoComplete="off"
            />
            <span className="field__hint">gitlab.com или адрес вашего self-managed сервера</span>
          </div>

          <div className="field">
            <label htmlFor="token">Personal Access Token</label>
            <input
              id="token"
              type="password"
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
            <span className="field__hint">
              User Settings → Access Tokens, достаточно scope <code>read_api</code>
            </span>
          </div>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__footer">
            {canClose && (
              <button type="button" className="btn" onClick={onClose} disabled={testing}>
                Отмена
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={testing}>
              {testing ? 'Проверка…' : 'Подключить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
