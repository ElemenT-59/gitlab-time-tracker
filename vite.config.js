import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite dev/preview server runs in Node, so a same-origin middleware here can
// reach any GitLab instance (gitlab.com or self-hosted) without the browser
// ever making a cross-origin request. The GitLab URL and token are supplied
// per-request by the client (kept only in its localStorage) and forwarded
// straight through — nothing is persisted or logged on this side.
function gitlabProxyPlugin() {
  async function handleProxyRequest(req, res) {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', async () => {
      try {
        const { gitlabUrl, token, query, variables } = JSON.parse(raw || '{}')

        if (!gitlabUrl || !token || !query) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'gitlabUrl, token and query are required' }))
          return
        }

        let base
        try {
          base = new URL(gitlabUrl)
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Некорректный URL GitLab-инстанса' }))
          return
        }

        const target = `${base.origin}${base.pathname.replace(/\/+$/, '')}/api/graphql`

        const upstream = await fetch(target, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query, variables }),
        })

        const text = await upstream.text()
        res.statusCode = upstream.status
        res.setHeader('Content-Type', 'application/json')
        res.end(text)
      } catch (err) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: `Не удалось связаться с GitLab: ${err?.message || err}` }))
      }
    })
  }

  return {
    name: 'gitlab-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', handleProxyRequest)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/proxy', handleProxyRequest)
    },
  }
}

export default defineConfig({
  plugins: [react(), gitlabProxyPlugin()],
})
