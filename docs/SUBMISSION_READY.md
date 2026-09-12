# Assignment 2 — Submission-Ready Runbook

## Required live run

From the project root:

```powershell
Copy-Item .env.example .env -ErrorAction SilentlyContinue
notepad .env
npm install
npm test
npm start
npm run verify:live
```

Enter the real OpenWeatherMap key only in `.env`. Never commit or record the secret.

## Evidence to capture

### Evidence A — concurrency + resilience

Show the terminal output from `npm start`. The four `START weather request` lines should appear before the longest-running calls finish. Show the `InvalidCity123` error and then the final `RUN SUMMARY`.

### Evidence B — updated database

Open `output/orders.updated.json` and show:

- all four required orders;
- current `weather.main` values;
- any `Rain`, `Snow`, or `Extreme` order marked `Delayed`;
- personalized `customer_message` for delayed orders.

### Evidence C — error log

Open `output/errors.log` and show the `InvalidCity123` entry.

### Evidence D — tests

Run `npm test` and capture the result showing zero failures.

## Final submission files

Submit:

1. Source code.
2. `orders.json`.
3. `output/orders.updated.json` from the live run.
4. `output/errors.log` from the live run if accepted as supporting evidence.
5. `AI_LOG.md`.
6. Demo recording.

Do not submit `.env`.
