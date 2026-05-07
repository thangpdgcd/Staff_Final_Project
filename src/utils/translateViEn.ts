/**
 * Client-side VI ↔ EN via MyMemory (free tier, no API key).
 * Used on Staff Email page when the user toggles interface language.
 */

const VIET_CHARS_RE =
  /[\u00E0\u00E1\u1EA3\u00E3\u1EA1\u0103\u1EB1\u1EAF\u1EB3\u1EB5\u1EB7\u00E2\u1EA7\u1EA5\u1EA9\u1EAB\u1EAD\u00E8\u00E9\u1EBB\u1EBD\u1EB9\u00EA\u1EC1\u1EBF\u1EC3\u1EC5\u1EC7\u00EC\u00ED\u1EC9\u0129\u1ECB\u00F2\u00F3\u1ECF\u00F5\u1ECD\u00F4\u1ED3\u1ED1\u1ED5\u1ED7\u1ED9\u01A1\u1EDD\u1EDB\u1EDF\u1EE1\u1EE3\u00F9\u00FA\u1EE7\u0169\u1EE5\u01B0\u1EEB\u1EE9\u1EED\u1EEF\u1EF1\u1EF3\u00FD\u1EF7\u1EF9\u1EF5\u0111\u0110]/

const MAX_Q = 450

type MyMemoryJson = {
  responseStatus?: number
  responseDetails?: string
  quotaFinished?: boolean
  responseData?: { translatedText?: string }
}

const chunkText = (s: string): string[] => {
  const t = s.trim()
  if (!t) return []
  if (t.length <= MAX_Q) return [t]
  const parts: string[] = []
  let rest = t
  while (rest.length) {
    if (rest.length <= MAX_Q) {
      parts.push(rest)
      break
    }
    let cut = rest.lastIndexOf('\n', MAX_Q)
    if (cut < MAX_Q * 0.45) cut = rest.lastIndexOf('. ', MAX_Q)
    if (cut < MAX_Q * 0.45) cut = MAX_Q
    parts.push(rest.slice(0, cut))
    rest = rest.slice(cut).trimStart()
  }
  return parts
}

export async function translateViEn(
  text: string,
  from: 'vi' | 'en',
  to: 'vi' | 'en',
  signal?: AbortSignal,
): Promise<string> {
  if (!text.trim() || from === to) return text
  const langpair = `${from}|${to}`
  const chunks = chunkText(text)
  const out: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const params = new URLSearchParams({
      q: chunks[i],
      langpair,
    })
    let url: string
    if (typeof window === 'undefined') {
      url = `https://api.mymemory.translated.net/get?${params}`
    } else if (import.meta.env.DEV) {
      /** Vite proxies `/mymemory-proxy/get` → MyMemory `/get` (same-origin, fewer blockers). */
      url = `${window.location.origin}/mymemory-proxy/get?${params}`
    } else {
      /** Production: call MyMemory directly (no serverless `/api/*` proxy in this repo). */
      url = `https://api.mymemory.translated.net/get?${params}`
    }
    let res = await fetch(url, { signal, credentials: 'omit' })
    if (!res.ok) throw new Error(`translate_http_${res.status}`)
    const data = (await res.json()) as MyMemoryJson
    const st = data.responseStatus
    if (st != null && st !== 200) {
      const detail = String(data.responseDetails ?? '').trim() || String(st)
      throw new Error(
        data.quotaFinished ? `translate_quota_${detail}` : `translate_apistatus_${detail}`,
      )
    }
    const tr = data.responseData?.translatedText
    if (typeof tr !== 'string' || !tr) throw new Error('translate_bad_response')
    out.push(tr)
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 120))
    }
  }
  return out.join('')
}

/**
 * Align draft text with the **new** UI language.
 * - Switching to EN: if text has Vietnamese diacritics → vi→en (works for mixed too).
 * - Switching to VI: only translate clear English (Latin, no Vietnamese marks); leave Vietnamese drafts as-is.
 */
export async function translateFieldTowardUiLang(
  text: string,
  targetUi: 'vi' | 'en',
  signal?: AbortSignal,
): Promise<string> {
  const raw = String(text ?? '')
  const t = raw.trim()
  if (!t) return raw
  const hasVi = VIET_CHARS_RE.test(t)
  const hasEn = /[A-Za-z]{2,}/.test(t)

  if (targetUi === 'en') {
    if (!hasVi) return raw
    return translateViEn(t, 'vi', 'en', signal)
  }

  if (hasVi) return raw
  if (hasEn) return translateViEn(t, 'en', 'vi', signal)
  return raw
}
