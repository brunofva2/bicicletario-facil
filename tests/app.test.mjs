import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React, { act } from 'react';
import { Window } from 'happy-dom';
import { loadSource } from './load-source.mjs';

test('App drops private state/forms on tenant switch and blocks visitor mutations', async () => {
  const window = new Window({ url: 'http://localhost' });
  Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage,
    HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('react-dom/client');
  const cache = loadSource(new URL('../src/lib/workspaceCache.ts', import.meta.url));
  const bike = { id: 'private-a', residentName: 'Ana', apartment: '200', block: 'A', residentPhone: '',
    brandModel: 'Bike', color: 'Azul', category: 'Urbana', photoUrl: '', tagNumber: 'a', registeredAt: '2026-01-01' };
  const occupied = { id: 'spot-a', spotNumber: 'V-01', sector: 'A', wallPosition: 1, maxWeightKg: 30,
    hookType: 'Gancho Vertical c/ Apoio de Pneu', qrCodeValue: 'qr', currentAllocation: { id: 'alloc-a',
      spotId: 'spot-a', bicycleId: bike.id, residentName: bike.residentName, apartment: bike.apartment,
      block: bike.block, residentPhone: '', concessionType: 'vitalicio', startDate: '2026-01-01',
      bicycle: { brandModel: 'Bike', color: 'Azul', category: 'Urbana', tagNumber: 'a' }, photoUrl: '', allocatedAt: '2026-01-01' } };
  bike.spotId = occupied.id;
  bike.spotNumber = occupied.spotNumber;
  const demo = { ...cache.emptyWorkspace(), registeredBikes: [{ ...bike, id: 'demo' }] };
  let auth = { isCloudMode: true, isVisitor: false, userId: 'u1', activeCondominiumId: 'condo-a',
    effectiveRole: 'syndic', profile: { role: 'syndic' }, isSupportMode: false, signOut() {} };
  cache.writeWorkspace(auth, { ...demo, spots: [occupied], registeredBikes: [bike] }, localStorage);
  const captured = {}, cloudCalls = [], mounted = new Set();
  const overrides = {
    './auth/AuthGate': { useAuth: () => auth }, './lib/supabase': { supabase: null },
    './hooks/useCloudSnapshot': { useCloudSnapshot: (props) => { cloudCalls.push(props); return { cloudReady: true, syncState: 'synced', pendingChanges: 0 }; } },
    './lib/operations': { assignBicycleToSpot: async () => {}, releaseSpotAllocation: async () => { throw new Error('concurrency'); },
      updateSpotConcession: async () => {}, registerSpotUsage: async () => {}, archiveBicycle: async () => {} },
    './mockData': { DEFAULT_CONFIG: demo.config, INITIAL_SPOTS: [], INITIAL_LOGS: [], SAMPLE_BIKE_PHOTOS: ['sample.png'] },
    './mockBikes': { INITIAL_REGISTERED_BIKES: demo.registeredBikes },
  };
  const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  for (const match of source.matchAll(/import \{ ([^}]+) \} from '(\.\/components\/[^']+)';/g)) {
    overrides[match[2]] = Object.fromEntries(match[1].split(',').map(name => name.trim()).map(name =>
      [name, name === 'TOUR_STEPS' ? [] : (props) => {
        captured[name] = props;
        React.useEffect(() => { mounted.add(name); return () => { mounted.delete(name); }; }, []);
        return null;
      }]));
  }
  const { default: App } = loadSource(new URL('../src/App.tsx', import.meta.url), overrides);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(App)));
    assert.equal(captured.DashboardView.bikes[0].id, 'private-a');
    await act(async () => captured.DesktopNav.onTabChange('map'));
    await act(async () => captured.SpotMap.onSelectSpot(captured.SpotMap.spots[0]));
    await act(async () => captured.SpotDetailDrawer.onReleaseSpot(captured.SpotMap.spots[0]));
    assert.ok(captured.SpotMap.spots[0].currentAllocation, 'failed RPC must not release local state');
    await act(async () => captured.DesktopNav.onTabChange('dashboard'));
    await act(async () => captured.DashboardView.onOpenBike(bike));
    assert.equal(mounted.has('BikeRegisterModal'), true);
    auth = { ...auth, activeCondominiumId: 'condo-b' };
    await act(async () => root.render(React.createElement(App)));
    assert.deepEqual(captured.DashboardView.bikes, []);
    assert.equal(mounted.has('BikeRegisterModal'), false);
    auth = { ...auth, isVisitor: true };
    await act(async () => root.render(React.createElement(App)));
    assert.equal(captured.DashboardView.bikes[0].id, 'demo');
    assert.equal(cloudCalls.at(-1).condominiumId, null);
    assert.equal(cloudCalls.at(-1).userId, null);
    const stored = JSON.stringify(Object.entries(localStorage));
    await act(async () => captured.SpotDetailDrawer.onRegisterUsage({ id: 'a', spotNumber: 'V-01' }));
    assert.deepEqual(captured.DashboardView.logs, []);
    assert.equal(JSON.stringify(Object.entries(localStorage)), stored);
    assert.equal(captured.SpotDetailDrawer.readOnly, true);
    await act(async () => captured.DesktopNav.onTabChange('bikes'));
    await act(async () => captured.BikeCatalogView.onOpenReportModal(demo.registeredBikes[0]));
    assert.equal(captured.BikeReportModal.readOnly, true);
  } finally {
    await act(async () => root.unmount());
    await window.happyDOM.close();
  }
});
