import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiKeyRecord, withoutApiKey } from '../src/utils/apiKeys.js';

test('createApiKeyRecord normalizes labels and builds a dated demo key', () => {
  const record = createApiKeyRecord('  Studio integration  ', new Date('2026-10-04T12:00:00Z'), () => 0.5);

  assert.equal(record.name, 'Studio integration');
  assert.match(record.id, /^key_1791115200000_/);
  assert.match(record.key, /^bh_live_/);
  assert.equal(record.created, '2026-10-04');
  assert.equal(record.lastUsed, 'Never');
  assert.equal(record.callsCount, 0);
});

test('createApiKeyRecord does not create an empty label', () => {
  assert.equal(createApiKeyRecord('   '), null);
});

test('withoutApiKey removes a key immediately without mutating the prior list', () => {
  const keys = [{ id: 'first' }, { id: 'second' }];
  const nextKeys = withoutApiKey(keys, 'first');

  assert.deepEqual(nextKeys, [{ id: 'second' }]);
  assert.deepEqual(keys, [{ id: 'first' }, { id: 'second' }]);
  assert.notEqual(nextKeys, keys);
});

test('withoutApiKey preserves the list when the id is missing', () => {
  const keys = [{ id: 'first' }];
  assert.equal(withoutApiKey(keys, 'missing'), keys);
  assert.equal(withoutApiKey(keys, null), keys);
});
