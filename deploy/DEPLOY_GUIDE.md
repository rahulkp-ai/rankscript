# RankScript — Zero-Cost Deployment Guide

This deploys RankScript with **$0 in hosting costs**, using:

| Component | Service | Free tier limit that matters |
|---|---|---|
| Database | **Neon** (Postgres 15) | 0.5 GB storage, autosuspends when idle |
| Cache | **Upstash** (Redis) | 10,000 commands/day, plenty for a demo |
| Backend | **Render** (Docker web service) | Sleeps after 15 min idle, ~10–30s cold start |
| Frontend | **Vercel** | Generous free tier, no sleep, instant cold start |
| CI | **GitHub Actions** | Free for public repos |

Total time: ~20–30 minutes.

---

## 0. Before you start

Copy the files from this `deploy/` folder into your repo like this:

```
deploy/render.yaml               ->  <repo root>/render.yaml
deploy/next.config.js            ->  frontend/next.config.js   (overwrite the existing one)
deploy/github-workflows/ci.yml   ->  .github/workflows/ci.yml
```

The other files (`backend.env.render.example`, `frontend.env.vercel.example`,
`init_neon_db.sh`) are references you'll copy values *from*, not files that
go into the repo.

Commit and push these:
```bash
git add render.yaml frontend/next.config.js .github/workflows/ci.yml
git commit -m "build(deploy): add zero-cost deployment config"
git push
```

---

## 1. Database — Neon (Postgres)

1. Go to **neon.tech** → sign up (free, no card) → **New Project**.
   - Name: `rankscript`
   - Postgres version: 15 (to match `docker-compose.yml`)
   - Region: pick one close to you (e.g. Mumbai/Singapore for India)
2. On the project dashboard, click **Connection Details** → copy the
   **pooled** connection string. It looks like:
   ```
   postgresql://neondb_owner:AbCdEf123@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Load the schema and seed data:
   ```bash
   cd deploy
   chmod +x init_neon_db.sh
   ./init_neon_db.sh "postgresql://...your-connection-string...?sslmode=require"
   ```
   (If you don't have `psql` installed locally, install it or run this
   step from any machine that has it — it only needs to run once.)
4. Keep this connection string — you'll paste it into Render in Step 3.

---

## 2. Cache — Upstash (Redis)

1. Go to **upstash.com** → sign up (free) → **Create Database**.
   - Name: `rankscript`
   - Type: Regional (cheaper/simpler than Global for a demo)
   - Region: same region as your Render backend, for lowest latency
2. On the database page, copy the **`rediss://` connection URL** (the TLS
   one, not the plain `redis://`) from the "Connect" tab.
3. Keep this — you'll paste it into Render in Step 3.

---

## 3. Backend — Render

**Option A — Blueprint (uses `render.yaml`):**
1. Push `render.yaml` to your repo root (see Step 0).
2. Go to **dashboard.render.com** → **New** → **Blueprint** → connect your
   GitHub repo → select `rahulkp-ai/rankscript`.
3. Render detects `render.yaml` and creates a free Docker web service
   called `rankscript-backend`.
4. It will prompt you for the 4 secret env vars marked `sync: false`.
   Fill them in from `backend.env.render.example`:
   - `DATABASE_URL` → your Neon connection string
   - `REDIS_URL` → your Upstash `rediss://` URL
   - `SECRET_KEY` → generate with `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`
   - `ALLOWED_ORIGINS` → leave a placeholder for now (e.g. `https://placeholder.vercel.app`) — you'll update this in Step 5 once your real Vercel URL exists.
5. Click **Apply** → Render builds `backend/Dockerfile` and deploys.

**Option B — Manual (no render.yaml):**
1. **New** → **Web Service** → connect repo → set **Root Directory** to `backend`.
2. Runtime: **Docker** (it'll find `backend/Dockerfile` automatically).
3. Plan: **Free**.
4. Add the same environment variables listed above under "Environment".
5. **Create Web Service**.

Either way, note your backend's live URL, e.g.:
```
https://rankscript-backend.onrender.com
```

**Sanity check:** open `https://rankscript-backend.onrender.com/docs` — you
should see the Swagger UI. First load may take 10–30s (free tier cold start).

---

## 4. Frontend — Vercel

1. Go to **vercel.com** → sign up (free) → **Add New** → **Project** →
   import `rahulkp-ai/rankscript`.
2. Set **Root Directory** to `frontend`.
3. Framework preset: Vercel auto-detects **Next.js** — leave defaults.
4. Add environment variable (Project Settings → Environment Variables):
   - `BACKEND_INTERNAL_URL` = `https://rankscript-backend.onrender.com`
     (this is what the replacement `next.config.js` reads to proxy `/api/*`)
5. **Deploy**.

Vercel gives you a URL like:
```
https://rankscript.vercel.app
```

---

## 5. Close the loop — update CORS

Go back to **Render** → `rankscript-backend` → **Environment** → update:
```
ALLOWED_ORIGINS=https://rankscript.vercel.app
```
Save — Render will redeploy automatically with the correct CORS origin.

---

## 6. Verify end-to-end

1. Open `https://rankscript.vercel.app`.
2. Register a new user, log in.
3. Confirm you can browse courses / hit the leaderboard — this proves the
   frontend → `/api/*` → Render backend → Neon/Upstash chain works.

If login fails with a CORS or network error, double-check:
- `ALLOWED_ORIGINS` on Render exactly matches your Vercel URL (no trailing slash)
- `BACKEND_INTERNAL_URL` on Vercel exactly matches your Render URL (no trailing slash)
- Render backend isn't still "waking up" (check the Render logs tab)

---

## 7. CI (optional but recommended)

Once `.github/workflows/ci.yml` is pushed, every push/PR to `main` runs
`pytest` and `npm run lint / test / build` automatically in the Actions tab
— free for public repos. Render and Vercel both auto-deploy on push by
default, so no separate deploy step is needed in the workflow.

---

## Known limitations of this $0 setup

- **Render free tier sleeps after 15 min idle.** First request after a
  sleep takes 10–30s. Fine for a portfolio demo; mention this in your
  README or LinkedIn post so reviewers aren't confused by a slow first load.
- **Neon free tier autosuspends compute after inactivity** — same effect,
  the first query after idle time is slightly slower, then fast again.
- **pgAdmin isn't deployed** — the `docker-compose.yml` `pgadmin` service
  is dev-only tooling; for production, use Neon's own dashboard/SQL editor
  instead.
- **`bcrypt` is pinned to `3.2.2`** (see `backend/requirements.txt` comment)
  — this ships fine on Render, no action needed, just documented here so
  it isn't mistaken for a deploy issue if you see the pin while reviewing
  the Dockerfile.
