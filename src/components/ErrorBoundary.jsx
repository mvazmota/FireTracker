import { Component } from 'react'

/**
 * React 19 still has no hook equivalent for error boundaries, so this stays a
 * class component. It keeps a crash from rendering an empty page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Firepath crashed:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="error-boundary">
        <h1>Something went wrong</h1>
        <p>{String(error?.message || error)}</p>
        <button type="button" onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }
}
