# Dr. Care HMIS — Frontend

Hospital admin web app for Dr. Care. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the product blueprint.

Front-end only for now: data is mock and kept in the browser (localStorage). Use "Reset demo data" in the profile menu to start over.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npx playwright install chromium
npm run test:e2e
```

## Stages

1. Overview, Branches & service points
2. Users, Roles & permissions
3. Modules, Patient numbering
4. Registration forms, Settings
5. Audit log
