# AI Log — Assignment 2

## Prompt 1 — Parallel Fetching

> Build a Node.js weather-processing script that reads an orders.json array and triggers one OpenWeatherMap current-weather request per order city concurrently, not serially. Use Promise.all/allSettled so every request is started together and a failure in one request does not prevent the other results from being processed. Make the weather-fetch function injectable so concurrency can be tested without live API calls.

**Implementation result:** production code creates one async job per order and awaits them with `Promise.allSettled(jobs)`.

## Prompt 2 — Invalid-City Error Handling

> Design resilient error handling for a Node.js script that concurrently calls OpenWeatherMap for multiple order cities, including a deliberately invalid city. The invalid city must be logged, must not crash the process, and valid cities must still be processed. Include structured error information such as timestamp, order ID, city, error message, code, and status code.

**Implementation result:** rejected results are converted into structured error log entries and the corresponding order is retained in the updated JSON.

## Prompt 3 — Weather-Aware Apology

> Write a deterministic JavaScript function named createWeatherAwareApology that takes customer, city, weatherMain, and description, uses the customer's first name, identifies the weather condition, explains the delay, and thanks the customer for their patience. Do not require an LLM API call at runtime.

**Implementation result:** `createWeatherAwareApology()` is deterministic, testable, and safe to run without a second AI service.

## Runtime note

The assignment asks an AI tool to write the function; it does not require a second live AI API call during every weather-processing run. The final implementation is deterministic so the demo is reproducible and has fewer external failure points.
