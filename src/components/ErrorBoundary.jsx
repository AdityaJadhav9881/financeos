import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleClearCache = async () => {
    try {
      localStorage.clear();
      const dbs = await indexedDB.databases();
      for (const dbInfo of dbs) {
        indexedDB.deleteDatabase(dbInfo.name);
      }
    } catch {}
    window.location.reload();
  };

  handleRestart = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8" style={{ background: '#000000' }}>
          <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0a0a0a]/80 p-8 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-white">Something went wrong</h2>
            <p className="mt-2 text-sm text-zinc-400">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                className="w-full rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                onClick={this.handleRestart}
                type="button"
              >
                Restart App
              </button>
              <button
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                onClick={this.handleClearCache}
                type="button"
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
