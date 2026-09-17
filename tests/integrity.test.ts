import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSpotsFromModules } from '../src/utils/spotGenerator.ts';
import { isAllocatedToBike, reconcileBikeSpots, releaseBikeSpots } from '../src/utils/bicycleIdentity.ts';
import { cacheKey, emptyWorkspace, readWorkspace, workspaceKey, writeWorkspace } from '../src/lib/workspaceCache.ts';
import { getBikeReevaluationInfo } from '../src/utils/reevaluation.ts';
import type { BicycleSpot, CondoModuleConfig, RegisteredBicycle, ResidentAllocation } from '../src/types.ts';

const bike = (id: string, spotId?: string): RegisteredBicycle => ({
  id, spotId, spotNumber: spotId ? 'V-01' : undefined, residentName: 'Ana Silva', apartment: '200', block: 'Bloco A',
  residentPhone: '', brandModel: 'Bike', color: 'Azul', category: 'Urbana', tagNumber: id,
  photoUrl: '', registeredAt: '2026-01-01',
});
const mod = (id: string, spotCount = 1): CondoModuleConfig => ({ id, name: id, spotCount, startNumber: 1, prefix: 'V-', maxWeightKg: 30, hookType: 'Gancho Vertical c/ Apoio de Pneu' });
const occupied = (moduleId: string, bicycleId: string): BicycleSpot => {
  const spot = generateSpotsFromModules([mod(moduleId)])[0];
  return { ...spot, currentAllocation: { id: `allocation-${bicycleId}`, bicycleId, spotId: spot.id,
    residentName: 'Ana Silva', apartment: '200', block: 'Bloco A', residentPhone: '', photoUrl: '',
    allocatedAt: '2026-01-01', startDate: '2026-01-01', concessionType: 'vitalicio',
    bicycle: { brandModel: 'Bike', color: 'Azul', category: 'Urbana', tagNumber: bicycleId },
  } satisfies ResidentAllocation };
};

test('delete: same number in a different module stays occupied', () => {
  const a = occupied('A', 'bike-a'), b = occupied('B', 'bike-b');
  const result = releaseBikeSpots([a, b], bike('bike-a', a.id));
  assert.equal(result[0].currentAllocation, undefined);
  assert.deepEqual(result[1], b);
});

test('delete: authoritative bicycle id prevents releasing another bike via stale spotId', () => {
  const other = occupied('A', 'bike-b');
  assert.equal(isAllocatedToBike(other, bike('bike-a', other.id)), false);
  assert.deepEqual(releaseBikeSpots([other], bike('bike-a', other.id)), [other]);
});

test('legacy deletion only uses exact spotId, never apartment or displayed number', () => {
  const a = occupied('A', 'bike-a'), b = occupied('B', 'bike-b');
  delete a.currentAllocation!.bicycleId;
  delete b.currentAllocation!.bicycleId;
  const result = releaseBikeSpots([a, b], bike('bike-a', a.id));
  assert.equal(result[0].currentAllocation, undefined);
  assert.ok(result[1].currentAllocation);
});

test('regeneration preserves two bikes from the same resident/unit in distinct modules', () => {
  const originals = [occupied('A', 'bike-a'), occupied('B', 'bike-b')];
  const result = generateSpotsFromModules([mod('A'), mod('B')], originals, true);
  assert.deepEqual(result.map((s) => s.currentAllocation?.bicycleId), ['bike-a', 'bike-b']);
  assert.deepEqual(result.map((s) => [s.id, s.floorPlanModuleId, s.qrCodeValue]), originals.map((s) => [s.id, s.floorPlanModuleId, s.qrCodeValue]));
  const catalog = [bike('bike-a', originals[0].id), bike('bike-b', originals[1].id)];
  assert.deepEqual(reconcileBikeSpots(catalog, result).map((b) => b.spotId), originals.map((s) => s.id));
});

test('module reordering, rename and renumbering keep identities and allocations', () => {
  const originals = [occupied('A', 'bike-a'), occupied('B', 'bike-b')];
  const result = generateSpotsFromModules([{ ...mod('B'), name: 'Novo nome', prefix: 'N-', startNumber: 50 }, mod('A')], originals, true);
  assert.equal(result[0].id, originals[1].id);
  assert.equal(result[0].currentAllocation?.bicycleId, 'bike-b');
  assert.equal(result[0].qrCodeValue, originals[1].qrCodeValue);
  assert.equal(result[0].spotNumber, 'N-50');
});

test('variable capacities above 24 are stable across repeated generation and growth', () => {
  const initial = generateSpotsFromModules([mod('A', 30), mod('B', 51)]);
  const result = generateSpotsFromModules([mod('A', 32), mod('B', 51)], initial);
  assert.equal(result.length, 83);
  assert.equal(new Set(result.map((s) => s.id)).size, 83);
  assert.deepEqual(result.slice(0, 30).map((s) => s.id), initial.slice(0, 30).map((s) => s.id));
  assert.deepEqual(generateSpotsFromModules([mod('A', 32), mod('B', 51)], result), result);
});

