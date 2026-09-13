# Media Asset Licensing Audit — TADX Finance (`public/`)

> How to use: every image/font in `public/` must have one row below with a
> verified source + license. No new asset ships without a row. Re-audit on
> every asset change. Unused template leftovers are listed for removal.

| File | Used in app? | Source / author | License | Action |
|---|---|---|---|---|
| `logo.png` | Yes — header (`site-header.tsx`), login (`login/page.tsx`), PWA icons, OG image | Original TADX Company artwork | Proprietary — owned by TADX Company | Keep. Keep source vector on file. |
| `logo.webp` | Yes — same as above (optimized variant) | Derived from `logo.png` | Same as `logo.png` | Keep |
| `apple-touch-icon.png` | Yes — `layout.tsx` icons + iOS home screen | Derived from logo | Same as `logo.png` | Keep |
| `icon-192.png` / `icon-512.png` / `icon-maskable-512.png` | Yes — manifest + `layout.tsx` icons | Derived from logo | Same as `logo.png` | Keep |
| `TAD X logo.webp` (repo root) | No (source copy outside `public/`) | Original TADX artwork | Proprietary | Keep as source, or move into a `brand/` folder |
| `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | No — default Next.js template leftovers, not imported anywhere in `src/` | Vercel / Next.js template | Verify before any use | **Remove** (dead weight + unverified license for our use) |
| `sw.js` | N/A — PWA service worker, not media | Own code | Own code | Keep |

## Rules for contributors

1. Prefer original artwork or explicitly licensed stock (record the license URL + invoice/ID in the table).
2. Never hotlink third-party images; vendor them into `public/` with a table row.
3. AI-generated imagery: record the tool + date + commercial-use terms.
4. Fonts: currently self-hosted via `next/font` (Geist, Cairo — OFL). No remote font requests. Adding a remote font requires a privacy review (it leaks visitor IPs) — see `/cookies`.
5. All `<img>` / `<Image>` must carry a meaningful `alt`, or `aria-hidden="true"` if purely decorative. Current state: both logo usages have `alt="TADX Finance"` — compliant.
