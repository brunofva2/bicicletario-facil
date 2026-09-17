import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSource } from './load-source.mjs';

const bicycle = {
  id: 'bike-ap200-2', residentName: 'Ana Silva', apartment: '200', block: 'Bloco A',
  residentPhone: '11999999999', brandModel: 'Caloi', color: 'Azul', category: 'Urbana',
  tagNumber: 'TAG-2', photoUrl: 'bike.png', registeredAt: '2026-01-01T00:00:00.000Z',
};

function operationsWith(rpc) {
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  return loadSource(new URL('../src/lib/operations.ts', import.meta.url), {
    './supabase': { supabase: { rpc } },
  });
}

test('assignment sends stable legacy IDs and completes the request in the same RPC', async () => {
  let call;
  const operations = operationsWith(async (name, args) => { call = { name, args }; return { data: { allocation_id: 'uuid' }, error: null }; });
  await operations.assignBicycleToSpot({ condominiumId: 'condo', spotLegacyId: 'spot-module-a-1', bicycle,
    concessionType: 'determinado', concessionEndDate: '2027-01-01', requestId: 'request-uuid' });
  assert.equal(call.name, 'assign_bicycle_to_spot_by_legacy_id');
  assert.equal(call.args.p_spot_legacy_id, 'spot-module-a-1');
  assert.equal(call.args.p_bicycle.id, 'bike-ap200-2');
  assert.equal(call.args.p_request_id, 'request-uuid');
  assert.equal('p_spot_id' in call.args, false);
  assert.equal('p_bicycle_id' in call.args, false);
});

test('release, concession, usage, archive and request decisions use protected RPCs', async () => {
  const names = [];
  const operations = operationsWith(async (name) => { names.push(name); return { data: {}, error: null }; });
  await operations.releaseSpotAllocation({ condominiumId: 'c', spotLegacyId: 's' });
  await operations.updateSpotConcession({ condominiumId: 'c', spotLegacyId: 's', concessionType: 'vitalicio' });
  await operations.registerSpotUsage({ condominiumId: 'c', spotLegacyId: 's' });
  await operations.archiveBicycle({ condominiumId: 'c', bicycleLegacyId: 'b' });
  await operations.decideOperationalRequest({ condominiumId: 'c', requestId: 'r', action: 'complete' });
  assert.deepEqual(names, ['release_spot_allocation_by_legacy_id', 'update_spot_concession_by_legacy_id',
    'register_spot_usage_by_legacy_id', 'archive_bicycle_by_legacy_id', 'decide_operational_request']);
});

test('public QR identity resolves a stable UUID instead of the visible spot number', async () => {
  let call;
  const operations = operationsWith(async (name, args) => {
    call = { name, args };
    return { data: '3fda10c2-69a3-4d8b-a078-640f9d53d230', error: null };
  });
  const slug = await operations.getSpotPublicSlug({ condominiumId: 'condo', spotLegacyId: 'plan-module-a-1' });
  assert.equal(slug, '3fda10c2-69a3-4d8b-a078-640f9d53d230');
  assert.deepEqual(call, {
    name: 'get_spot_public_slug',
    args: { p_condominium_id: 'condo', p_spot_legacy_id: 'plan-module-a-1' },
  });
});

test('critical cloud commands fail closed while offline', async () => {
  let calls = 0;
  const operations = operationsWith(async () => { calls++; return { data: {}, error: null }; });
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
  await assert.rejects(() => operations.releaseSpotAllocation({ condominiumId: 'c', spotLegacyId: 's' }), /precisa de conexão/);
  assert.equal(calls, 0);
});

test('migration 017 locks rows, atomically decides requests and removes direct mutation policies', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/017_atomic_operational_commands.sql', import.meta.url), 'utf8');
  assert.match(sql, /assign_bicycle_to_spot_by_legacy_id/);
  assert.match(sql, /for update/gi);
  assert.match(sql, /status = 'approved', assigned_spot_id = v_spot\.id/);
  assert.match(sql, /drop policy if exists "managers write allocations in their condominium"/);
  assert.match(sql, /drop policy if exists "managers manage spot requests in their condominium"/);
  assert.match(sql, /revoke all on function public\.assign_bicycle_to_spot\(uuid, uuid, uuid/);
  assert.match(sql, /grant execute on function public\.decide_operational_request/);
});

test('migration 018 normalizes modules and retires replaced spots without erasing history', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/018_spot_lifecycle_and_module_reconciliation.sql', import.meta.url), 'utf8');
  assert.match(sql, /normalize_snapshot_spot_modules/);
  assert.match(sql, /allocation_released_by_structure_change/);
  assert.match(sql, /retired_at = coalesce\(spot\.retired_at, now\(\)\)/);
  assert.match(sql, /where retired_at is null/);
  assert.match(sql, /allocations_require_current_spot/);
  assert.match(sql, /version = version \+ 1/);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.bicycle_spots/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.allocations/i);
});

test('migration 019 exposes only a stable and privacy-limited public spot lookup', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/019_public_spot_qr_identity.sql', import.meta.url), 'utf8');
  assert.match(sql, /get_spot_public_slug/);
  assert.match(sql, /spot\.legacy_id = p_spot_legacy_id/);
  assert.match(sql, /spot\.retired_at is null/g);
  assert.match(sql, /grant execute on function public\.get_public_spot\(uuid\) to anon, authenticated/);
  assert.doesNotMatch(sql, /resident_name|resident_phone|resident_email|apartment|serial_number/i);
});
