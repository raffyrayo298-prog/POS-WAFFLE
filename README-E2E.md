Playwright end-to-end test helper
================================

Use these helpers to run the Playwright test suite locally. They start a local static server on port `60355`, install dependencies and Playwright browsers, run the tests, and then stop the server.

PowerShell (Windows):

```powershell
cd "C:\Users\user\Downloads\brew-pos-admin\brew-pos"
.\scripts\run-playwright.ps1
```

Bash (macOS / Linux / WSL):

```bash
cd "~/Downloads/brew-pos-admin/brew-pos"
./scripts/run-playwright.sh
```

Alternatively you can run the npm scripts directly:

```powershell
npm run start   # starts simple python server on 60355
npx playwright install
npm run e2e
```

If tests fail, copy the Playwright output and the browser console/network logs into an issue and I'll diagnose.
