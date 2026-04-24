import React from 'react'

type Props = {
  children: React.ReactNode
  title?: string
}

type State = { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Keep it visible in devtools for fast triage
    console.error('[staff][ErrorBoundary]', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
        <div className="text-sm font-extrabold">{this.props.title ?? 'Something went wrong'}</div>
        <div className="mt-2 whitespace-pre-wrap text-xs opacity-90">{String(this.state.error?.message ?? this.state.error)}</div>
      </div>
    )
  }
}

