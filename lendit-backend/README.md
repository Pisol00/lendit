# Lendit API

REST API for a book lending library, where members list books they own and
borrow each other's. It handles the awkward parts of lending between people:
whether a copy is free for a given week, who still owes what, and what each
side thought of the other afterwards.

Built with Bun, Elysia, MongoDB and Mongoose, in TypeScript.

The web client (Vue 3 + Vite) lives in its own repository; this API has no UI
of its own.

## What it does

- **Members and admins.** Anyone can sign up as a member. Admins manage the
  catalogue and moderate reviews, and do not borrow.
- **Books with copies.** A book carries a `quantity`, and availability is
  worked out per date range rather than as a single in/out flag.
- **Borrowing with approval.** A request is made, the owner approves it, and
  approval is atomic: it re-checks availability and auto-rejects the pending
  requests that it fills up.
- **Two-way reviews.** After a return, each side rates the other once, within
  seven days.
- **Background jobs.** Requests that go stale are auto-rejected and overdue
  loans auto-returned.

## Requirements

- [Bun](https://bun.sh) 1.x
- MongoDB 4.4+ **running as a replica set** — approvals, deletions and tag
  changes use transactions, which standalone MongoDB does not support

A single-node replica set is enough for local work:

```bash
mongod --replSet rs0 --dbpath /your/data/path
mongosh --eval 'rs.initiate()'
```

## Getting started

```bash
bun install
cp .env.example .env   # set MONGODB_URI and a real JWT_SECRET
bun run dev            # http://localhost:3000
```

| Variable | |
| --- | --- |
| `MONGODB_URI` | connection string, including `?replicaSet=` |
| `JWT_SECRET` | signing key — use a long random string, not the placeholder |
| `JWT_EXPIRES_IN` | token lifetime, e.g. `24h` |
| `PORT` | defaults to 3000 |
| `LOG_FILE` | where request logs are written |

Sign up through `POST /auth/register` to get a member. The first admin has to
be made directly:

```bash
bun run create-admin
```

To look around with something in the database, `bun run seed` fills an empty
one with seven members, thirty-two books and loans in every state. It works by
calling the API, so it needs the server running, and everything it creates goes
through the same rules as a real request. Every account it makes uses the
password `LenditDemo123`.

`bun run dev` reloads on change. There is no build step — Bun runs the
TypeScript as-is, so deployment runs `src/index.ts` the same way. The `test`
script is still a placeholder; there is no automated test suite yet.

## How it fits together

```
src/
  routes/        paths, grouped per resource under /api/v1
  controllers/   request handling and business rules
  repositories/  every database query, including the transactions
  models/        Mongoose schemas and indexes
  validators/    input checking, returning field-level errors
  middlewares/   auth, roles, request ids
  jobs/          the scheduled auto-reject and auto-return
  utils/         hashing, logging, responses
```

## Conventions

All routes are prefixed with `/api/v1`.

**Auth** — every endpoint except `POST /auth/register` and `POST /auth/login` needs `Authorization: Bearer <token>`.
Endpoints marked **admin** additionally require the `admin` role.

**Responses** — success returns the payload directly. Errors:

| Status | Body | When |
| --- | --- | --- |
| 400 | `{ "message": "..." }` | business rule rejected the request |
| 400 | `{ "errors": [{ "field", "message" }] }` | input validation failed |
| 401 | `{ "message": "Unauthorized" }` | missing / invalid / revoked token |
| 500 | `{ "message": "...", "requestId": "..." }` | unexpected error — quote the requestId |

Note: "not found" cases return **400**, not 404.

Every response carries an `x-request-id` header, which also appears in `logs/app.log`.

**Pagination** — list endpoints accept `page` (default 1) and `limit` (default 10, max 20) and return:

```json
{ "items": [], "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 1 } }
```

---

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | public. `{ firstName, lastName, email, password }` → `{ token, account }` — signs the new member straight in. Always creates a member; `role` in the body is ignored |
| POST | `/auth/login` | public. `{ email, password }` → `{ token, account }` |
| POST | `/auth/logout` | ends the current session; the token stops working immediately |

## Accounts

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/accounts` | **admin**. `?search=` `&sortBy=` `&sortOrder=asc\|desc` `&page=` `&limit=` |
| GET | `/accounts/:id` | single account |
| PUT | `/accounts/me` | own profile. `{ firstName, lastName, email }` + optional `currentPassword` & `newPassword` together |
| PUT | `/accounts/:id/status` | **admin**. `{ isActive: boolean }` — suspending hides the account from public views |
| DELETE | `/accounts/:id` | **admin**. soft delete. Blocked while the member has active borrowings; cleans up pending requests and their ratings |

`sortBy`: `createdAt`, `updatedAt`, `firstName`, `lastName`, `email`

## Books

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/books` | `?search=` (title/author) `&tag=a,b` `&owner=me` `&sortBy=` `&sortOrder=` `&page=` `&limit=` |
| GET | `/books/:id` | single book with owner |
| POST | `/books` | see body below |
| PUT | `/books/:id` | owner only. Cannot drop `quantity` below the peak of overlapping active bookings |
| DELETE | `/books/:id` | owner only. soft delete; blocked while someone is actively borrowing it |

Body for POST/PUT:

```json
{
  "title": "Clean Code", "author": "Robert C. Martin",
  "publisher": "Prentice Hall", "isbn": "9780132350884",
  "edition": 1, "quantity": 2,
  "cover": "https://...",            // optional
  "tags": ["programming"]            // optional, each 3-20 chars of a-z0-9
}
```

One owner cannot have two live books with the same title + author + edition + publisher. A different edition or publisher counts as a different book.

`sortBy`: `createdAt`, `updatedAt`, `title`, `author`, `publisher`, `isbn`, `edition`

## Borrowings

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/borrowings` | `?role=borrower\|owner` (default borrower) `&status=` `&page=` `&limit=` |
| POST | `/borrowings` | `{ bookId, startDate, dueDate }` — cannot borrow your own book, cannot start in the past |
| PUT | `/borrowings/:id/approve` | owner. Atomic: re-checks availability and auto-rejects pending requests the approval fills up |
| PUT | `/borrowings/:id/reject` | owner, pending only |
| PUT | `/borrowings/:id/cancel` | borrower, own pending request only |
| PUT | `/borrowings/:id/return` | owner confirms the return; sets `returnedDate` |

`status`: `pending`, `borrowing`, `rejected`, `returned`, `cancelled`

Availability is per time range: a request is refused when approved bookings overlapping that range already fill the book's `quantity`.

Two cron jobs run in the background: pending requests past their `startDate` are auto-rejected, and active borrowings past their `dueDate` are auto-returned.

## Ratings

Two-way: after a borrowing is returned, **each side rates the other once**.

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/ratings` | `{ borrowingId, rating: 1-5, comment? }` — see rules below |
| GET | `/ratings/borrowings/:borrowingId` | the two parties only; up to 2 ratings |
| GET | `/ratings/accounts/:accountId` | reviews this account **received**. `?role=owner\|borrower` `&page=` `&limit=` |
| GET | `/ratings/accounts/:accountId/summary` | averages — see below |
| GET | `/ratings/moderation` | **admin**. newest first. `?rating=1-5` `&raterId=` `&rateeId=` `&search=` `&status=live\|deleted\|all` `&page=` `&limit=` |
| DELETE | `/ratings/:id` | **admin**. soft delete for inappropriate reviews |
| PUT | `/ratings/:id/restore` | **admin**. undo a deletion — only works on a review that is currently deleted |

Rules for creating a rating:

- the borrowing must be `returned`
- only within **7 days** of `returnedDate`
- only the owner or the borrower of that borrowing
- one rating per side, permanently — if an admin removes it, that side **cannot write a replacement**

Because a removal is permanent for the author, a mistaken deletion is recoverable only by the admin: `?status=deleted` lists removed reviews and `PUT /ratings/:id/restore` puts one back, with its original text, score and timestamps intact.

`?role=` on the profile list is the role of the **profile owner**, matching the two tabs on a profile page: `role=owner` returns reviews written by borrowers, `role=borrower` returns reviews written by owners.

`summary` returns each bucket as `{ average, count }`, with `average` rounded to 2 decimals and `0` when there are no reviews:

```json
{
  "overall":    { "average": 4.5, "count": 12 },
  "asOwner":    { "average": 4.8, "count": 8 },
  "asBorrower": { "average": 3.9, "count": 4 }
}
```

`?search=` on moderation matches substrings inside comments, case-insensitively, and works with Thai text.

Suspended accounts disappear from public views: their profile returns 400, and reviews they wrote are hidden from other people's lists and excluded from those averages. Admin moderation still shows everything.

## Tags

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/tags` | all tags |
| POST | `/tags` | **admin**. `{ name }` — 3-20 chars, `a-z0-9` |
| DELETE | `/tags/:name` | **admin**. also removes the tag from every book |

## Dashboard

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/dashboard` | **admin**. `?from=YYYY-MM-DD&to=YYYY-MM-DD` — both or neither; applies to `topBorrowers` only |

Returns `stats`, `topBooks`, `topOwners`, `topBorrowers`, `booksByTag`, `perDay`.

---

## Upgrading an existing database

A fresh install needs nothing here.

On a deployment that ran an earlier build, the unique index on account email
covered deleted rows too, so an address could never be reused. It is a partial
index now. MongoDB will not redefine an index in place, so drop the old one
once before the new code runs and let the app rebuild it:

```js
db.accounts.dropIndex("email_1")
```

## Contributing

Issues and pull requests are welcome. Please open an issue first for anything
substantial, so the approach can be agreed before the work.

Run `bun x tsc --noEmit` before sending a change. Keep to the existing shape:
queries live in `repositories/`, rules in `controllers/`, input checks in
`validators/`.
