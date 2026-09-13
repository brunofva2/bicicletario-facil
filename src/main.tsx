import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AuthGate } from './auth/AuthGate.tsx';
import { ThemeProvider } from './theme/ThemeProvider.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthGate><App /></AuthGate>
          </ErrorBoundary>
        </ThemeProvider>
      </StrictMode>,
    );
  } catch (err: unknown) {
    console.error('Fatal initialization error:', err);
    const message = err instanceof Error ? err.stack || err.message : String(err);
    rootElement.innerHTML = `
      <div style="padding: 24px; font-family: sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh;">
        <h2 style="color: #ef4444; margin-top: 0;">Falha de Inicialização</h2>
        <p style="color: #94a3b8;">Ocorreu um erro ao carregar o aplicativo:</p>
        <pre style="background: #1e293b; padding: 16px; border-radius: 8px; color: #fca5a5; overflow: auto; font-size: 13px;">${message}</pre>
        <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 12px;">Recarregar Aplicativo</button>
      </div>
    `;
  }
}
