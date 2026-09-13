import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('condo_bike_spots_v1');
      localStorage.removeItem('condo_bike_logs_v1');
      localStorage.removeItem('condo_bike_config_v1');
      localStorage.removeItem('condo_registered_bikes_v1');
    } catch {
      // ignore
    }
    try {
      window.location.reload();
    } catch {
      // ignore
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-mono text-white">Falha na Inicialização</h1>
                <p className="text-xs text-slate-400 font-mono">Erro detectado na interface</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto">
              {this.state.error?.message || 'Erro inesperado'}
            </div>

            <p className="text-xs text-slate-300">
              Caso os dados locais armazenados contenham incompatibilidade, você pode recarregar ou restaurar os dados padrões.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recarregar Página</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Restaurar Padrão</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
