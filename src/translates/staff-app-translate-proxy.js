/**
 * NOTE:
 * This is the former Vercel serverless proxy (`/api/staff-app-translate-proxy`).
 * It was moved under `src/translates/` per project structure cleanup.
 *
 * If you deploy on Vercel and still want same-origin proxying, this file must live in
 * the platform's serverless functions directory (commonly `api/` at repo root).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    res.end('Method Not Allowed')
    return
  }
  const qs =
    typeof req.url === 'string' && req.url.includes('?') ? req.url.slice(req.url.indexOf('?') + 1) : ''
  if (!qs) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'expected q and langpair query params' }))
    return
  }
  const upstream = `https://api.mymemory.translated.net/get?${qs}`
  const r = await fetch(upstream, { headers: { Accept: 'application/json' } })
  const text = await r.text()
  res.statusCode = r.status
  const ct = r.headers.get('content-type')
  if (ct) res.setHeader('Content-Type', ct)
  res.end(text)
}

