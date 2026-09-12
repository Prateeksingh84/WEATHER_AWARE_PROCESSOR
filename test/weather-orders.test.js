import test from 'node:test';
import assert from 'node:assert/strict';
import { processOrders, createWeatherAwareApology, shouldDelay } from '../src/weather-orders.js';

const orders = [
  { order_id: '1001', customer: 'Alice Smith', city: 'New York', status: 'Pending' },
  { order_id: '1002', customer: 'Bob Jones', city: 'Mumbai', status: 'Pending' },
  { order_id: '1003', customer: 'Charlie Green', city: 'London', status: 'Pending' },
  { order_id: '1004', customer: 'InvalidCity123', city: 'InvalidCity123', status: 'Pending' },
];

test('Golden Flow recognizes Rain, Snow, Extreme only', () => {
  assert.equal(shouldDelay('Rain'), true);
  assert.equal(shouldDelay('Snow'), true);
  assert.equal(shouldDelay('Extreme'), true);
  assert.equal(shouldDelay('Clouds'), false);
  assert.equal(shouldDelay('Clear'), false);
});

test('all weather calls run concurrently and one invalid city does not crash processing', async () => {
  const started = new Map();
  const delays = { 'New York': 250, Mumbai: 250, London: 250, InvalidCity123: 20 };
  const fakeWeather = async (city) => {
    started.set(city, Date.now());
    await new Promise((r) => setTimeout(r, delays[city]));
    if (city === 'InvalidCity123') {
      const e = new Error('City not found'); e.code = 404; e.statusCode = 404; throw e;
    }
    const mapping = {
      'New York': ['Rain', 'heavy rain'],
      Mumbai: ['Clouds', 'broken clouds'],
      London: ['Snow', 'light snow'],
    };
    const [main, description] = mapping[city];
    return { city, main, description, temperatureC: 20, feelsLikeC: 20, humidity: 70, fetchedAt: new Date().toISOString() };
  };

  const start = Date.now();
  const errors = [];
  const result = await processOrders(orders, { fetchWeather: fakeWeather, onError: (e) => errors.push(e) });
  const elapsed = Date.now() - start;

  assert.ok(elapsed < 500, `Expected concurrent execution, got ${elapsed} ms`);
  assert.equal(result.find((o) => o.order_id === '1001').status, 'Delayed');
  assert.equal(result.find((o) => o.order_id === '1002').status, 'Pending');
  assert.equal(result.find((o) => o.order_id === '1003').status, 'Delayed');
  assert.equal(result.find((o) => o.order_id === '1004').status, 'Pending');
  assert.equal(result.find((o) => o.order_id === '1004').error.status_code, 404);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].city, 'InvalidCity123');

  const times = [...started.values()].sort((a, b) => a - b);
  assert.ok(times[times.length - 1] - times[0] < 120, 'Requests did not start concurrently');
});

test('Weather-Aware Apology is personalized', () => {
  assert.equal(
    createWeatherAwareApology({ customer: 'Alice Smith', city: 'New York', weatherMain: 'Rain', description: 'heavy rain' }),
    'Hi Alice, your order to New York is delayed due to rain (heavy rain). We appreciate your patience!'
  );
});
