import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryState {
  failed: boolean
}

/**
 * A last line of defence: one broken record or WebGL scene should never turn
 * the whole document into a blank page. Log the real error for the console,
 * then offer a clean reload.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Being Seen / render error', error, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-error">
          <p className="app-error__eyebrow">A disturbance in the signal</p>
          <h1 className="app-error__title">The page could not be rendered.</h1>
          <p className="app-error__note">
            A story or scene hit an unexpected state. Reload to return to the
            sky. If it keeps happening, clear this site's browser data.
          </p>
          <button
            className="app-error__button"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
