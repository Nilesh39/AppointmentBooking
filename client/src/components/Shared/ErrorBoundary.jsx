import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full glass-panel rounded-3xl p-8 shadow-premium text-center border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={36} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Application Alert</h2>
            <p className="text-sm text-slate-500 mt-2">
              A runtime rendering error occurred in this section of the portal. We have logged this diagnostic detail.
            </p>
            
            {this.state.error && (
              <pre className="mt-4 p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-xl text-left text-[10px] text-red-650 dark:text-red-400 overflow-x-auto max-h-24">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReload}
              className="mt-6 w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <RefreshCw size={14} /> Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
