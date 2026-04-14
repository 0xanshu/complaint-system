# Whistle Complaint System

Next.js + MySQL anonymous complaint platform with:

- Credentials + OAuth auth (NextAuth v5)
- Manager dashboard for institution-scoped complaints
- Public complaint filing page
- Tamper-evident complaint hash chain log

## Tech Stack

- Next.js App Router
- React + TypeScript
- MySQL (`mysql2`)
- NextAuth v5 beta + custom MySQL adapter

## Database Schema

The schema is in [db/schema.sql](db/schema.sql).

Tables created:

- `users`
- `accounts`
- `sessions`
- `verification_tokens`
- `students`
- `complaints`
- `complaint_hash_log`

## Setup

1. Install dependencies:

```bash
bun install
```

2. Configure environment in `.env` (already present in this workspace):

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- Optional for OAuth buttons: `GITHUB_ID`, `GITHUB_SECRET`, `GOOGLE_ID`, `GOOGLE_SECRET`

3. Initialize database schema:

- Open MySQL Workbench.
- Connect to your MySQL server.
- Open [db/schema.sql](db/schema.sql).
- Click Execute.

4. Start app:

```bash
bun run dev
```

5. Open website:

- http://localhost:3000

## Browser Testing Flow (No API Tools)

1. Open [sign-in page](app/sign-in/page.tsx) from `/sign-in`.
2. Switch to `REGISTER`, create account, submit.
3. You should be redirected to `/dashboard`.
4. On dashboard, configure institution name + slug.
5. Copy/open your public report URL shown there (`/report/<slug>`).
6. Submit a complaint from that page.
7. Return to dashboard and verify complaint appears in the list.

Also available:

- Home page CTA uses `/file-report` (requires login in current code).
- Public institutional page `/report/<slug>` allows anonymous filing for that manager.

## Current Project Status

Implemented:

- Registration endpoint and credentials login
- NextAuth adapter integration for MySQL
- Manager institution setup flow
- Anonymous complaint submission
- Manager/admin complaint fetch logic
- Public report-by-slug page

Not yet implemented:

- A complainant-facing token tracking page (token is generated but no UI endpoint exists to query by token yet)
