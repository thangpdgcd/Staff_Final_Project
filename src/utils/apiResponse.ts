const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

export const unwrapApiData = (payload: unknown): unknown => {
  if (!isObject(payload)) return payload
  let current: unknown = payload
  while (isObject(current as Record<string, unknown>) && Object.prototype.hasOwnProperty.call(current, 'data')) {
    const next = (current as Record<string, unknown>).data
    if (next == null) break
    current = next
  }
  return current
}

export const normalizeList = (
  payload: unknown,
  keys: string[] = ['items', 'rows', 'messages', 'users', 'data'],
): { items: unknown[]; total: number } => {
  const data = unwrapApiData(payload)
  if (Array.isArray(data)) return { items: data, total: data.length }
  if (!isObject(data)) return { items: [], total: 0 }

  for (const key of keys) {
    const candidate = data[key]
    if (Array.isArray(candidate)) {
      const total = Number(data.total ?? data.count ?? candidate.length ?? 0)
      return { items: candidate, total }
    }
    if (isObject(candidate)) {
      for (const nestedKey of keys) {
        const nested = candidate[nestedKey]
        if (Array.isArray(nested)) {
          const total = Number(
            candidate.total ?? candidate.count ?? data.total ?? data.count ?? nested.length ?? 0,
          )
          return { items: nested, total }
        }
      }
    }
  }
  return { items: [], total: Number(data.total ?? data.count ?? 0) }
}
