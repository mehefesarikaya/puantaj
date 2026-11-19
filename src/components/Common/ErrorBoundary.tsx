import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uygulama Hatası (ErrorBoundary):', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Uygulama Başlatılırken Bir Sorun Oluştu
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Sayfa yüklenirken beklenmeyen bir hata meydana geldi. Sayfayı yenileyerek veya yerel verileri sıfırlayarak uygulamayı yeniden başlatabilirsiniz.
            </p>

            {this.state.error && (
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl text-left mb-6 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sayfayı Yenile</span>
              </button>

              <button
                onClick={this.handleReset}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition"
              >
                Verileri Sıfırla
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

