import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

async function loadDotEnv(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, value] = match;
      if (process.env[key] === undefined) process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

await loadDotEnv(path.join(PROJECT_ROOT, '.env'));

const CONFIG = Object.freeze({
  units: process.env.WEATHER_UNITS || 'metric',
  timeoutMs: Number(process.env.WEATHER_API_TIMEOUT_MS || 10000),
  retries: Number(process.env.WEATHER_RETRIES || 2),
  retryBaseMs: Number(process.env.WEATHER_RETRY_BASE_MS || 500),
  ordersFile: path.resolve(PROJECT_ROOT, process.env.ORDERS_FILE || './orders.json'),
  outputFile: path.resolve(PROJECT_ROOT, process.env.OUTPUT_FILE || './output/orders.updated.json'),
  errorLogFile: path.resolve(PROJECT_ROOT, process.env.ERROR_LOG_FILE || './output/errors.log'),
});

const DELAY_WEATHER = new Set(['Rain', 'Snow', 'Extreme']);

function logLine(message, logger = console.log) {
  logger(`[${new Date().toISOString()}] ${message}`);
}

export class WeatherApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'WeatherApiError';
    this.city = options.city ?? null;
    this.statusCode = options.statusCode ?? null;
    this.code = options.code ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export function validateOrders(orders) {
  if (!Array.isArray(orders)) throw new TypeError('orders.json must contain an array.');
  orders.forEach((order, index) => {
    if (!order || typeof order !== 'object') throw new TypeError(`Order ${index} is not an object.`);
    for (const field of ['order_id', 'customer', 'city', 'status']) {
      if (typeof order[field] !== 'string' || !order[field].trim()) {
        throw new TypeError(`Order ${index} is missing a valid ${field}.`);
      }
    }
  });
}

export function shouldDelay(mainStatus) {
  return DELAY_WEATHER.has(String(mainStatus || '').trim());
}

export function createWeatherAwareApology({ customer, city, weatherMain, description }) {
  const firstName = String(customer || 'Customer').trim().split(/\s+/)[0] || 'Customer';
  const main = String(weatherMain || '').trim();
  const detail = String(description || main || 'adverse weather').trim().toLowerCase();

  if (!shouldDelay(main)) {
    return `Hi ${firstName}, your order to ${city} is currently being processed as scheduled. We appreciate your patience!`;
  }

  const condition = main === 'Rain' ? `rain (${detail})`
    : main === 'Snow' ? `snow (${detail})`
    : `extreme weather (${detail})`;

  return `Hi ${firstName}, your order to ${city} is delayed due to ${condition}. We appreciate your patience!`;
}

