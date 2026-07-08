# Portal Dashboard (scaffold)

A password-walled, read-only Next.js dashboard over Baserow. The Baserow token lives only in the
serverless API route (`app/api/data/route.js`) and is never sent to the browser.

## Fill in
1. `app/api/data/route.js` — set `TABLES` and the `normalize()` mapping.
2. `app/page.js` — adapt KPIs, grouping, and per-card fields.
3. Rename `gitignore.txt` → `.gitignore`.

## Env (Vercel project settings + local `.env.local`)
| Var | Value |
|---|---|
| `BASEROW_HOST` | Baserow base URL, no trailing slash |
| `BASEROW_TOKEN` | DB token scoped read-only to exactly the tables read |
| `ACCESS_PASSWORD` | Shared password to view the dashboard |
| `SESSION_SECRET` | `openssl rand -hex 32` |

## Run / build
```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # verify in a LOCAL dir, not a cloud-synced mount (see skill gotchas)
```

## Deploy
Push to Vercel, set the four env vars (Production + Preview), deploy. Create the scoped Baserow
DB token under Baserow → Settings → Database tokens.
