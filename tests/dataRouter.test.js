import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getDataSource,
  __setDataRouterContextForTesting,
  __resetDataRouterContextForTesting,
} from '../src/app/dataRouter.js';

beforeEach(() => {
  __resetDataRouterContextForTesting();
});

afterEach(() => {
  __resetDataRouterContextForTesting();
});

test('uses the new data source when the feature flag is enabled', async (t) => {
  const calls = [];
  __setDataRouterContextForTesting({
    loadAppConfig: async () => ({ featureFlags: { newCatalog: true } }),
    newSource: {
      SOURCE_ID: 'new-source',
      getLegacyCategoriesShape: async () => {
        calls.push('new-categories');
        return ['modern'];
      },
      getLegacyItemsShape: async () => {
        calls.push('new-items');
        return ['item'];
      },
      getLegacyBrand: async () => {
        calls.push('new-brand');
        return 'Fíbaro';
      },
    },
    legacySource: {
      SOURCE_ID: 'legacy-source',
      getLegacyCategoriesShape: async () => ['legacy'],
      getLegacyItemsShape: async () => ['legacy-item'],
      getLegacyBrand: async () => 'Legacy',
    },
  });

  const source = await getDataSource();

  assert.strictEqual(source.SOURCE_ID, 'new-source');
  assert.deepStrictEqual(await source.getLegacyCategoriesShape(), ['modern']);
  assert.deepStrictEqual(await source.getLegacyItemsShape('internet'), ['item']);
  assert.strictEqual(await source.getLegacyBrand(), 'Fíbaro');
  assert.deepStrictEqual(calls, ['new-categories', 'new-items', 'new-brand']);
});

test('falls back to the legacy source when flag is disabled', async () => {
  __setDataRouterContextForTesting({
    loadAppConfig: async () => ({ featureFlags: { newCatalog: false } }),
    newSource: {
      SOURCE_ID: 'new-source',
      getLegacyCategoriesShape: async () => ['modern'],
      getLegacyItemsShape: async () => ['item'],
      getLegacyBrand: async () => 'Modern',
    },
    legacySource: {
      SOURCE_ID: 'legacy-source',
      getLegacyCategoriesShape: async () => ['legacy'],
      getLegacyItemsShape: async () => ['legacy-item'],
      getLegacyBrand: async () => 'Legacy',
    },
  });

  const source = await getDataSource();

  assert.strictEqual(source.SOURCE_ID, 'legacy-source');
  assert.deepStrictEqual(await source.getLegacyCategoriesShape(), ['legacy']);
  assert.deepStrictEqual(await source.getLegacyItemsShape('internet'), ['legacy-item']);
  assert.strictEqual(await source.getLegacyBrand(), 'Legacy');
});

test('switches to legacy source when the new adapter fails', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const fallbackCalls = [];
  __setDataRouterContextForTesting({
    loadAppConfig: async () => ({ featureFlags: { newCatalog: true } }),
    newSource: {
      SOURCE_ID: 'new-source',
      getLegacyCategoriesShape: async () => {
        throw new Error('boom');
      },
      getLegacyItemsShape: async () => ['should-not-run'],
      getLegacyBrand: async () => 'Modern',
    },
    legacySource: {
      SOURCE_ID: 'legacy-source',
      getLegacyCategoriesShape: async () => {
        fallbackCalls.push('legacy-categories');
        return ['legacy'];
      },
      getLegacyItemsShape: async () => {
        fallbackCalls.push('legacy-items');
        return ['legacy-item'];
      },
      getLegacyBrand: async () => {
        fallbackCalls.push('legacy-brand');
        return 'Legacy';
      },
    },
  });

  const source = await getDataSource();

  assert.strictEqual(source.SOURCE_ID, 'new-source');
  const categories = await source.getLegacyCategoriesShape();
  assert.deepStrictEqual(categories, ['legacy']);
  assert.strictEqual(source.SOURCE_ID, 'legacy-source');
  assert.deepStrictEqual(await source.getLegacyItemsShape('internet'), ['legacy-item']);
  assert.strictEqual(await source.getLegacyBrand(), 'Legacy');
  assert.deepStrictEqual(fallbackCalls, ['legacy-categories', 'legacy-items', 'legacy-brand']);
});

test('uses legacy source when configuration cannot be loaded', async (t) => {
  t.mock.method(console, 'warn', () => {});
  __setDataRouterContextForTesting({
    loadAppConfig: async () => {
      throw new Error('config not available');
    },
    newSource: {
      SOURCE_ID: 'new-source',
      getLegacyCategoriesShape: async () => ['modern'],
      getLegacyItemsShape: async () => ['item'],
      getLegacyBrand: async () => 'Modern',
    },
    legacySource: {
      SOURCE_ID: 'legacy-source',
      getLegacyCategoriesShape: async () => ['legacy'],
      getLegacyItemsShape: async () => ['legacy-item'],
      getLegacyBrand: async () => 'Legacy',
    },
  });

  const source = await getDataSource();

  assert.strictEqual(source.SOURCE_ID, 'legacy-source');
  assert.deepStrictEqual(await source.getLegacyCategoriesShape(), ['legacy']);
});
