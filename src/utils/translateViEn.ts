/**
 * Client-side VI ↔ EN via MyMemory (free tier, no API key).
 * Used on Staff Email page when the user toggles interface language.
 */

const VIET_CHARS_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/

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
      /** Vercel `api/staff-app-translate-proxy.js` forwards query → MyMemory. */
      url = `${window.location.origin}/api/staff-app-translate-proxy?${params}`
    }
    let res = await fetch(url, { signal, credentials: 'omit' })
    /** `vite preview` / static hosts have no `/api/` proxy → retry upstream */
    if (res.status === 404 && url.includes('/api/staff-app-translate-proxy')) {
      const fallback = `https://api.mymemory.translated.net/get?${params}`
      res = await fetch(fallback, { signal, credentials: 'omit' })
    }
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
