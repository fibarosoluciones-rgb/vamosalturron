import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadAppConfig,
  listCategories,
  listItemsByCategory,
  getDbSchemaVersion,
  clearDataSourceCache,
  __setDataSourceServicesForTesting,
  __resetDataSourceServicesForTesting,
} from '../src/app/dataSource.js';

beforeEach(() => {
  __resetDataSourceServicesForTesting();
  clearDataSourceCache();
});

afterEach(() => {
  __resetDataSourceServicesForTesting();
  clearDataSourceCache();
});

test('loadAppConfig caches the configuration result', async () => {
  let calls = 0;
  const config = { brand: 'TestCo' };
  __setDataSourceServicesForTesting({
    getConfigGeneral: async () => {
      calls += 1;
      return config;
    },
  });

  const first = await loadAppConfig();
  const second = await loadAppConfig();

  assert.deepStrictEqual(first, config);
  assert.strictEqual(first, second);
  assert.strictEqual(calls, 1);
});

test('listCategories caches values until cleared', async () => {
  let calls = 0;
  const categories = [{ id: 'a', name: 'Alpha', order: 1, isActive: true }];
  __setDataSourceServicesForTesting({
    getCategories: async () => {
      calls += 1;
      return categories;
    },
  });

  const first = await listCategories();
  const second = await listCategories();

  assert.deepStrictEqual(first, categories);
  assert.strictEqual(first, second);
  assert.strictEqual(calls, 1);

  clearDataSourceCache();
  await listCategories();
  assert.strictEqual(calls, 2);
});

test('listItemsByCategory forwards the query options', async () => {
  let receivedOptions;
  const itemsResponse = { items: [{ id: 'item-1' }], nextCursor: undefined };
  __setDataSourceServicesForTesting({
    getItems: async (options) => {
      receivedOptions = options;
      return itemsResponse;
    },
  });

  const result = await listItemsByCategory('internet', 25);

  assert.deepStrictEqual(receivedOptions, { categoryId: 'internet', limit: 25 });
  assert.strictEqual(result, itemsResponse);
});

test('getDbSchemaVersion delegates to the meta service', async () => {
  __setDataSourceServicesForTesting({
    getSchemaVersion: async () => 4,
  });

  const version = await getDbSchemaVersion();
  assert.strictEqual(version, 4);
});
