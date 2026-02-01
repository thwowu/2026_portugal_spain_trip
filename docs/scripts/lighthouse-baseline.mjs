import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'

const HOST = '127.0.0.1'
const PORT = 4173

const ROUTES = [
  { id: 'itinerary', path: '/itinerary' },
  { id: 'transport', path: '/transport' },
  { id: 'stays', path: '/stays' },
  { id: 'attractions', path: '/attractions' },
]

function waitForHttpOk(url, timeoutMs = 60_000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) return resolve()
        if (Date.now() - started > timeoutMs) return reject(new Error(`Timeout waiting for ${url} (${res.statusCode})`))
        setTimeout(tick, 500)
      })
      req.on('error', () => {
        if (Date.now() - started > timeoutMs) return reject(new Error(`Timeout waiting for ${url}`))
        setTimeout(tick, 500)
      })
    }
    tick()
  })
}

async function main() {
  const baseUrl = `http://${HOST}:${PORT}`
  const outDir = path.join(process.cwd(), 'tests', 'lighthouse-output')
  fs.mkdirSync(outDir, { recursive: true })

  // Reuse an existing preview server if one is already running.
  /** @type {import('node:child_process').ChildProcess | null} */
  let server = null
  try {
    await waitForHttpOk(baseUrl, 1200)
  } catch {
    // Start preview server (build should already be done by the caller script).
    server = spawn('npm', ['run', 'preview', '--', '--host', HOST, '--port', String(PORT), '--strictPort'], {
      stdio: 'inherit',
      env: process.env,
    })
    await waitForHttpOk(baseUrl, 90_000)
  }

  try {
    const chrome = await launch({
      chromeFlags: ['--headless=new', '--disable-gpu', '--no-sandbox'],
    })

    try {
      for (const r of ROUTES) {
        const url = `${baseUrl}${r.path}`
        const result = await lighthouse(
          url,
          {
            port: chrome.port,
            output: ['html', 'json'],
            logLevel: 'warn',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          },
          // Keep defaults; this is a baseline, not a lab-perfect setup.
        )

        const [reportHtml, reportJson] = Array.isArray(result.report) ? result.report : [result.report]
        fs.writeFileSync(path.join(outDir, `${r.id}.html`), reportHtml)
        fs.writeFileSync(path.join(outDir, `${r.id}.json`), reportJson)
      }
    } finally {
      await chrome.kill()
    }
  } finally {
    server?.kill('SIGTERM')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

