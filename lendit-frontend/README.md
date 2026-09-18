# Lendit

Web client for a book lending library, where members list books they own and
borrow each other's. People browse the catalogue, request a book for a set of
dates, approve or decline requests for their own books, and review each other
once a loan is returned.

Vue 3 + Vite in TypeScript, talking to the Lendit API. The API lives in its own
repository; this app is a client and has no data of its own.

## What it covers

- **Browsing** — search, tag filters, sorting and paging, all reflected in the
  URL so a filtered view can be linked or reloaded
- **Your shelf** — add, edit and remove the books you lend out
- **Borrowing** — request a book for a date range, and track both sides of
  every loan from one page
- **Reviews** — rate the other party after a return, shown on public profiles
- **Admin** — dashboard, plus tables for members, tags and review moderation

## Requirements

- [Bun](https://bun.sh) 1.x, the same runtime the API uses
- A running Lendit API — nothing loads without it

Nothing here depends on Bun specifically — `npm install` and `npm run` work
just as well. Bun is what the committed lockfile is written for, and what the
API uses, so the two halves need one toolchain between them.

## Getting started

```bash
bun install
cp .env.example .env   # point VITE_API_BASE_URL at your API
bun run dev            # http://localhost:5173
```

`VITE_API_BASE_URL` is the only setting. Without a `.env` it falls back to
`http://localhost:3000/api/v1`, which is where the API runs by default, so a
local setup usually needs no configuration at all.

Sign up from the app to get a member account. Admin accounts are made from the
API side, with its `create-admin` script.

| Script | |
| --- | --- |
| `bun run dev` | dev server with hot reload |
| `bun run build` | typecheck, then production build into `dist/` |
| `bun run typecheck` | `vue-tsc` alone, without building |
| `bun run preview` | serve the built files, to check the real bundle |
| `bun run lint` | ESLint, fixing what it can |
| `bun run format` | Prettier over `src/` |

`lint:check` and `format:check` are the same two without writing, for CI.

## How it fits together

```
src/
  pages/        one file per route
  components/   shared pieces; components/ui/ is the design system
  composables/  one per API resource: useBooks, useBorrowings, useRatings…
  lib/http.ts   fetch wrapper: base URL, auth header, error shape
  types/api.ts  the shapes the API returns, mirroring the backend models
  styles/       tokens.css holds every colour, size and radius
  locales/      en.json — all UI copy, nothing hardcoded in templates
  router/       routes and the role guards
```

### Roles

Routes carry a `meta` flag and the router enforces it:

- `public` — login and register
- `member` — browsing, owning and borrowing books
- `admin` — the dashboard and the admin tables

Admins do not borrow, so the member pages are hidden from them and guarded, not
just unlinked.

### Auth

The token and the signed-in account live in `sessionStorage`, so closing the tab
signs you out. `lib/http.ts` attaches the token to every request. Switch to
`localStorage` in `composables/useAuth.ts` if a login should outlive the tab.

### Styling

Plain CSS in scoped `<style>` blocks. Everything visual comes from a token in
`styles/tokens.css` — edit a colour there and it changes everywhere. Tailwind is
installed but only used for a handful of layout utilities.

Copy lives in `locales/en.json` and is read with `t('some.key')`. Adding a
language means adding a file beside it and registering it in `src/i18n`.

## Contributing

Issues and pull requests are welcome. Please open an issue first for anything
substantial, so the approach can be agreed before the work.

Run `bun run build` before sending a change — it typechecks with `vue-tsc`
first, so a type error fails the build rather than reaching the bundle. Then
`bun run lint:check` and `bun run format:check`.

Keep to the existing shape: one file per route in `pages/`, one composable per
API resource, shared primitives in `components/ui/`, and every visual value as
a token in `styles/tokens.css`. New UI copy goes in `locales/en.json` rather
than into a template.
