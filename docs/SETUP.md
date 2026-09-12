# Assignment 2 Setup

## Prerequisites

- Node.js 20+
- OpenWeatherMap account and API key
- PowerShell (Windows) or any shell

OpenWeather's current weather endpoint accepts a city query through `q` and requires an API key through `appid`. The response includes `weather.main` and `weather.description`, which are the fields used for the assignment's delay rule.

## Setup on Windows

```powershell
cd "C:\path\to\yellow-ai-assignment2"
Copy-Item .env.example .env
notepad .env
npm install
```

Set only:

```env
OPENWEATHER_API_KEY=YOUR_REAL_KEY
```

Never commit `.env`.

## Test

```powershell
npm test
```

## Live run

```powershell
npm start
```

Outputs:

```text
output/orders.updated.json
output/errors.log
```

## Concurrency proof

The application creates one job per order before awaiting results:

```js
const jobs = orders.map(...)
const results = await Promise.allSettled(jobs)
```

Therefore all weather requests are initiated concurrently. `allSettled` allows the deliberately invalid city to fail without aborting the valid-city processing.
