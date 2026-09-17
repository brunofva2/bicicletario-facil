import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, useState } from 'react';
import { Window } from 'happy-dom';
import { loadSource } from './load-source.mjs';

const initial = { config: { condominiumName: 'Inicial' }, spots: [], registeredBikes: [], logs: [] };
const cloud = { config: { condominiumName: 'Nuvem antiga' }, spots: [], registeredBikes: [], logs: [] };
const pending = { config: { condominiumName: 'Alteração offline' }, spots: [{ id: 'offline-1' }], registeredBikes: [], logs: [] };
const noop = () => {};

function setupWindow() {
  const window = new Window({ url: 'http://localhost' });
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  Object.assign(globalThis, { window, document: window.document, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  return window;
}

test('pending offline snapshot becomes visible before it is sent and only its own revision is removed', async () => {
  const window = setupWindow();
  const { createRoot } = await import('react-dom/client');
  let queued = { id: 'snapshot:condo', condominiumId: 'condo', payload: pending,
    expectedVersion: 3, revision: 7, createdAt: 'a', updatedAt: 'b', status: 'queued' };
  let rpcPayload;
  let removedRevision;
  const query = { select() { return this; }, eq() { return this; },
    async maybeSingle() { return { data: { payload: cloud, version: 3 }, error: null }; } };
  const { useCloudSnapshot } = loadSource(new URL('../src/hooks/useCloudSnapshot.ts', import.meta.url), {
    '../lib/supabase': { supabase: { from: () => query, async rpc(_name, args) {
      rpcPayload = args.p_payload;
      return { data: [{ version: 4 }], error: null };
    } } },
    '../lib/offlineQueue': {
      async getQueuedSnapshot() { return queued; },
      async queueSnapshot(input) { queued = { ...queued, ...input, revision: queued.revision + 1 }; return queued; },
      async removeQueuedSnapshot(_condominiumId, revision) {
        removedRevision = revision;
        if (queued?.revision !== revision) return false;
        queued = null;
        return true;
      },
      async markSnapshotConflict() {},
    },
  });

  let visibleName = '';
  let result;
  function Harness() {
    const [workspace, setWorkspace] = useState(initial);
    visibleName = workspace.config.condominiumName;
    result = useCloudSnapshot({ condominiumId: 'condo', userId: 'user', ...workspace,
      onLoad: setWorkspace, onError: noop });
    return null;
  }

  const root = createRoot(document.createElement('div'));
  try {
    await act(async () => {
      root.render(React.createElement(Harness));
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    assert.equal(visibleName, 'Alteração offline');
    assert.equal(rpcPayload.config.condominiumName, 'Alteração offline');
    assert.equal(removedRevision, 7);
    assert.equal(result.syncState, 'synced');
    assert.equal(result.pendingChanges, 0);
  } finally {
    await act(async () => root.unmount());
    await window.happyDOM.close();
  }
});

test('a newer cloud version keeps the local snapshot visible and opens an explicit conflict', async () => {
  const window = setupWindow();
  const { createRoot } = await import('react-dom/client');
  let queued = { id: 'snapshot:condo', condominiumId: 'condo', payload: pending,
    expectedVersion: 3, revision: 2, createdAt: 'a', updatedAt: 'b', status: 'queued' };
  let rpcCalls = 0;
  let conflictMarked = 0;
  const query = { select() { return this; }, eq() { return this; },
    async maybeSingle() { return { data: { payload: cloud, version: 4 }, error: null }; } };
  const { useCloudSnapshot } = loadSource(new URL('../src/hooks/useCloudSnapshot.ts', import.meta.url), {
    '../lib/supabase': { supabase: { from: () => query, async rpc() { rpcCalls++; return {}; } } },
    '../lib/offlineQueue': {
      async getQueuedSnapshot() { return queued; }, async queueSnapshot() { return queued; },
      async removeQueuedSnapshot() { queued = null; return true; },
      async markSnapshotConflict() { conflictMarked++; queued = { ...queued, status: 'conflict' }; },
    },
  });

  let visibleName = '';
  let result;
  function Harness() {
    const [workspace, setWorkspace] = useState(initial);
    visibleName = workspace.config.condominiumName;
    result = useCloudSnapshot({ condominiumId: 'condo', userId: 'user', ...workspace,
      onLoad: setWorkspace, onError: noop });
    return null;
  }

  const root = createRoot(document.createElement('div'));
  try {
    await act(async () => {
      root.render(React.createElement(Harness));
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    assert.equal(visibleName, 'Alteração offline');
    assert.equal(result.syncState, 'conflict');
    assert.equal(result.pendingChanges, 1);
    assert.equal(conflictMarked, 1);
    assert.equal(rpcCalls, 0);
  } finally {
    await act(async () => root.unmount());
    await window.happyDOM.close();
  }
});
