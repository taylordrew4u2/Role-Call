# 🎬 RoleCall

**RoleCall** is a production-ready web app for filmmakers — from TikTok/Reels
creators to short-film and feature directors — to plan a shoot end to end:
who's doing what, who's in it, the script, the shot list, and the schedule, so
nothing falls through the cracks on shoot day.

## Features

- 🚀 **Onboarding wizard** — pick what you're making (TikTok/Reels sketch, music
  video, commercial, short film, or feature) and RoleCall recommends the crew
  you typically need.
- 🎭 **Role Assignment Board** — assign/reassign every responsibility, with a
  duties viewer and critical-role warnings. **Add, edit, and remove roles per
  project** (changes never affect your other projects).
- ⚡ **Lean 8-Person Template** — one-click crew distribution for small shoots.
- 🎬 **Cast & crew** — add actors with the characters they play; invite
  collaborators. **Email is optional**, and every person gets a **copy-able
  invite link** so invites work even without an email provider.
- 📄 **Script** — type/paste the screenplay with autosave, and/or upload a file
  (PDF/Fountain/Word) via Vercel Blob.
- 🎥 **Shot list** — build shots per scene (number, size, angle, movement, lens,
  status…), **paste a whole list as text**, and view it **by scene, as a table,
  or as cards**. Export to **CSV**, copy as text, or print.
- 🗓️ **Shooting schedule** — create shoot days (date, call time, location) and
  assign shots to days.
- ✏️ **Full editing & deletion** — edit projects, cast, crew, and roles; delete
  projects (with everything in them).
- 📱 **Fully responsive** — works on a phone for set-day use.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styles | Tailwind CSS v4 + custom shadcn-style components |
| Auth | Clerk v7 |
| Database | Vercel Postgres (Neon) + Drizzle ORM |
| File storage | Vercel Blob (optional — script uploads) |
| Email | Resend (optional — invite emails) |
| Deployment | Vercel |

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd Role-Call
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your credentials (see `.env.example` for the full list):
- **Clerk** (required): publishable + secret keys from [clerk.com](https://clerk.com)
- **Postgres** (required): `POSTGRES_URL` from a Vercel/Neon database
- **Resend** (optional): `RESEND_API_KEY` to send invite emails
- **Vercel Blob** (optional): `BLOB_READ_WRITE_TOKEN` to enable script file uploads
- **`NEXT_PUBLIC_APP_URL`** (optional): your site URL; falls back to `VERCEL_URL`

### 3. Create the tables and seed the roles

Start the dev server (next step) and open `http://localhost:3000/api/setup`
once. It creates every table (if missing) and seeds the 20 production roles —
safe to run more than once. (`npm run db:push` also works for the schema.)

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Vercel Deployment (free integrations only)

No third-party billing or manual key copying required — everything below uses
Vercel Marketplace integrations on their free plans.

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. **Database (free):** Project → **Storage** → **Create Database** → **Neon** →
   **Free** → connect. This auto-adds `POSTGRES_URL`.
3. **Login (free):** Project → **Integrations** → **Browse Marketplace** →
   **Clerk** → install on the **Free** plan. This auto-adds
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
4. **(Optional) Script uploads:** **Storage** → **Create** → **Blob** to add
   `BLOB_READ_WRITE_TOKEN`. Without it, the script text editor still works.
5. **Redeploy** so the new environment variables take effect.
6. **Create the tables + seed roles** by opening this URL once:
   ```
   https://your-app.vercel.app/api/setup
   ```
   Safe to run again any time the schema changes.

> Invite emails (Resend) are optional. Without them, invited people are still
> added and you can share their **copy-able invite link** manually.

---

## Database Schema

```
projects             — id, owner_id (Clerk), title, project_type, shoot_date, description, created_at
project_members      — id, project_id, clerk_user_id, email, display_name, kind (cast|crew), character, status
roles                — id, project_id (null = shared template), name, category, duties (jsonb), is_critical, sort_order
project_hidden_roles — id, project_id, role_id   (global roles a project has removed)
assignments          — id, project_id, role_id, assigned_member_id, backup_member_id, notes
scripts              — id, project_id, content, file_url, file_name, updated_at
scenes               — id, project_id, scene_number, heading, int_ext, location, time_of_day, synopsis, sort_order
shoot_days           — id, project_id, day_number, shoot_date, location, call_time, notes, sort_order
shots                — id, project_id, scene_id, shoot_day_id, shot_number, description, shot_size, angle, movement, lens, equipment, cast_notes, status, sort_order, notes
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push Drizzle schema to Postgres |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run lint` | Run ESLint |
