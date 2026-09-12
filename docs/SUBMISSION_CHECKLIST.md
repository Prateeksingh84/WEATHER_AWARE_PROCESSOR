# Final Submission Checklist — Assignment 2

## Required by the assignment

- [x] Source code (`src/weather-orders.js`)
- [x] Exact input sample (`orders.json`)
- [x] Concurrent API calls (`Promise.allSettled`)
- [x] Rain/Snow/Extreme -> `Delayed`
- [x] Weather-Aware Apology function
- [x] Invalid city handled without crashing
- [x] Error log implementation
- [x] `.env` API-key security
- [x] AI Log (`AI_LOG.md`)
- [x] Demo recording script (`docs/DEMO_SCRIPT.md`)
- [ ] Live generated `output/orders.updated.json`
- [ ] Live generated `output/errors.log`
- [ ] Demo recording

## Validation gates

- [ ] `npm test` passes with 0 failures.
- [ ] `npm start` completes successfully with a real OpenWeatherMap API key.
- [ ] `npm run verify:live` passes.
- [ ] `output/orders.updated.json` contains all four orders.
- [ ] `output/errors.log` contains `InvalidCity123`.
- [ ] Any live order whose `weather.main` is `Rain`, `Snow`, or `Extreme` has `status: "Delayed"`.
- [ ] Delayed orders contain a personalized `customer_message`.
- [ ] `.env` is not uploaded.

## Evidence

- [ ] Screenshot/video frame showing concurrent START lines.
- [ ] Screenshot/video frame showing `InvalidCity123` logged and the run summary completing.
- [ ] Screenshot of live `orders.updated.json`.
- [ ] Screenshot of live `errors.log`.
- [ ] Test output showing all tests passed.
