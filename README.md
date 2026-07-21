# Momentum — Passenger Operations Reporting

Password-walled, read-only reporting dashboard over the Passenger Operations demo
database in Baserow (self-hosted). The Baserow token lives only in the serverless
proxy (`app/api/data/route.js`); the browser only ever receives already-fetched JSON.

## What it shows
- KPI tiles: flights in program, passengers carried, active ops, completed, on-time
  departures, average baggage wait, delay events, special-meal orders.
- Charts: flights by status, passengers by route, program timeline, delay events by
  IATA category.
- Filterable flights table with deep links to the source Baserow rows.

## Stack
Next.js (standalone output) in a multi-stage Docker image, deployed on Coolify behind
Traefik + Let's Encrypt. Single shared-password gate via httpOnly cookie in `middleware.js`.

## Env vars (set in Coolify)
| var | value |
|---|---|
| `BASEROW_HOST` | `https://stephenbaserow.duckdns.org` |
| `BASEROW_TOKEN` | read-only DB token scoped to DB 968 |
| `ACCESS_PASSWORD` | shared view password |
| `SESSION_SECRET` | `openssl rand -hex 32` |

## Local
```
npm ci && npm run build && npm start
```
Unauth `/api/*` → 401, `/` → 307 `/login`, `/login` → 200.