test('preserve mode refuses to drop an occupied module', () => {
  assert.throws(() => generateSpotsFromModules([mod('A')], [occupied('A', 'a'), occupied('B', 'b')]), /ocupadas/);
});

test('invalid module identities and fractional capacities are rejected', () => {
  assert.throws(() => generateSpotsFromModules([mod('A'), mod('A')]), /única/);
  assert.throws(() => generateSpotsFromModules([mod('A', 1.5)]), /inteiros/);
});

test('legacy numbers resolve only inside their sector', () => {
  const originals = [occupied('A', 'a'), occupied('B', 'b')].map((s) => ({ ...s, floorPlanModuleId: undefined }));
  const result = generateSpotsFromModules([mod('A'), mod('B')], originals);
  assert.deepEqual(result.map((s) => s.currentAllocation?.bicycleId), ['a', 'b']);
});

test('reconciliation refuses duplicate allocations and ignores shared resident names', () => {
  assert.throws(() => reconcileBikeSpots([bike('a')], [occupied('A', 'a'), occupied('B', 'a')]), /ambíguos/);
  assert.equal(reconcileBikeSpots([bike('unallocated')], [occupied('A', 'other')])[0].spotId, undefined);
});

test('an unresolved reevaluation remains due even after a recent inspection', () => {
  const recent = { ...bike('pending'), lastReevaluatedAt: '2026-09-15T12:00:00Z', reevaluationStatus: 'pendente' as const };
  const inactive = { ...recent, id: 'inactive', reevaluationStatus: 'morador_inativo' as const };
  const regular = { ...recent, id: 'regular', reevaluationStatus: 'em_dia' as const };
  assert.equal(getBikeReevaluationInfo(recent, '2026-09-16T12:00:00Z').isDue, true);
  assert.equal(getBikeReevaluationInfo(inactive, '2026-09-16T12:00:00Z').isDue, true);
  assert.equal(getBikeReevaluationInfo(regular, '2026-09-16T12:00:00Z').isDue, false);
  assert.equal(getBikeReevaluationInfo(recent, '2026-09-16T12:00:00Z').statusBadge.label, 'Averiguação pendente');
});

const cloud = { isCloudMode: true, isVisitor: false, activeCondominiumId: 'condo-a', userId: 'user-a' };
const demo = { ...emptyWorkspace(), config: { ...emptyWorkspace().config, condominiumName: 'Demo' } };
function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, values };
}

test('cache is isolated across condominiums and users', () => {
  const storage = memoryStorage();
  const privateData = { ...emptyWorkspace(), registeredBikes: [bike('private')] };
  writeWorkspace(cloud, privateData, storage);
  assert.equal(readWorkspace(cloud, demo, storage).registeredBikes[0].id, 'private');
  assert.deepEqual(readWorkspace({ ...cloud, activeCondominiumId: 'condo-b' }, demo, storage), emptyWorkspace());
  assert.deepEqual(readWorkspace({ ...cloud, userId: 'user-b' }, demo, storage), emptyWorkspace());
});

test('visitor never reads private cache or writes a snapshot, even with a session present', () => {
  const visitor = { ...cloud, isVisitor: true };
  const forbiddenStorage = { getItem: () => { throw new Error('private cache read'); }, setItem: () => { throw new Error('visitor write'); } };
  assert.deepEqual(readWorkspace(visitor, demo, forbiddenStorage), demo);
  writeWorkspace(visitor, emptyWorkspace(), forbiddenStorage);
  assert.equal(cacheKey(visitor), null);
});

test('unscoped legacy data is preserved but never adopted by a cloud account', () => {
  const storage = memoryStorage();
  const old = { ...emptyWorkspace(), registeredBikes: [bike('old-private')] };
  storage.setItem('condo_bike_config_v1', JSON.stringify(old.config));
  storage.setItem('condo_bike_spots_v1', JSON.stringify(old.spots));
  storage.setItem('condo_registered_bikes_v1', JSON.stringify(old.registeredBikes));
  storage.setItem('condo_bike_logs_v1', JSON.stringify(old.logs));
  assert.deepEqual(readWorkspace(cloud, demo, storage), emptyWorkspace());
  assert.deepEqual(readWorkspace({ isCloudMode: false, isVisitor: false }, demo, storage), JSON.parse(JSON.stringify(old)));
  assert.ok(storage.getItem('condo_registered_bikes_v1')?.includes('old-private'));
});

test('empty cloud workspace remains empty after reopening', () => {
  const storage = memoryStorage();
  writeWorkspace(cloud, emptyWorkspace(), storage);
  assert.deepEqual(readWorkspace(cloud, demo, storage), emptyWorkspace());
});

test('cache with mismatching owner is not loaded, and context changes reset the workspace key', () => {
  const storage = memoryStorage();
  storage.setItem(cacheKey(cloud)!, JSON.stringify({ scope: 'wrong', snapshot: demo }));
  assert.deepEqual(readWorkspace(cloud, demo, storage), emptyWorkspace());
  assert.notEqual(workspaceKey(cloud), workspaceKey({ ...cloud, isVisitor: true }));
  assert.notEqual(workspaceKey(cloud), workspaceKey({ ...cloud, activeCondominiumId: 'other' }));
});
