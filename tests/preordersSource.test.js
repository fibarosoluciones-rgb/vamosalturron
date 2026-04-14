import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createPreorder,
  listPreorders,
  __setPreordersSourceServicesForTesting,
  __resetPreordersSourceServicesForTesting,
} from '../src/app/preordersSource.js';

beforeEach(() => {
  __resetPreordersSourceServicesForTesting();
});

afterEach(() => {
  __resetPreordersSourceServicesForTesting();
});

test('createPreorder delegates payload to service', async () => {
  let received;
  const expected = { id: 'pre-1' };

  __setPreordersSourceServicesForTesting({
    createPreorder: async (payload) => {
      received = payload;
      return expected;
    },
  });

  const payload = {
    status: 'nuevo',
    client: { name: 'Ana', phone: '600000000', email: 'ana@example.com', notes: 'Prefiere mañana' },
    items: [{ tariffId: 'tarifa-1', code: 'T-01', name: 'Fibra 600', company: 'Fíbaro', price: 29.9 }],
    collaborator: { username: 'comercial1', name: 'Comercial Uno' },
  };

  const result = await createPreorder(payload);

  assert.strictEqual(result, expected);
  assert.deepStrictEqual(received, payload);
});

test('listPreorders forwards options and returns service result', async () => {
  let received;
  const expected = [{ id: 'pre-2' }, { id: 'pre-3' }];

  __setPreordersSourceServicesForTesting({
    listPreorders: async (options) => {
      received = options;
      return expected;
    },
  });

  const options = { limit: 20 };
  const result = await listPreorders(options);

  assert.strictEqual(result, expected);
  assert.deepStrictEqual(received, options);
});
