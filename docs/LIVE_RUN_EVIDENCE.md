# Live Run Evidence Checklist

This file is completed during the real run immediately before submission.

## 1. Environment

- [ ] `.env` exists locally and contains `OPENWEATHER_API_KEY`.
- [ ] `.env` is not committed.
- [ ] `npm test` passes with 0 failures.

## 2. Live execution

Run:

```powershell
npm start
```

Capture a screenshot showing:

- four orders were processed;
- START lines appear for all four cities close together;
- `InvalidCity123` produces an error;
- the process reaches `RUN SUMMARY` and exits successfully.

## 3. Updated order database

Open:

```text
output/orders.updated.json
```

Verify each order contains the current weather data and that any order with `weather.main` equal to `Rain`, `Snow`, or `Extreme` has `status: "Delayed"`.

## 4. Error log

Open:

```text
output/errors.log
```

Verify `InvalidCity123` is present and that processing completed successfully.

## 5. Demonstration recording

Show, in order:

1. `orders.json`
2. `.env.example` (never the real `.env`)
3. `src/weather-orders.js`
4. `npm test`
5. `npm start`
6. `output/orders.updated.json`
7. `output/errors.log`
8. The run summary and explanation of concurrency/error isolation
