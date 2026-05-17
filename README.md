# Deligo News — Editor Portal

Standalone Next.js 16 application for the **editor** role. See `../editor_portal_plan.md` for the full development plan.

- Stack: Next.js 16 App Router · TypeScript · Tailwind 4 · TanStack Query 5 · Firebase Auth · TipTap
- Backend: shared with `frontend/` and `admin_frontend/` (see `../backend/`)
- Design: `news-portal-deligo/project/Editor Dashboard.html`

## Local dev

```bash
cp .env.example .env.local   # then fill in Firebase + API base URL
npm install
npm run dev                  # http://localhost:3000
```

## Role gate

`(editor)/layout.tsx` enforces `role === 'editor' || role === 'admin'`. Other roles are sent to `/access-denied`. Admin sessions see a "viewing as admin" banner above the page header.

## Deploy (Vercel)

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full Vercel checklist — env vars, Firebase authorised domains, backend CORS, security headers, smoke tests. The build is deploy-ready as-is:

- `next.config.ts` sets `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Content-Security-Policy` (Firebase + Cloudinary + API base + Google Fonts), `X-Robots-Tag: noindex`, etc.
- `src/app/layout.tsx` sets a `robots: noindex,nofollow` meta tag (belt-and-braces).
- `images.remotePatterns` already includes `res.cloudinary.com` and `lh3.googleusercontent.com`.

Quick path:

```bash
npm install
npm run build      # must exit 0 before pushing
git push           # then import the repo on Vercel
```
