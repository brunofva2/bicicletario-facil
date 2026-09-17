import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getQueuedSnapshot,
  markSnapshotConflict,
  OfflineSyncState,
  queueSnapshot,
  removeQueuedSnapshot,
} from '../lib/offlineQueue';
import { BicycleSpot, RegisteredBicycle, SystemConfig, UsageLog } from '../types';

export interface CloudSnapshot {
  config: SystemConfig;
  spots: BicycleSpot[];
  registeredBikes: RegisteredBicycle[];
  logs: UsageLog[];
}

interface Options extends CloudSnapshot {
  condominiumId: string | null | undefined;
  userId: string | null | undefined;
  onLoad: (snapshot: CloudSnapshot) => void;
  onError: (message: string) => void;
}

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function isConflict(error: { code?: string; message?: string } | null) {
  return error?.code === '40001' || error?.message?.includes('CONFLITO_DE_SINCRONIZACAO');
}

export function useCloudSnapshot({ condominiumId, userId, onLoad, onError, config, spots, registeredBikes, logs }: Options) {
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<OfflineSyncState>('synced');
  const [pendingChanges, setPendingChanges] = useState(0);
  const lastSerialized = useRef<string | null>(null);
  const versionRef = useRef<number | null>(null);
  const flushPromiseRef = useRef<Promise<void> | null>(null);
  const snapshot = useMemo<CloudSnapshot>(() => ({ config, spots, registeredBikes, logs }), [config, spots, registeredBikes, logs]);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const persistSnapshot = useCallback(async (payload: CloudSnapshot, expectedVersion: number | null) => {
    if (!supabase || !condominiumId || !userId) return false;
    const { data, error } = await supabase.rpc('save_condominium_snapshot', {
      p_condominium_id: condominiumId,
      p_payload: payload,
      p_expected_version: expectedVersion,
    });
    if (error) throw error;
    const saved = Array.isArray(data) ? data[0] : data;
    return Number(saved?.version ?? expectedVersion ?? 1);
  }, [condominiumId, userId]);

  const queueCurrentSnapshot = useCallback(async (payload: CloudSnapshot, status: OfflineSyncState = 'queued') => {
    if (!condominiumId) return;
    const entry = await queueSnapshot({
      condominiumId,
      payload,
      expectedVersion: versionRef.current,
    });
    if (entry?.status === 'conflict') {
      setSyncState('conflict');
      setPendingChanges(1);
      return;
    }
    setSyncState(status);
    setPendingChanges(entry ? 1 : 0);
    return entry;
  }, [condominiumId]);

  const flushQueue = useCallback(() => {
    if (!supabase || !condominiumId || !userId || !isOnline()) return Promise.resolve();
    if (flushPromiseRef.current) return flushPromiseRef.current;

    const run = async () => {
      while (isOnline()) {
        const entry = await getQueuedSnapshot(condominiumId);
        if (!entry) {
          setPendingChanges(0);
          setSyncState('synced');
          return;
        }
        setPendingChanges(1);
        if (entry.status === 'conflict') {
          setSyncState('conflict');
          return;
        }

        setSyncState('syncing');
        try {
          const savedVersion = await persistSnapshot(entry.payload as CloudSnapshot, entry.expectedVersion);
          if (savedVersion === false) return;
          versionRef.current = savedVersion;
          lastSerialized.current = JSON.stringify(entry.payload);

          const removed = await removeQueuedSnapshot(condominiumId, entry.revision ?? 0);
          if (removed) {
            setPendingChanges(0);
            setSyncState('synced');
            return;
          }

          // Uma edição mais nova entrou enquanto o envio estava em andamento.
          // Ela é baseada no estado que acabou de ser confirmado e recebe a
          // nova versão antes da próxima tentativa.
          const newer = await getQueuedSnapshot(condominiumId);
          if (!newer) continue;
          if (newer.status === 'conflict') {
            setSyncState('conflict');
            return;
          }
          await queueSnapshot({
            condominiumId,
            payload: newer.payload,
            expectedVersion: savedVersion,
          });
        } catch (error) {
          const cloudError = error as { code?: string; message?: string };
          if (isConflict(cloudError)) {
            await markSnapshotConflict(condominiumId, 'Outra pessoa atualizou este condomínio antes da sua alteração.');
            setSyncState('conflict');
            setPendingChanges(1);
            onError('Há uma alteração concorrente na nuvem. Seus dados continuam guardados neste aparelho.');
          } else {
            setSyncState(isOnline() ? 'queued' : 'offline');
            setPendingChanges(1);
            if (isOnline()) onError('Alteração guardada neste aparelho. O envio será tentado novamente.');
          }
          return;
        }
      }
      setSyncState('offline');
    };

    const pending = run().finally(() => {
      if (flushPromiseRef.current === pending) flushPromiseRef.current = null;
    });
    flushPromiseRef.current = pending;
    return pending;
  }, [condominiumId, onError, persistSnapshot, userId]);

  useEffect(() => {
    if (!supabase || !condominiumId) return;
    let active = true;
    setReady(false);
    // Opening a workspace is not an edit. Never upload its bootstrap placeholder
    // merely because the cloud read failed or no remote snapshot exists yet.
    lastSerialized.current = JSON.stringify(snapshotRef.current);
    versionRef.current = null;

    const load = async () => {
      const queued = await getQueuedSnapshot(condominiumId);
      const { data, error } = await supabase
        .from('condominium_snapshots')
        .select('payload, version')
        .eq('condominium_id', condominiumId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        if (queued?.payload) {
          onLoad(queued.payload as CloudSnapshot);
          lastSerialized.current = JSON.stringify(queued.payload);
          setPendingChanges(1);
          setSyncState(queued.status === 'conflict' ? 'conflict' : isOnline() ? 'queued' : 'offline');
        }
        setReady(true);
        if (!queued) {
          setSyncState(isOnline() ? 'error' : 'offline');
          if (isOnline()) onError('Não foi possível carregar os dados atuais na nuvem. O modo local continua disponível.');
        }
        return;
      }
      const payload = data?.payload as Partial<CloudSnapshot> | undefined;
      const cloudVersion = typeof data?.version === 'number' ? data.version : null;
      versionRef.current = cloudVersion;

      if (queued?.payload) {
        onLoad(queued.payload as CloudSnapshot);
        lastSerialized.current = JSON.stringify(queued.payload);
        setPendingChanges(1);
        const versionChanged = queued.expectedVersion !== cloudVersion;
        if (queued.status === 'conflict' || versionChanged) {
          if (queued.status !== 'conflict') {
            await markSnapshotConflict(condominiumId, 'A nuvem mudou enquanto este aparelho estava offline.');
          }
          setSyncState('conflict');
        } else {
          setSyncState(isOnline() ? 'queued' : 'offline');
        }
      } else if (payload && payload.config && Array.isArray(payload.spots) && Array.isArray(payload.registeredBikes) && Array.isArray(payload.logs)) {
        onLoad(payload as CloudSnapshot);
        lastSerialized.current = JSON.stringify(payload);
        setPendingChanges(0);
        setSyncState('synced');
      }
      setReady(true);
    };
    void load();
    return () => { active = false; };
  }, [condominiumId, onError, onLoad]);

  useEffect(() => {
    if (!supabase || !condominiumId || !userId || !ready) return;
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSerialized.current) return;

    const timer = window.setTimeout(async () => {
      const entry = await queueCurrentSnapshot(snapshot, isOnline() ? 'queued' : 'offline');
      lastSerialized.current = serialized;
      if (entry?.status !== 'conflict' && isOnline()) void flushQueue();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [condominiumId, flushQueue, queueCurrentSnapshot, ready, snapshot, userId]);

  useEffect(() => {
    if (!supabase || !condominiumId || !userId || !ready) return;
    const handleOnline = () => { void flushQueue(); };
    window.addEventListener('online', handleOnline);
    void flushQueue();
    return () => window.removeEventListener('online', handleOnline);
  }, [condominiumId, flushQueue, ready, userId]);

  const exportPendingChanges = useCallback(async () => {
    if (!condominiumId) return false;
    const queued = await getQueuedSnapshot(condominiumId);
    if (!queued) return false;
    const blob = new Blob([JSON.stringify(queued.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `alteracoes-pendentes-${condominiumId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  }, [condominiumId]);

  const discardPendingAndLoadCloud = useCallback(async () => {
    if (!supabase || !condominiumId || !isOnline()) return false;
    const { data, error } = await supabase
      .from('condominium_snapshots')
      .select('payload, version')
      .eq('condominium_id', condominiumId)
      .maybeSingle();
    if (error) throw error;
    const payload = data?.payload as CloudSnapshot | undefined;
    if (!payload) return false;
    await removeQueuedSnapshot(condominiumId);
    onLoad(payload);
    lastSerialized.current = JSON.stringify(payload);
    versionRef.current = typeof data?.version === 'number' ? data.version : null;
    setPendingChanges(0);
    setSyncState('synced');
    return true;
  }, [condominiumId, onLoad]);

  return { cloudReady: ready, syncState, pendingChanges, exportPendingChanges, discardPendingAndLoadCloud };
}
