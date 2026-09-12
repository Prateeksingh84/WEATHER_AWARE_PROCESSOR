import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.join(root, 'output', 'orders.updated.json');
const errorPath = path.join(root, 'output', 'errors.log');

const orders = JSON.parse(await fs.readFile(outputPath, 'utf8'));
const errors = await fs.readFile(errorPath, 'utf8');

if (!Array.isArray(orders) || orders.length !== 4) {
  throw new Error('Live output must contain exactly the 4 assignment orders.');
}

const requiredIds = new Set(['1001', '1002', '1003', '1004']);
for (const order of orders) {
  if (!requiredIds.has(order.order_id)) {
    throw new Error(`Unexpected order_id in live output: ${order.order_id}`);
  }
  if (!order.weather && !order.error) {
    throw new Error(`Order ${order.order_id} has neither weather data nor an error.`);
  }
  if (order.weather?.main && ['Rain', 'Snow', 'Extreme'].includes(order.weather.main)) {
    if (order.status !== 'Delayed') {
      throw new Error(`Order ${order.order_id} should be Delayed for weather.main=${order.weather.main}.`);
    }
  }
}

if (!errors.includes('InvalidCity123')) {
  throw new Error('errors.log must contain an InvalidCity123 failure from the live run.');
}

console.log('LIVE OUTPUT VERIFICATION PASSED');
console.log(`Orders verified: ${orders.length}`);
console.log(`InvalidCity123 logged: yes`);
console.log(`Delayed orders: ${orders.filter((o) => o.status === 'Delayed').length}`);
