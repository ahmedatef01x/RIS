E2E Test Instructions (Playwright)

- Install dev dependency:

```bash
npm install -D @playwright/test
npx playwright install
```

- Run tests:

```bash
npm run test:e2e
```

- Helpful scripts added to `package.json`:
  - `test:e2e` — run Playwright tests headless
  - `test:e2e:headed` — run tests with headed browsers
  - `test:e2e:debug` — run tests in debug mode
  - `test:e2e:install` — installs Playwright browsers

Notes:
- The Playwright config starts the Vite dev server at `http://localhost:5173` automatically if not running.
- On CI, Playwright retries and reporters are configured for minimal flakiness.
