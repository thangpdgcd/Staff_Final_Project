import { useCallback, useEffect, useRef, useState } from 'react'

type AsyncFn<Args extends unknown[], R> = (...args: Args) => Promise<R>

/**
 * Small production-friendly helper:
 * - stable async callback with loading/error
 * - avoids setting state after unmount
 */
export const useAsyncCallback = <Args extends unknown[], R>(
  fn: AsyncFn<Args, R>,
  deps: unknown[] = [],
) => {
  const mountedRef = useRef(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(
    async (...args: Args) => {
      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }
      try {
        return await fn(...args)
      } catch (e) {
        if (mountedRef.current) setError(e)
        throw e
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
    deps,
  )

  return { run, loading, error }
}

