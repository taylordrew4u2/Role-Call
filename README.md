<div align="center">

# 🎬 RoleCall

### _Action starts with everyone knowing their role._

**RoleCall** is the all-in-one production hub for filmmakers — from TikTok &
Reels creators to short-film and feature directors. Plan a shoot end to end:
the crew, the cast, the script, the shot list, and the schedule — so when you
call **"Action!"**, nothing falls through the cracks.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)](https://clerk.com/)
[![Drizzle](https://img.shields.io/badge/ORM-Drizzle-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

</div>

---

## ✦ The brand

**RoleCall** is a triple play on words — and the whole product lives inside it:

- **Roll call** — _who's here?_ Cast and crew, invited and accounted for.
- **Role call** — _who does what?_ Every responsibility assigned, nothing assumed.
- **Call sheet** — _where and when?_ Scenes, shots, and shoot days, organized.

> **Voice:** confident, on-set, and friendly. We speak like a great 1st AD —
> calm, prepared, and three steps ahead. Red `#E11D2A` for the record light,
> slate for the clipboard. The clapperboard 🎬 is our mark.

**Who it's for:** the solo creator shooting on an iPhone, the film-school crew
running two cameras, and everyone in between. RoleCall scales its coverage to
how _you_ actually shoot.

---

## ✦ What it does

### 🎟️ Team — invited and accounted for
- **Name-only invites with a copyable link.** Email is optional; everyone you
  add gets a share link that works with or without an email provider.
- **Invite as Writer or Director.** Roles aren't just labels — a **Writer**
  is auto-appointed to approve script edits; a **Director** gets full
  production powers (see below).
- **Add & remove** cast and crew at any time, re-invite freely.

### 🎭 Roles & crew
- **Onboarding wizard** recommends the crew you typically need for what you're
  making (sketch, music video, commercial, short, or feature).
- **Role Assignment Board** — assign, reassign, and back up every
  responsibility, with a duties viewer and **critical-role warnings**.
- **Lean 8-person template** — one-click crew distribution for small shoots.
- Per-project roles: add/edit/remove without touching your other projects.

### ✍️ Script — write, suggest, approve, publish
- A two-tab **Script workspace**: an **Editing draft** and the **Final Script**.
- A real **screenwriting toolbar** — scene headings, action, character,
  parenthetical, dialogue, transitions, and a one-click new-scene template.
- **Suggest-and-approve workflow:** anyone on the project can highlight text and
  **suggest an edit**; the **appointed Writer** approves or declines it.
- **Publish** locks the approved draft as the Final Script. Autosave throughout;
  optional file upload (PDF / Fountain / Word).

### 🎬 Cast & shot list — generated from your script
- **Auto-generate the cast** from the screenplay — every speaking character is
  detected (handles `(V.O.)`/`(CONT'D)`, `NAME:` and title-case formats, and
  scripts with no slug lines), then you say **who's playing each role**.
- **Generate scenes & shots from the script** — action coverage, full **dialogue
  coverage** (master, OTS singles, CUs), or both. No AI, no API cost — just
  smart parsing.
- **"Filming on" awareness:** choose **iPhone / 1 camera** (one person per shot)
  or **2 cameras** (adds two-shots that hold characters together).
- **Every shot says who's in it.** Descriptions read like the script (the line
  or the action); framing lives in the Size/Angle columns; a **Character** field
  is required on every shot.
- View **by Scene**, **by Cast** (each character's coverage + a "Characters
  together" section), as a **Table**, or as **Cards**. Export **CSV**, copy as
  text, or print a clean shot list.

### 🎞️ Series — one team across many projects
- Group multiple projects into a **Series**. Anyone invited to the Series
  automatically joins **every** project in it — roles, cast, script, and invites
  all work unchanged, via a clean fan-out membership model.

### 🪪 Director parity
- **Directors can do everything the owner can** on a project — manage the team
  and roles, appoint the writer, and build the script, shot list, and schedule.

### 🗓️ Schedule & shoot-day ready
- Create **shoot days** (date, call time, location) and assign shots to days.
- **Fully responsive** — built to live in your hand on set.

---

## ✦ Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router) + **TypeScript** |
| Styling | **Tailwind CSS v4** + custom shadcn-style components |
| Auth | **Clerk v7** |
| Database | **Vercel Postgres (Neon)** + **Drizzle ORM** |
| File storage | **Vercel Blob** _(optional — script uploads)_ |
| Email | **Resend** _(optional — invite emails)_ |
| Deployment | **Vercel** |

**Engineering highlights**

- **Zero-cost script intelligence** — cast extraction and shot-list generation
  are pure local parsers (`lib/parse-characters`, `lib/parse-scenes`,
  `lib/script-to-shots`), so there's no LLM bill and no rate limits.
- **Runtime-idempotent schema** — feature columns/tables are applied with
  `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` at request time, so
  new features ship to existing databases without a manual migration step.
- **Fan-out membership** — Series members are projected into per-project rows so
  every existing per-project feature works with no special-casing.
- **Permission model** — a single `requireProjectManager` gate (owner _or_
  director) backs every management action across the API.

---

## ✦ Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd Role-Call
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| Clerk publishable + secret keys | ✅ | Authentication |
| `POSTGRES_URL` | ✅ | Vercel/Neon database |
| `RESEND_API_KEY` | — | Send invite emails |
| `BLOB_READ_WRITE_TOKEN` | — | Script file uploads |
| `NEXT_PUBLIC_APP_URL` | — | Site URL (falls back to `VERCEL_URL`) |

### 3. Create tables & seed roles

Start the dev server and open `http://localhost:3000/api/setup` once — it
creates every table (if missing) and seeds the production roles. Safe to run
repeatedly. (`npm run db:push` also pushes the schema.)

### 4. Run it

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** and call action.

---

## ✦ Deploy to Vercel (free integrations only)

No third-party billing or manual key copying — everything uses Vercel
Marketplace integrations on their free plans.

1. Push to GitHub and import at **[vercel.com/new](https://vercel.com/new)**.
2. **Database (free):** Storage → Create Database → **Neon** → Free → connect
   (auto-adds `POSTGRES_URL`).
3. **Login (free):** Integrations → Marketplace → **Clerk** → Free plan
   (auto-adds the Clerk keys).
4. **(Optional) Script uploads:** Storage → Create → **Blob**.
5. **Redeploy**, then open `https://your-app.vercel.app/api/setup` once to
   create tables + seed roles.

> Invite emails (Resend) are optional — invited people are always added, and you
> can share their copyable invite link by hand.

---

## ✦ Data model

```
series               — id, owner_id, title, description, created_at
series_members       — id, series_id, clerk_user_id, email, display_name, kind, position, status
projects             — id, owner_id, title, project_type, shoot_date, description,
                       script_writer_id, camera_setup (single|dual), series_id, created_at
project_members      — id, project_id, series_member_id, clerk_user_id, email,
                       display_name, kind (cast|crew), position (writer|director), character, status
roles                — id, project_id (null = shared template), name, category, duties (jsonb), is_critical, sort_order
project_hidden_roles — id, project_id, role_id
assignments          — id, project_id, role_id, assigned_member_id, backup_member_id, notes
scripts              — id, project_id, content, final_content, file_url, file_name, updated_at
script_suggestions   — id, project_id, author_id, author_name, anchor_text, suggested_text,
                       comment, status, resolved_by, created_at, resolved_at
scenes               — id, project_id, scene_number, heading, int_ext, location, time_of_day, synopsis, sort_order
shoot_days           — id, project_id, day_number, shoot_date, location, call_time, notes, sort_order
shots                — id, project_id, scene_id, shoot_day_id, shot_number, description,
                       shot_size, angle, movement, lens, equipment, cast_notes, status, sort_order, notes
```

## ✦ Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push Drizzle schema to Postgres |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run lint` | Run ESLint |

---

<div align="center">

🎬 **RoleCall** — _every role, every shot, every day. Called._

</div>
