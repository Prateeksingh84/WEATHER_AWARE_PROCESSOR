# Live Output Directory

The evaluator-facing live artifacts are intentionally generated only by executing the program with a real OpenWeatherMap API key:

- `orders.updated.json` — generated current-weather order results.
- `errors.log` — structured runtime errors, including the required `InvalidCity123` failure.

Do not replace these files with invented weather data. After the live run, verify them with:

```powershell
npm run verify:live
```