async function sleep(ms) {
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithTimeout(url, timeoutMs, fetchImpl = globalThis.fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { method: 'GET', signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new WeatherApiError(`Weather request timed out after ${timeoutMs} ms.`, {
        retryable: true,
        code: 'TIMEOUT',
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryable(status) {
  return status === 408 || status === 429 || status >= 500;
}

export async function fetchCurrentWeather(city, options = {}) {
  const {
    apiKey = process.env.OPENWEATHER_API_KEY,
    units = CONFIG.units,
    timeoutMs = CONFIG.timeoutMs,
    retries = CONFIG.retries,
    retryBaseMs = CONFIG.retryBaseMs,
    fetchImpl = globalThis.fetch,
  } = options;

  if (!apiKey) {
    throw new WeatherApiError('OPENWEATHER_API_KEY is not configured.', {
      city, code: 'MISSING_API_KEY', retryable: false,
    });
  }

  const query = new URLSearchParams({ q: city, appid: apiKey, units });
  const url = `https://api.openweathermap.org/data/2.5/weather?${query.toString()}`;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const response = await fetchJsonWithTimeout(url, timeoutMs, fetchImpl);
      let body = null;
      try { body = await response.json(); } catch { body = null; }

      if (response.ok) {
        const main = body?.weather?.[0]?.main;
        const description = body?.weather?.[0]?.description;
        if (!main) {
          throw new WeatherApiError('Weather response missing weather.main.', {
            city, statusCode: response.status, code: 'MALFORMED_RESPONSE', retryable: false,
          });
        }
        return {
          city,
          fetchedAt: new Date().toISOString(),
          main: String(main),
          description: String(description || ''),
          temperatureC: typeof body?.main?.temp === 'number' ? body.main.temp : null,
          feelsLikeC: typeof body?.main?.feels_like === 'number' ? body.main.feels_like : null,
          humidity: typeof body?.main?.humidity === 'number' ? body.main.humidity : null,
        };
      }

      const retryable = isRetryable(response.status);
      if (retryable && attempt <= retries) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const wait = Number.isFinite(retryAfter) ? retryAfter * 1000 : retryBaseMs * 2 ** (attempt - 1);
        await sleep(wait);
        continue;
      }

      throw new WeatherApiError(
        `OpenWeatherMap rejected "${city}": ${body?.message || `HTTP ${response.status}`}.`,
        { city, statusCode: response.status, code: body?.cod ?? `HTTP_${response.status}`, retryable }
      );
    } catch (error) {
      if (error instanceof WeatherApiError) {
        error.city = error.city || city;
        if (error.retryable && attempt <= retries) {
          await sleep(retryBaseMs * 2 ** (attempt - 1));
          continue;
        }
        throw error;
      }

      if (attempt <= retries) {
        await sleep(retryBaseMs * 2 ** (attempt - 1));
        continue;
      }

      throw new WeatherApiError(`Weather lookup failed for "${city}": ${error.message}`, {
        city, code: error?.code || 'NETWORK_ERROR', retryable: true,
      });
    }
  }
}

export async function processOrders(orders, {
  apiKey = process.env.OPENWEATHER_API_KEY,
  units = CONFIG.units,
  timeoutMs = CONFIG.timeoutMs,
  retries = CONFIG.retries,
  retryBaseMs = CONFIG.retryBaseMs,
  fetchWeather = fetchCurrentWeather,
  onError = () => {},
  now = () => new Date().toISOString(),
  logger = console.log,
} = {}) {
  validateOrders(orders);

  // All jobs are created before awaiting results: calls start concurrently.
  // allSettled ensures InvalidCity123 cannot abort the other cities.
  const jobs = orders.map((order) => Promise.resolve().then(async () => {
    logLine(`START weather request | order=${order.order_id} | city=${order.city}`, logger);
    try {
      const weather = await fetchWeather(order.city, { apiKey, units, timeoutMs, retries, retryBaseMs });
      logLine(`END weather request | order=${order.order_id} | city=${order.city} | main=${weather.main}`, logger);
      return weather;
    } catch (error) {
      logLine(`ERROR weather request | order=${order.order_id} | city=${order.city} | code=${error?.code ?? 'UNKNOWN_ERROR'} | message=${error?.message ?? String(error)}`, logger);
      throw error;
    }
  }));
  const results = await Promise.allSettled(jobs);

  return orders.map((order, index) => {
    const result = results[index];
    if (result.status === 'fulfilled') {
      const weather = result.value;
      const delayed = shouldDelay(weather.main);
      return {
        ...order,
        status: delayed ? 'Delayed' : order.status,
        weather: {
          main: weather.main,
          description: weather.description,
          temperatureC: weather.temperatureC,
          feelsLikeC: weather.feelsLikeC,
          humidity: weather.humidity,
          fetched_at: weather.fetchedAt,
        },
        ...(delayed ? {
          delay_reason: `${weather.main.toLowerCase()} (${String(weather.description || '').toLowerCase()})`,
          customer_message: createWeatherAwareApology({
            customer: order.customer,
            city: order.city,
            weatherMain: weather.main,
            description: weather.description,
          }),
        } : {}),
      };
    }

    const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
    const entry = {
      timestamp: now(),
      order_id: order.order_id,
      city: order.city,
      error: error.message,
      code: error.code ?? 'UNKNOWN_ERROR',
      status_code: error.statusCode ?? null,
    };
    onError(entry);
    return {
      ...order,
      error: {
        message: error.message,
        code: error.code ?? 'UNKNOWN_ERROR',
        status_code: error.statusCode ?? null,
      },
    };
  });
}

export async function readOrders(filePath = CONFIG.ordersFile) {
  const orders = JSON.parse(await fs.readFile(filePath, 'utf8'));
  validateOrders(orders);
  return orders;
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function writeErrorLog(filePath, entries) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, entries.length ? `${entries.map(JSON.stringify).join('\n')}\n` : '', 'utf8');
}

async function main() {
  if (!process.env.OPENWEATHER_API_KEY) {
    console.error('ERROR: OPENWEATHER_API_KEY is missing. Create .env from .env.example.');
    process.exitCode = 1;
    return;
  }

  const orders = await readOrders();
  const errors = [];
  console.log(`Starting concurrent weather checks for ${orders.length} orders...`);

  const updated = await processOrders(orders, {
    apiKey: process.env.OPENWEATHER_API_KEY,
    onError: (entry) => errors.push(entry),
  });

  await writeJson(CONFIG.outputFile, updated);
  await writeErrorLog(CONFIG.errorLogFile, errors);

  const delayedCount = updated.filter((o) => o.status === 'Delayed').length;
  const unchangedCount = updated.filter((o) => o.status !== 'Delayed' && !o.error).length;
  console.log('');
  console.log('========== RUN SUMMARY ==========');
  console.log(`Processed orders : ${updated.length}`);
  console.log(`Delayed orders   : ${delayedCount}`);
  console.log(`Unchanged orders : ${unchangedCount}`);
  console.log(`Errors logged    : ${errors.length}`);
  if (errors.length) console.log(`Failed cities    : ${errors.map((e) => e.city).join(', ')}`);
  console.log('=================================');
  console.log(`Updated JSON: ${CONFIG.outputFile}`);
  console.log(`Error log: ${CONFIG.errorLogFile}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
