import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

/**
 * Catches render-time errors anywhere below it and shows a calm recovery
 * screen instead of a blank page. Local progress is never touched, so a reload
 * keeps the learner's saved state intact.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : undefined
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a console trace for local debugging; no analytics or network calls.
    console.error("Chords Lab caught a render error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__card">
          <span className="eyebrow">Something went wrong</span>
          <h1>This screen hit a snag.</h1>
          <p>
            Your saved progress is safe in this browser. Reloading usually
            clears it up.
          </p>
          {this.state.message ? (
            <p className="error-boundary__detail">{this.state.message}</p>
          ) : null}
          <div className="error-boundary__actions">
            <button
              className="button"
              type="button"
              onClick={this.handleReload}
            >
              Reload the app
            </button>
            <a className="button button--quiet" href="/">
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
