# Yellow.ai AI Automation Intern — Assignment 2
## Weather-Aware Order Processor — Command Guide

This file contains the complete Windows PowerShell command sequence for running, testing, verifying, and demonstrating Assignment 2.

The assignment requires:
- the supplied `orders.json` with New York, Mumbai, London, and `InvalidCity123`;
- concurrent weather API calls;
- `Rain`, `Snow`, or `Extreme` → `Delayed`;
- a personalized Weather-Aware Apology;
- resilient handling/logging of `InvalidCity123` without crashing the run;
- the API key stored in `.env`, not hardcoded;
- source code, updated JSON, AI Log, and demo recording. 

---

## 1. Open PowerShell and go to the project

Use the folder where the project is actually extracted.

```powershell
cd "C:\Users\prath\Desktop\CODING\Weather-Aware Order Processor"
```

Confirm the project files:

```powershell
Get-ChildItem -Force
```

Expected important files/folders:

```text
.env
.env.example
package.json
orders.json
src\
test\
dashboard\
dashboard-server.mjs
output\
```

---

## 2. Verify Node.js and npm

```powershell
node --version
npm --version
```

The project uses Node.js and npm.

---

## 3. Install dependencies

Run this once after extracting the project, or whenever `package.json` changes:

```powershell
npm install
```

---

## 4. Create the `.env` file

Only do this when `.env` does not already exist.

```powershell
Copy-Item .env.example .env
```

Open it:

```powershell
notepad .env
```

Set the real OpenWeatherMap API key:

```env
OPENWEATHER_API_KEY=YOUR_REAL_OPENWEATHER_API_KEY
```

The assignment requires the API key to be kept in `.env` and not hardcoded in source code.

**Never commit `.env` to GitHub and never paste the real key into chat.**

---

## 5. Verify that `.env` exists

```powershell
Get-Item .env
```

You should see the file path for:

```text
...\Weather-Aware Order Processor\.env
```

---

## 6. Verify that the API key is loaded — WITHOUT printing it

```powershell
node --env-file=.env -e "console.log(process.env.OPENWEATHER_API_KEY ? 'API KEY LOADED' : 'API KEY MISSING')"
```

Expected:

```text
API KEY LOADED
```

Do not use a command that prints the actual key.

---

## 7. Optional: test OpenWeatherMap directly

This is useful when the application reports a `401 Invalid API key`.

Set the key only in the local PowerShell session:

```powershell
$key = "YOUR_REAL_OPENWEATHER_API_KEY"
```

Then test with a valid city:

```powershell
Invoke-RestMethod "https://api.openweathermap.org/data/2.5/weather?q=London&appid=$key&units=metric"
```

A successful response should contain weather information.

If OpenWeatherMap returns `401`, check the API key, account/email activation, and key status before troubleshooting the Node.js application.

Do not paste your real key or the full authenticated request URL into chat.

---

## 8. Run automated tests

Run:

```powershell
npm test
```

Expected final state:

```text
5 tests
5 passed
0 failed
```

The tests cover the assignment's core behavior, including the delay rule, concurrent processing/resilience, and Weather-Aware Apology behavior.

---

## 9. Run the live weather processor

Run:

```powershell
npm start
```

This is the real OpenWeatherMap integration.

It should:

```text
Load orders.json
    ↓
Start 4 weather requests concurrently
    ↓
Process valid weather responses
    ↓
Rain/Snow/Extreme → Delayed
    ↓
Create customer message when delayed
    ↓
Log InvalidCity123 error
    ↓
Write output/orders.updated.json
    ↓
Write output/errors.log
```

The assignment specifically requires concurrent API calls and requires the invalid city to be logged without crashing processing of the valid cities.

---

## 10. Check the live output directory

```powershell
Get-ChildItem .\output -Force
```

Expected live artifacts:

```text
output\orders.updated.json
output\errors.log
```

---

## 11. View the updated orders

```powershell
Get-Content .\output\orders.updated.json
```

For readable JSON formatting:

