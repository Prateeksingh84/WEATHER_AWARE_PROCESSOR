# AI Prompt — Weather-Aware Apology Function

Use this prompt with an AI coding assistant to generate and review the deterministic function used by Assignment 2.

```text
Write a deterministic JavaScript function named createWeatherAwareApology for a delivery-order weather processor.

Inputs:
- customer
- city
- weatherMain
- description

Requirements:
- Use the customer's first name.
- Mention the destination city.
- For Rain, Snow, or Extreme weather, clearly explain that the order is delayed and why.
- Include the human-readable weather description when available.
- End with an appreciation/thanks for the customer's patience.
- Do not require an LLM or network call at runtime.
- Handle missing values safely.
- Return one concise customer-facing sentence.
- Keep the function deterministic and unit-testable.
```

The resulting implementation is reviewed and unit-tested in `src/weather-orders.js`.
