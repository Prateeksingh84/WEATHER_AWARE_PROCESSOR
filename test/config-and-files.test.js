import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');

test('submission input file contains exactly the four required orders', async () => {
  const orders = JSON.parse(await fs.readFile(path.join(root, 'orders.json'), 'utf8'));
  assert.deepEqual(
    orders.map(({ order_id, customer, city, status }) => ({ order_id, customer, city, status })),
    [
      { order_id: '1001', customer: 'Alice Smith', city: 'New York', status: 'Pending' },
      { order_id: '1002', customer: 'Bob Jones', city: 'Mumbai', status: 'Pending' },
      { order_id: '1003', customer: 'Charlie Green', city: 'London', status: 'Pending' },
      { order_id: '1004', customer: 'InvalidCity123', city: 'InvalidCity123', status: 'Pending' },
    ],
  );
});

test('project contains required documentation and secret template', async () => {
  for (const relative of [
    '.env.example',
    'AI_LOG.md',
    'README.md',
    'docs/DEMO_SCRIPT.md',
    'docs/ARCHITECTURE.md',
    'docs/LIVE_RUN_EVIDENCE.md',
    'ai-weather-apology-prompt.md',
  ]) {
    const stat = await fs.stat(path.join(root, relative));
    assert.ok(stat.isFile(), `${relative} should exist as a file`);
  }
});
