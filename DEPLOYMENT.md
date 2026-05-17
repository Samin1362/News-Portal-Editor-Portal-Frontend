# Editor Portal — Vercel Deployment Guide

Step-by-step for pushing this `editor_frontend/` directory to a fresh Vercel
project. The build is already deploy-ready — `next build` is green and the
security headers + image whitelist are baked into `next.config.ts`.

---

## 0. Pre-flight (one minute)

From this directory:

```bash
npm install
npx eslint src
npm run build
```

All three should exit `0`. If they don't, fix the failure before pushing —
Vercel runs the same commands and will fail the deploy the same way.

---

## 1. Create the Vercel project

1. Push the repo to GitHub / GitLab / Bitbucket (the user said they'll do
   this manually).
2. On Vercel → **Add New… → Project** → import the repo.
3. **Root directory:** select `editor_frontend/` if this is part of a
   monorepo, or leave blank if this is the root.
4. Vercel auto-detects Next.js. Keep the defaults:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install`
   - **Node version:** ≥ 20.19 (Vercel default is fine; the project tested
     on Node 23.8 locally)

Do **not** check "Enable Vercel Authentication" — the app handles its own
Firebase auth.

---

## 2. Environment variables

In **Project Settings → Environment Variables**, add the following for all
three environments (Production / Preview / Development) unless noted:

| Name | Required | Value | Notes |
|------|----------|-------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | yes | `https://news-portal-backend-kxsj.onrender.com` | No trailing `/api/v1`. Update if you move the backend. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | yes | from Firebase Web SDK config | Same key as `frontend/` and `admin_frontend/`. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | yes | `news-portal-firebase-project.firebaseapp.com` | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | yes | `news-portal-firebase-project` | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | yes | `news-portal-firebase-project.firebasestorage.app` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | yes | `85289317344` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | yes | `1:85289317344:web:d9c8ded103af2eca3e7185` | |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | optional | your Cloudinary cloud name | Required for `/media` library + Quick-edit image uploads. |
| `NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET` | optional | unsigned preset name | Required alongside `CLOUD_NAME`. |
| `NEXT_PUBLIC_SITE_URL` | optional | `https://deligo.news` | Used for cross-links to the public site. |

The exact local values live in `.env.example` at the repo root — copy/paste
into Vercel's env panel. **Never commit `.env.local`** (already in
`.gitignore`).

> Heads up: `NEXT_PUBLIC_API_BASE_URL` is also baked into the CSP
> `connect-src` directive at build time. If you change the API URL, you
> must trigger a fresh Vercel build (re-deploy), not just a runtime env
> swap, or browsers will block the API calls.

---

## 3. Custom domain

Plan recommends `editor.deligo.news`. To wire it:

1. Vercel → **Project Settings → Domains → Add**.
2. Enter the domain, follow Vercel's DNS instructions (CNAME or A records).
3. Wait for the SSL cert to provision (usually < 60 s).

---

## 4. Firebase authorised domains

Firebase Auth blocks sign-in attempts from un-authorised domains. After the
custom domain is live:

1. Firebase Console → **Authentication → Settings → Authorized domains**.
2. Add the Vercel preview domain (e.g. `editor-frontend.vercel.app`) **and**
   the custom domain (e.g. `editor.deligo.news`).
3. Save.

---

## 5. Backend CORS

The backend at `news-portal-backend-kxsj.onrender.com` reads
`corsAllowedOrigins` from env. Confirm the editor portal's hostnames are in
that list:

```
https://editor.deligo.news
https://editor-frontend.vercel.app   # if you keep the auto domain alive
```

If they're missing, add them to the backend `.env` (or hosting env var) and
restart the backend service.

---

## 6. Verify hardening (post-deploy)

After the first successful deploy, open a terminal and confirm headers:

```bash
curl -I https://editor.deligo.news/ | grep -iE 'x-frame|content-security|robots|hsts|x-content-type|referrer|permissions'
```

You should see (one per line):

- `X-Frame-Options: DENY`
- `Content-Security-Policy: …` (long string)
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
- `Strict-Transport-Security: max-age=63072000; …`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`

Also load the home page in Chrome DevTools → Network → click any document
request → **Headers**: same list shows there.

The HTML `<head>` also includes `<meta name="robots" content="noindex,nofollow" />` from `src/app/layout.tsx` — belt-and-braces.

---

## 7. Smoke-test checklist (manual — Phase 10)

After the deploy is green, work through this list as a real editor user:

- [ ] Sign in as editor → land on **Today** → KPIs populate within 3 s.
- [ ] Sign in as reader / journalist → land on `/access-denied`.
- [ ] Sign in as admin → land on Today with **"viewing as admin"** banner.
- [ ] On `/queue/[id]`: claim + approve + publish one article.
- [ ] On `/queue/[id]`: reject one article with reason; verify it shows up in the author's rejected list in `frontend/`.
- [ ] On `/schedule`: drag one approved article to a new time slot.
- [ ] On `/flagged` or `/comments`: moderate one flagged comment (approve + reject).
- [ ] On `/`: click **Daily plan** → `Cmd+P` → confirm print preview hides sidebar / topbar / ticker / bottom tabs.
- [ ] On any page: hit `Cmd+K` → palette opens, navigates to a page / reporter / article.
- [ ] Topbar bell badges as new submissions arrive; opening clears the count.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Sign-in fails with `auth/unauthorized-domain` | Domain missing from Firebase | See **§4** |
| API calls blocked by CORS | Domain missing from backend CORS list | See **§5** |
| API calls blocked by CSP (`Refused to connect to …`) | API URL changed but build wasn't refreshed | Re-deploy on Vercel so the new `NEXT_PUBLIC_API_BASE_URL` bakes into the CSP |
| Cloudinary upload fails with 401 | Cloud name / unsigned preset env vars not set or wrong | Add `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET` in Vercel env, then re-deploy |
| Public site cross-links go to wrong host | `NEXT_PUBLIC_SITE_URL` missing | Add it in Vercel env and re-deploy |
| Build fails on Vercel but works locally | Node version drift | Pin Node in `package.json` `engines` field or in Vercel project settings |

---

## 9. Optional — pin Node version

If Vercel ever upgrades its default Node and the build breaks, pin it in
`package.json`:

```json
{
  "engines": { "node": ">=20.19" }
}
```

Currently not pinned — Vercel's default has been stable.

---

Phase 10 is purely operational; no further code changes were needed. The
build is green, the headers are configured, and the env contract is
documented above.
