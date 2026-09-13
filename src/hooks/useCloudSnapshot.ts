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
  const snapshot = useMemo<CloudSnapshot>(() => ({ config, spots, registeredBikes, logs }), [config, spots, registeredBikes, logs]);

  const persistSnapshot = useCallback(async (payload: CloudSnapshot, expectedVersion: number | null) => {
    if (!supabase || !condominiumId || !userId) return false;
    const { data, error } = await supabase.rpc('save_condominium_snapshot', {
      p_condominium_id: condominiumId,
      p_payload: payload,
      p_expected_version: expectedVersion,
    });
    if (error) throw error;
    const saved = Array.isArray(data) ? data[0] : data;
    versionRef.current = Number(saved?.version ?? expectedVersion ?? 1);
    await removeQueuedSnapshot(condominiumId);
    setPendingChanges(0);
    setSyncState('synced');
    return true;
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
  }, [condominiumId]);

  useEffect(() => {
    if (!supabase || !condominiumId) return;
    let active = true;
    setReady(false);
    lastSerialized.current = null;
    versionRef.current = null;

    const load = async () => {
      const queued = await getQueuedSnapshot(condominiumId);
      if (queued && active) {
        setPendingChanges(1);
        setSyncState(queued.status === 'conflict' ? 'conflict' : isOnline() ? 'queued' : 'offline');
      }
      const { data, error } = await supabase
        .from('condominium_snapshots')
        .select('payload, version')
        .eq('condominium_id', condominiumId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setReady(true);
        setSyncState(isOnline() ? 'error' : 'offline');
        if (isOnline()) onError('Não foi possível carregar os dados atuais na nuvem. O modo local continua disponível.');
        return;
      }
      const payload = data?.payload as Partial<CloudSnapshot> | undefined;
      if (payload && payload.config && Array.isArray(payload.spots) && Array.isArray(payload.registeredBikes) && Array.isArray(payload.logs)) {
        onLoad(payload as CloudSnapshot);
        lastSerialized.current = JSON.stringify(payload);
      }
      versionRef.current = typeof data?.version === 'number' ? data.version : null;
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
      if (!isOnline()) {
        await queueCurrentSnapshot(snapshot, 'offline');
        lastSerialized.current = serialized;
        return;
      }
      setSyncState('syncing');
      try {
        await persistSnapshot(snapshot, versionRef.current);
        lastSerialized.current = serialized;
      } catch (error) {
        const cloudError = error as { code?: string; message?: string };
        await queueCurrentSnapshot(snapshot);
        lastSerialized.current = serialized;
        if (isConflict(cloudError)) {
          await markSnapshotConflict(condominiumId, 'Outra pessoa atualizou este condomínio antes da sua alteração.');
          setSyncState('conflict');
          onError('Há uma alteração concorrente na nuvem. Seus dados estão guardados neste aparelho e precisam de revisão antes de enviar.');
        } else {
          onError('Alteração guardada neste aparelho. Ela será enviada automaticamente quando a conexão voltar.');
        }
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [condominiumId, onError, persistSnapshot, queueCurrentSnapshot, ready, snapshot, userId]);

  useEffect(() => {
    if (!supabase || !condominiumId || !userId || !ready) return;
    const flushQueue = async () => {
      if (!isOnline()) return;
      const queued = await getQueuedSnapshot(condominiumId);
      if (!queued || queued.status === 'conflict') return;
      setSyncState('syncing');
      try {
        await persistSnapshot(queued.payload as CloudSnapshot, queued.expectedVersion);
        lastSerialized.current = JSON.stringify(queued.payload);
      } catch (error) {
        const cloudError = error as { code?: string; message?: string };
        if (isConflict(cloudError)) {
          await markSnapshotConflict(condominiumId, 'Outra pessoa atualizou este condomínio antes da sua alteração.');
          setSyncState('conflict');
          onError('Existe uma alteração concorrente aguardando revisão.');
        } else {
          setSyncState('queued');
        }
      }
    };
    const handleOnline = () => { void flushQueue(); };
    window.addEventListener('online', handleOnline);
    void flushQueue();
    return () => window.removeEventListener('online', handleOnline);
  }, [condominiumId, onError, persistSnapshot, ready, userId]);

  return { cloudReady: ready, syncState, pendingChanges };
}
