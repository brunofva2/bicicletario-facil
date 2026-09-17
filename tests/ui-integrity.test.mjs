import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React, { act } from 'react';
import { Window } from 'happy-dom';
import { loadSource } from './load-source.mjs';

// Execute the real component in a DOM; replace only asset/network dependencies.
function component(file, overrides = {}) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const localRequire = createRequire(new URL(file, import.meta.url));
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(
    (id) => Object.hasOwn(overrides, id) ? overrides[id] : localRequire(id), module, module.exports);
  return module.exports;
}

test('allocation form resets across closing, reopening and changing the target spot', async () => {
  const window = new Window({ url: 'http://localhost' });
  Object.assign(globalThis, { window, document: window.document, HTMLElement: window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('react-dom/client');
  const { AllocateModal } = component('../src/components/AllocateModal.tsx', {
    '../mockData': { SAMPLE_BIKE_PHOTOS: ['sample.png'] }, '../utils/imageUpload': {},
    '../hooks/useModalAccessibility': { useModalAccessibility: () => React.useRef(null) },
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const spot = { id: 'A-1', spotNumber: 'V-01', sector: 'A', maxWeightKg: 30, hookType: 'Gancho' };
  const base = { onClose() {}, onConfirm() {} };
  const render = async (props) => act(async () => root.render(React.createElement(AllocateModal, { ...base, ...props })));
  try {
    await render({ spot: null });
    await render({ spot, initialResident: { apartment: '101', residentName: 'Ana', block: 'A' } });
    assert.ok([...container.querySelectorAll('input')].some(input => input.value === '101'));
    await render({ spot: null });
    await render({ spot: { ...spot, id: 'B-1' }, initialResident: { apartment: '999', residentName: 'Bruno', block: 'B' } });
    const values = [...container.querySelectorAll('input')].map(input => input.value);
    assert.ok(values.includes('999'));
    assert.ok(values.includes('Bruno'));
    assert.ok(!values.includes('101'));
    await render({ spot: { ...spot, id: 'C-1' }, initialResident: { apartment: '203', residentName: 'Carla', block: 'C' } });
    assert.ok([...container.querySelectorAll('input')].some(input => input.value === '203'));
  } finally {
    await act(async () => root.unmount());
    await window.happyDOM.close();
  }
});

test('visitor report cannot send a notification', async () => {
  const window = new Window({ url: 'http://localhost' });
  Object.assign(globalThis, { window, document: window.document, HTMLElement: window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('react-dom/client');
  const { BikeReportModal } = component('../src/components/BikeReportModal.tsx', {
    '../hooks/useModalAccessibility': { useModalAccessibility: () => React.useRef(null) },
  });
  let opened = 0, sent = 0;
  window.open = () => { opened++; return null; };
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(BikeReportModal, {
      readOnly: true, bike: { id: 'bike', residentName: 'Ana', apartment: '200', block: 'A',
        brandModel: 'Bike', color: 'Azul', residentPhone: '11999999999', registeredAt: '2024-01-01' },
      config: { condominiumName: 'Teste' }, onClose() {}, onReportSent() { sent++; },
    })));
    const send = [...container.querySelectorAll('button')].find(button => button.textContent.includes('Enviar'));
    assert.ok(send, 'send action remains visible');
    assert.equal(send.disabled, true);
    await act(async () => send.click());
    assert.equal(opened, 0);
    assert.equal(sent, 0);
  } finally {
    await act(async () => root.unmount());
    await window.happyDOM.close();
  }
});

test('a failed initial cloud read never uploads or queues an empty bootstrap workspace', async () => {
  const window = new Window({ url: 'http://localhost' });
  Object.assign(globalThis, { window, document: window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('react-dom/client');
  let writes = 0;
  const query = { select() { return this; }, eq() { return this; },
    async maybeSingle() { return { data: null, error: { message: 'offline' } }; } };
  const { useCloudSnapshot } = loadSource(new URL('../src/hooks/useCloudSnapshot.ts', import.meta.url), {
    '../lib/supabase': { supabase: { from: () => query, async rpc() { writes++; return {}; } } },
    '../lib/offlineQueue': { async getQueuedSnapshot() { return null; },
      async queueSnapshot() { writes++; }, async removeQueuedSnapshot() {}, async markSnapshotConflict() {} },
  });
  const onLoad = () => {}, onError = () => {};
  function Harness() {
    useCloudSnapshot({ condominiumId: 'a', userId: 'u', config: { condominiumName: 'Condomínio' },
      spots: [], registeredBikes: [], logs: [], onLoad, onError });
    return null;
  }
  const root = createRoot(document.createElement('div'));
  try {
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => new Promise(resolve => setTimeout(resolve, 1100)));
    assert.equal(writes, 0);
  } finally {
    await act(async () => root.unmount());
    await window.happyDOM.close();
  }
});

test('new bicycle and allocation forms never silently assume Bloco A', () => {
  const registration = fs.readFileSync(new URL('../src/components/BikeRegisterModal.tsx', import.meta.url), 'utf8');
  const allocation = fs.readFileSync(new URL('../src/components/AllocateModal.tsx', import.meta.url), 'utf8');

  assert.match(registration, /useState\(initialBike\?\.block \|\| ''\)/);
  assert.match(registration, /block: block\.trim\(\)/);
  assert.match(registration, /list="known-condominium-blocks"/);
  assert.doesNotMatch(registration, /useState\(initialBike\?\.block \|\| 'Bloco A'\)/);

  assert.match(allocation, /initialResident\?\.block \|\| ''\)/);
  assert.match(allocation, /block: block\.trim\(\)/);
  assert.match(allocation, /list="known-allocation-blocks"/);
  assert.doesNotMatch(allocation, /initialResident\?\.block \|\| 'Bloco A'\)/);
});
