# JD Builds Clients

Codex guidance for the JD Builds client constellation site.

## Context

- Repository: `jonahduckworth/clients`.
- Canonical path: `/Users/jonah/dev/jd-builds/clients/clients`.
- Domain: `clients.jdbuilds.ca`.
- Stack: Vite, TypeScript, React.

## Work Rules

- Use npm; this repo has `package-lock.json`.
- Keep client data updates factual and scoped. Avoid inventing company URLs or details when matches are uncertain.
- Preserve the data notes in `README.md`, especially the intentionally excluded HarvestingPro clients.
- For UI changes, visually verify markers/cards/layout on desktop and mobile when practical.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run build
```

## Verification

- Data/content changes: verify the source or user-provided fact and run `npm run build`.
- UI changes: run `npm run lint`, `npm run build`, and browser visual review when practical.
