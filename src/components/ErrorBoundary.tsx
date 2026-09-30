import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GovAsset 360 Uncaught Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="bg-red-500/20 p-4 rounded-2xl border border-red-500/30 mb-4 text-red-400">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                  if ('caches' in window) {
                    caches.keys().then(names => names.forEach(n => caches.delete(n)));
                  }
                } catch {
                  // ignore
                }
                window.location.href = window.location.origin + '/?reload=' + Date.now();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Cache & Reload Portal
            </button>
            <a
              href="https://govasset-360.firebaseapp.com/"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-semibold transition-colors"
            >
              Open via Firebase Mirror Link
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
