import { Component } from 'react';

// Anything thrown while a route renders — a lazy chunk that fails to fetch
// (stale cached entry chunk after a deploy, blocked request, dropped network),
// or a map library that refuses to start — otherwise unmounts the whole tree
// and leaves an empty #root. A blank page gives no hint that reloading helps,
// so catch it here and say so.
export default class RouteErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Route failed to render:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="route-error">
        <p className="route-error-message">This page failed to load.</p>
        <button
          type="button"
          className="route-error-retry"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
