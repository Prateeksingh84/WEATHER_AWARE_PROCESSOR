# Assignment 2 Architecture

```text
orders.json
    |
    v
Validate + load orders
    |
    v
Create one async weather job per order
    |
    v
Promise.allSettled  <-- all city calls are started concurrently
    |
    +-------------------------------+
    |                               |
fulfilled                        rejected
    |                               |
    v                               v
weather.main                   structured error
    |                               |
    v                               v
Rain/Snow/Extreme?             errors.log
  /         \\
YES          NO
 |            |
 v            v
Delayed    retain status
 |
 v
Weather-Aware Apology
 |
 +-----------------------+
 |                       |
 v                       v
orders.updated.json    console run summary
```

## Failure isolation

`Promise.allSettled()` ensures an invalid city such as `InvalidCity123` becomes one rejected result rather than terminating processing for New York, Mumbai, or London.

## Security

`OPENWEATHER_API_KEY` is read from `.env`. The source code never contains a real API key, and `.env` is gitignored.

## Live evidence

The live run must generate `output/orders.updated.json` and `output/errors.log`. These artifacts are intentionally produced at runtime because weather status is current and cannot be truthfully hardcoded.
