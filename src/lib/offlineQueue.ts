export type OfflineSyncState = 'synced' | 'offline' | 'queued' | 'syncing' | 'conflict' | 'error';

export interface SnapshotQueueEntry {
  id: string;
  condominiumId: string;
  payload: unknown;
  expectedVersion: number | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  status: 'queued' | 'conflict';
  message?: string;
}

const DB_NAME = 'bicicletario-facil-offline';
const STORE_NAME = 'snapshot-queue';
const DB_VERSION = 1;

function entryId(condominiumId: string) {
  return `snapshot:${condominiumId}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento offline.'));
  });
}

async function getEntry(condominiumId: string): Promise<SnapshotQueueEntry | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(entryId(condominiumId));
    request.onsuccess = () => resolve((request.result as SnapshotQueueEntry | undefined) ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function queueSnapshot(input: Omit<SnapshotQueueEntry, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'revision'>) {
  if (typeof indexedDB === 'undefined') return null;
  const existing = await getEntry(input.condominiumId);
  const now = new Date().toISOString();
  // Mantém o conflito aberto, mas guarda a versão local mais recente para que
  // nenhuma ação feita depois do alerta se perca ao fechar o aplicativo.
  if (existing?.status === 'conflict') {
    const conflictEntry: SnapshotQueueEntry = {
      ...existing,
      payload: input.payload,
      revision: (existing.revision ?? 0) + 1,
      updatedAt: now,
    };
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(conflictEntry);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
    return conflictEntry;
  }

  const entry: SnapshotQueueEntry = {
    id: entryId(input.condominiumId),
    condominiumId: input.condominiumId,
    payload: input.payload,
    expectedVersion: input.expectedVersion,
    revision: (existing?.revision ?? 0) + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    status: 'queued',
  };
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
  return entry;
}

export async function removeQueuedSnapshot(condominiumId: string, expectedRevision?: number) {
  if (typeof indexedDB === 'undefined') return false;
  const db = await openDatabase();
  return new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(entryId(condominiumId));
    let removed = false;
    request.onsuccess = () => {
      const current = request.result as SnapshotQueueEntry | undefined;
      if (!current) return;
      if (expectedRevision !== undefined && (current.revision ?? 0) !== expectedRevision) return;
      store.delete(entryId(condominiumId));
      removed = true;
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => { db.close(); resolve(removed); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function markSnapshotConflict(condominiumId: string, message: string) {
  const current = await getEntry(condominiumId);
  if (!current || typeof indexedDB === 'undefined') return current;
  const entry = { ...current, status: 'conflict' as const, message, updatedAt: new Date().toISOString() };
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
  return entry;
}

export async function getQueuedSnapshot(condominiumId: string) {
  return getEntry(condominiumId);
}
