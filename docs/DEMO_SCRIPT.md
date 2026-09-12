# Demo Recording — Assignment 2

Recommended duration: 2–4 minutes.

1. Show `orders.json` and point out the four required cities, including `InvalidCity123`.
2. Show `.env.example` and explain that the real OpenWeatherMap key is stored only in `.env`.
3. Open `src/weather-orders.js` and highlight `Promise.allSettled`, `shouldDelay`, `createWeatherAwareApology`, structured error handling, and the absence of a hardcoded API key.
4. Run `npm test` and show all tests passing.
5. Run `npm start` to perform live weather checks.
6. Open `output/orders.updated.json` and point out the orders marked `Delayed` based on live `weather.main` values.
7. Open `output/errors.log` and show that `InvalidCity123` was logged while processing completed.
8. Explain that exact live delay statuses can change because the assignment asks for current weather.
