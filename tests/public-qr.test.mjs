import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSource } from './load-source.mjs';

const routes = loadSource(new URL('../src/utils/publicSpotRoute.ts', import.meta.url));

test('public QR route is recognized before authentication for current and pilot links', () => {
  assert.deepEqual(routes.getPublicSpotReference('?spot=3fda10c2-69a3-4d8b-a078-640f9d53d230'), {
    kind: 'slug', value: '3fda10c2-69a3-4d8b-a078-640f9d53d230',
  });
  assert.deepEqual(routes.getPublicSpotReference('?vagaId=plan-module-a-1'), {
    kind: 'legacy', value: 'plan-module-a-1',
  });
  assert.deepEqual(routes.getPublicSpotReference('?vaga=S-11'), {
    kind: 'legacy', value: 'S-11',
  });
  assert.equal(routes.getPublicSpotReference('?other=value'), null);
});

test('legacy public lookup exposes no resident or unit data and rejects ambiguous identifiers', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/020_public_qr_backward_compatibility.sql', import.meta.url), 'utf8');
  assert.match(sql, /get_public_spot_legacy/);
  assert.match(sql, /where \(select count\(\*\) from candidates\) = 1/);
  assert.match(sql, /grant execute on function public\.get_public_spot_legacy\(text\) to anon, authenticated/);
  assert.doesNotMatch(sql, /resident_name|resident_phone|resident_email|apartment|serial_number/i);
});
