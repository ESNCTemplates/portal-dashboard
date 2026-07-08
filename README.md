# Portal Dashboard (v2 — JSX render, Coolify-ready)

Turnkey, runnable Next.js portal over Baserow. Renders with real React components (no innerHTML).

## Deploy on Coolify
1. Push this folder to a **public** git repo (rename `gitignore.txt` -> `.gitignore` first).
2. In Coolify: New Resource -> Public Repository -> this repo. Build pack: **dockerfile**. Port: **3000**.
3. Set env vars: BASEROW_HOST, BASEROW_TOKEN (read-only, scoped), BASEROW_TABLE_ID, ACCESS_PASSWORD, SESSION_SECRET.
4. Deploy. Open the FQDN -> you should hit the password gate.

## Edit before first real data
- `app/api/data/route.js`: set BASEROW_TABLE_ID and map your field names in `normalize()`.
