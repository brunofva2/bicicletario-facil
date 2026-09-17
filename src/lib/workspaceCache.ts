import type { CloudSnapshot } from '../hooks/useCloudSnapshot';

export interface WorkspaceContext {
  isVisitor: boolean;
  isCloudMode: boolean;
  userId?: string | null;
  activeCondominiumId?: string | null;
}

export function workspaceKey(context: WorkspaceContext): string {
  if (context.isVisitor) return 'visitor';
  if (!context.isCloudMode) return 'local';
  return JSON.stringify(['cloud', context.activeCondominiumId ?? null, context.userId ?? null]);
}

export function cacheKey(context: WorkspaceContext): string | null {
  if (context.isVisitor || (context.isCloudMode && (!context.activeCondominiumId || !context.userId))) return null;
  return `bicicletario:workspace:v2:${workspaceKey(context)}`;
}

export function emptyWorkspace(): CloudSnapshot {
  return {
    config: { condominiumName: 'Condomínio', idleDaysThreshold: 30, expiryWarningDays: 15,
      totalSuspendedHooks: 0, sectorPhotos: {}, sectorFloorPlans: {}, modules: [], customSectors: [] },
    spots: [], registeredBikes: [], logs: [],
  };
}

function isSnapshot(value: unknown): value is CloudSnapshot {
  const snapshot = value as Partial<CloudSnapshot> | null;
  return Boolean(snapshot?.config && typeof snapshot.config.condominiumName === 'string'
    && Array.isArray(snapshot.spots) && Array.isArray(snapshot.registeredBikes) && Array.isArray(snapshot.logs));
}

export function readWorkspace(context: WorkspaceContext, demo: CloudSnapshot, storage: Pick<Storage, 'getItem'>): CloudSnapshot {
  if (context.isVisitor) return structuredClone(demo);
  const fallback = context.isCloudMode ? emptyWorkspace() : structuredClone(demo);
  try {
    const key = cacheKey(context);
    const saved = key ? storage.getItem(key) : null;
    if (saved) {
      const envelope = JSON.parse(saved);
      if (envelope.scope === workspaceKey(context) && isSnapshot(envelope.snapshot)) return envelope.snapshot;
    }
    // Old unscoped data has no proof of ownership: never import it into a cloud account.
    // Preserve the old keys for explicit recovery, and support the original local-only workspace.
    if (!context.isCloudMode) {
      const legacy = {
        config: JSON.parse(storage.getItem('condo_bike_config_v1') || 'null'),
        spots: JSON.parse(storage.getItem('condo_bike_spots_v1') || 'null'),
        registeredBikes: JSON.parse(storage.getItem('condo_registered_bikes_v1') || 'null'),
        logs: JSON.parse(storage.getItem('condo_bike_logs_v1') || 'null'),
      };
      if (isSnapshot(legacy)) return legacy;
    }
  } catch { /* Corrupt cache must not make data from another workspace a fallback. */ }
  return fallback;
}

export function writeWorkspace(context: WorkspaceContext, snapshot: CloudSnapshot, storage: Pick<Storage, 'setItem'>): void {
  const key = cacheKey(context);
  if (key) storage.setItem(key, JSON.stringify({ scope: workspaceKey(context), snapshot }));
}
