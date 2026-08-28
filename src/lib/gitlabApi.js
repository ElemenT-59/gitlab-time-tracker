export class GitlabApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'GitlabApiError'
    this.status = status
  }
}

const CURRENT_USER_QUERY = `
  query CurrentUser {
    currentUser {
      id
      username
      name
      avatarUrl
    }
  }
`

const TIMELOGS_QUERY = `
  query Timelogs($username: String!, $startDate: Time, $endDate: Time, $after: String) {
    timelogs(username: $username, startDate: $startDate, endDate: $endDate, after: $after) {
      nodes {
        id
        spentAt
        timeSpent
        summary
        project {
          name
          fullPath
          webUrl
        }
        issue {
          title
          webUrl
          iid
        }
        mergeRequest {
          title
          webUrl
          iid
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

async function graphqlRequest(settings, query, variables) {
  let res
  try {
    res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gitlabUrl: settings.gitlabUrl,
        token: settings.token,
        query,
        variables,
      }),
    })
  } catch (err) {
    throw new GitlabApiError('Не удалось связаться с локальным сервером приложения.')
  }

  let payload = null
  try {
    payload = await res.json()
  } catch {
    // ignore, handled below
  }

  if (payload?.errors?.length) {
    const message = payload.errors.map((e) => e.message).join('; ')
    throw new GitlabApiError(message, res.status)
  }

  if (!res.ok) {
    const message = payload?.error || payload?.message || `Ошибка сервера GitLab (HTTP ${res.status})`
    throw new GitlabApiError(message, res.status)
  }

  if (!payload?.data) {
    throw new GitlabApiError('Пустой ответ от GitLab.')
  }

  return payload.data
}

export async function fetchCurrentUser(settings) {
  const data = await graphqlRequest(settings, CURRENT_USER_QUERY)
  if (!data.currentUser) {
    throw new GitlabApiError('Токен недействителен, либо истёк срок его действия.', 401)
  }
  return data.currentUser
}

export async function fetchTimelogs(settings, { username, startDate, endDate }) {
  const nodes = []
  let after = null
  let hasNextPage = true
  let guard = 0

  while (hasNextPage && guard < 50) {
    guard += 1
    const data = await graphqlRequest(settings, TIMELOGS_QUERY, {
      username,
      startDate,
      endDate,
      after,
    })
    const connection = data.timelogs
    nodes.push(...(connection?.nodes || []))
    hasNextPage = Boolean(connection?.pageInfo?.hasNextPage)
    after = connection?.pageInfo?.endCursor || null
  }

  return nodes
}
