# CardSync frontend

A Vite + React + TypeScript single-page app. All business logic and data live in the Spring Boot backend (`../backend`); this app is a thin client that calls it over `VITE_API_URL`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.local` and set `VITE_API_URL` to point at the running backend (defaults to `http://localhost:8080`).

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck (`tsc -b`) and build for production into `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint
