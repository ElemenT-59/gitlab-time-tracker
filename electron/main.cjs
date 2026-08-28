const { app, BrowserWindow } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')

const DIST_DIR = path.join(__dirname, '..', 'dist')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
}

// Same forwarding logic as the Vite dev-server proxy (vite.config.js) — kept
// separate on purpose since this runs inside the packaged Electron app,
// which has no Vite dev server at all.
function handleProxyRequest(req, res) {
  let raw = ''
  req.on('data', (chunk) => {
    raw += chunk
  })
  req.on('end', async () => {
    try {
      const { gitlabUrl, token, query, variables } = JSON.parse(raw || '{}')

      if (!gitlabUrl || !token || !query) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'gitlabUrl, token and query are required' }))
        return
      }

      let base
      try {
        base = new URL(gitlabUrl)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
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
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
      res.end(text)
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: `Не удалось связаться с GitLab: ${err?.message || err}` }))
    }
  })
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  const filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath)

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: any unknown path serves index.html
      fs.readFile(path.join(DIST_DIR, 'index.html'), (fallbackErr, fallbackData) => {
        if (fallbackErr) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(fallbackData)
      })
      return
    }
    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
    res.end(data)
  })
}

// Chromium scopes localStorage per-origin (host + port). If we let the OS
// assign a random port on every launch, the renderer's origin changes each
// time and settings saved to localStorage on the previous launch become
// unreachable — the app looks like it "forgot" the GitLab connection. Using
// a fixed port keeps the origin stable across launches so localStorage
// persists. Fall back to a random port only if that fixed port is taken
// (e.g. by another instance) — persistence degrades for that one run, but
// the app still works.
const PREFERRED_PORT = 47823

// On macOS, clicking the window's close button quits the window but not the
// app (see window-all-closed below) — the process, and this server, keep
// running in the Dock. Clicking the Dock icon again fires `activate`, which
// used to call startServer() a second time; that tried to rebind
// PREFERRED_PORT, failed because the still-running server already held it,
// and fell back to a random port — a new origin with no access to the
// localStorage settings saved under the original one. Caching the promise
// makes startServer() a singleton for the process lifetime: activate reuses
// the same server/port instead of racing a second one into existence.
let serverPromise = null

function startServer() {
  if (serverPromise) return serverPromise

  const requestHandler = (req, res) => {
    if (req.method === 'POST' && req.url.startsWith('/api/proxy')) {
      handleProxyRequest(req, res)
      return
    }
    serveStatic(req, res)
  }

  serverPromise = new Promise((resolve) => {
    const server = http.createServer(requestHandler)
    server.once('error', () => {
      const fallback = http.createServer(requestHandler)
      fallback.listen(0, '127.0.0.1', () => {
        resolve(fallback.address().port)
      })
    })
    server.listen(PREFERRED_PORT, '127.0.0.1', () => {
      resolve(server.address().port)
    })
  })

  return serverPromise
}

let mainWindow

async function createWindow() {
  const port = await startServer()

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 760,
    minHeight: 560,
    title: 'GitLab Time Tracker',
    backgroundColor: '#f9f9f7',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(`http://127.0.0.1:${port}`)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