```powershell
Get-Content .\output\orders.updated.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

Check that the valid cities contain their current weather information and that orders with `weather.main` equal to `Rain`, `Snow`, or `Extreme` have `status` set to `Delayed`.

Do not hardcode expected live statuses; they can change between runs because the assignment asks for current weather.

---

## 12. View the error log

```powershell
Get-Content .\output\errors.log
```

The live run should include the intentional `InvalidCity123` failure.

The important point for the demo is that the error is logged and the overall run still completes.

---

## 13. Verify the live artifacts

Run:

```powershell
npm run verify:live
```

This checks the generated live output and confirms the expected resilience evidence.

---

## 14. Run the processor again

To repeat a real current-weather run:

```powershell
npm start
```

The updated output files will be refreshed from the new live execution.

---

# Dashboard Commands

## 15. Start the real-time dashboard

Use a separate PowerShell window.

```powershell
cd "C:\Users\prath\Desktop\CODING\Weather-Aware Order Processor"
npm run dashboard
```

Expected message:

```text
Weather dashboard running at http://127.0.0.1:4173
```

Open:

```text
http://127.0.0.1:4173
```

---

## 16. Verify dashboard environment loading

If the dashboard says:

```text
OPENWEATHER_API_KEY is missing
```

stop the dashboard with:

```text
Ctrl + C
```

Then verify:

```powershell
node --env-file=.env -e "console.log(process.env.OPENWEATHER_API_KEY ? 'DASHBOARD ENV OK' : 'DASHBOARD ENV MISSING')"
```

Expected:

```text
DASHBOARD ENV OK
```

Then restart:

```powershell
npm run dashboard
```

---

## 17. Run the live processor from the dashboard

Open:

```text
http://127.0.0.1:4173
```

Click:

```text
Run Weather Check
```

The dashboard launches the same live processor used by `npm start`.

Watch the Live Console for evidence similar to:

```text
START weather request | order=1001 | city=New York
START weather request | order=1002 | city=Mumbai
START weather request | order=1003 | city=London
START weather request | order=1004 | city=InvalidCity123
```

These near-simultaneous `START` events demonstrate the concurrent request model.

---

## 18. Dashboard API state check

If needed, open this in a browser:

```text
http://127.0.0.1:4173/api/state
```

This exposes the dashboard's current state for debugging.

---

# Troubleshooting Commands

## 19. Check whether another dashboard process is already running

```powershell
Get-NetTCPConnection -LocalPort 4173 -ErrorAction SilentlyContinue
```

If an old process is occupying the port, stop the dashboard with `Ctrl + C` in its terminal and restart it.

---

## 20. Check Node processes

```powershell
Get-Process node -ErrorAction SilentlyContinue
```

---

## 21. Check project files again

```powershell
tree /F /A
```

The important Assignment 2 structure should include:

```text
Weather-Aware Order Processor
│   .env
│   .env.example
│   package.json
│   orders.json
│   dashboard-server.mjs
│
├── dashboard
├── docs
├── output
├── src
└── test
```

---

## 22. Check npm scripts

```powershell
npm run
```

You should see scripts including:

```text
start
 test
 verify:live
 dashboard
```

---

## 23. Clean generated output before a fresh demo — OPTIONAL

Only do this if you intentionally want a clean run:

```powershell
Remove-Item .\output\orders.updated.json -ErrorAction SilentlyContinue
Remove-Item .\output\errors.log -ErrorAction SilentlyContinue
```

Then run:

```powershell
npm start
```

Do not delete the `output` directory itself.

---

# Final Submission Demo Sequence

## 24. Recommended 2–4 minute demo commands

Start from the project root:

```powershell
cd "C:\Users\prath\Desktop\CODING\Weather-Aware Order Processor"
```

Run:

```powershell
npm test
```

Then:

```powershell
npm start
```

Then:

```powershell
npm run verify:live
```

Then show:

```powershell
Get-Content .\output\orders.updated.json
```

Then:

```powershell
Get-Content .\output\errors.log
```

For the dashboard demo, open a second PowerShell window:

```powershell
cd "C:\Users\prath\Desktop\CODING\Weather-Aware Order Processor"
npm run dashboard
```

Open:

```text
http://127.0.0.1:4173
```

and click **Run Weather Check**.

---

# Final Submission Checklist

Before submitting Assignment 2, verify:

```text
[ ] orders.json contains the required four orders
[ ] .env exists locally
[ ] .env is gitignored
[ ] API key is not hardcoded in source
[ ] npm test passes
[ ] npm start completes successfully
[ ] requests are concurrent
[ ] Rain/Snow/Extreme are mapped to Delayed
[ ] Weather-Aware Apology is generated
[ ] InvalidCity123 is logged
[ ] InvalidCity123 does not crash the run
[ ] output/orders.updated.json contains the live result
[ ] output/errors.log contains the live error
[ ] AI_LOG.md is included
[ ] source code is included
[ ] demo recording is completed
```

The assignment explicitly requires the source code, updated orders JSON, AI Log, and demo recording. 

---

# One-command repeatable live demo

After `.env` is configured, use this sequence:

```powershell
cd "C:\Users\prath\Desktop\CODING\Weather-Aware Order Processor"
npm test
npm start
npm run verify:live
```

For the visual dashboard demo, use a second terminal:

```powershell
cd "C:\Users\prath\Desktop\CODING\Weather-Aware Order Processor"
npm run dashboard
```

Then open:

```text
http://127.0.0.1:4173
```

