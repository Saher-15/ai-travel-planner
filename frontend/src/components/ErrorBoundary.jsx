import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
            ⚠️
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              Something went wrong
            </div>
            <div className="mt-1 text-sm text-slate-500">
              This page ran into an unexpected error.
            </div>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
