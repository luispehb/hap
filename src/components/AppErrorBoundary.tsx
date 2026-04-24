import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught an error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center px-6">
          <div className="max-w-[320px] text-center">
            <p className="text-[32px] font-extrabold text-ink tracking-[-2px]">
              hap
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky ml-1 mb-2" />
            </p>
            <p className="text-ink font-bold text-base mt-6">Something went wrong</p>
            <p className="text-muted text-sm mt-2">The app hit an unexpected error. Reload to recover safely.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 bg-ink text-white text-sm font-bold px-5 py-3 rounded-xl"
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
