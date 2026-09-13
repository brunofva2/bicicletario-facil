import React from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, LoaderCircle, WifiOff } from 'lucide-react';
import { OfflineSyncState } from '../lib/offlineQueue';
import { useOnlineStatus } from '../hooks/usePWAInstall';

interface OfflineIndicatorProps {
  syncState?: OfflineSyncState;
  pendingChanges?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ syncState = 'synced', pendingChanges = 0 }) => {
  const isOnline = useOnlineStatus();
  const hasPending = pendingChanges > 0;

  if (isOnline && !hasPending && syncState === 'synced') return null;

  const conflict = syncState === 'conflict';
  const syncing = syncState === 'syncing';
  const Icon = conflict ? AlertTriangle : syncing ? LoaderCircle : isOnline ? CloudOff : WifiOff;
  const title = conflict
    ? 'Alteração precisa de revisão'
    : syncing
      ? 'Sincronizando alterações'
      : isOnline
        ? `${pendingChanges} alteração${pendingChanges === 1 ? '' : 'ões'} aguardando envio`
        : `${pendingChanges ? `${pendingChanges} alteração${pendingChanges === 1 ? '' : 'ões'} guardada${pendingChanges === 1 ? '' : 's'}` : 'Modo offline'} neste aparelho`;
  const description = conflict
    ? 'Outra pessoa atualizou estes dados. Nada será sobrescrito automaticamente.'
    : syncing
      ? 'Confirmando os dados com a nuvem.'
      : isOnline
        ? 'O app tentará enviar novamente automaticamente.'
        : 'Você pode continuar trabalhando. O envio acontecerá quando a conexão voltar.';

  return (
    <div
      id="pwa-offline-indicator"
      className={`fixed bottom-4 left-4 z-50 flex max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md animate-fadeIn ${
        conflict ? 'border-rose-400/50 bg-rose-950/95 text-rose-50' : 'border-amber-500/50 bg-slate-900/95 text-white'
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${conflict ? 'text-rose-300' : 'text-amber-400'} ${syncing ? 'animate-spin' : ''}`} />
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-0.5 leading-relaxed text-slate-300">{description}</p>
      </div>
      {syncState === 'synced' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
    </div>
  );
};
