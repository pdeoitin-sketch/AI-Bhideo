import React from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, Home } from 'lucide-react';

/**
 * Catches any render/effect error thrown below it.
 *
 * Without an error boundary a single exception anywhere in the tree unmounts
 * the whole React root — the user is left staring at an empty white page with
 * no clue what happened. This shows a readable message instead, and lets the
 * user retry in place.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the details available for the user and for the console.
    // eslint-disable-next-line no-console
    console.error('[AI-Bhideo] Unhandled UI error:', error, info);
    this.setState({ info });
  }

  handleReset = () => {
    this.setState({ error: null, info: null, showDetails: false });
    if (this.props.onReset) this.props.onReset();
  };

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    const { error, info, showDetails } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center p-6">
        <div className="glass-panel max-w-2xl w-full rounded-3xl border border-rose-500/30 p-8 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-display font-bold text-white mb-2">
            {this.props.title || 'Something went wrong'}
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            {this.props.description ||
              'Part of the studio hit an unexpected error. The rest of the page is still usable — you can retry this section or reload the app.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-sm font-semibold transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2.5 rounded-xl bg-dark-900 border border-white/10 hover:border-white/25 text-slate-200 text-sm font-semibold transition-all flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Reload app
            </button>
          </div>

          <button
            onClick={() => this.setState({ showDetails: !showDetails })}
            className="mt-6 text-[11px] font-mono text-slate-500 hover:text-slate-300 inline-flex items-center gap-1 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            Technical details
          </button>

          {showDetails && (
            <pre className="mt-3 p-3 max-h-56 overflow-auto rounded-xl bg-dark-950 border border-white/10 text-left text-[11px] font-mono text-rose-300 whitespace-pre-wrap">
              {String(error?.stack || error?.message || error)}
              {info?.componentStack ? `\n${info.componentStack}` : ''}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
