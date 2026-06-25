<div align="center">

<img src="docs/screenshots/hero.svg" alt="RoleCall — Action starts with everyone knowing their role" width="100%"/>

# 🎬 RoleCall

**The all-in-one production hub for filmmakers.** Plan a shoot end to end —
crew, cast, script, shot list, and schedule — and let RoleCall turn your
**screenplay into a cast list and a camera-ready shot list automatically**, so
when you call _"Action!"_ nothing falls through the cracks.

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-E11D2A?style=for-the-badge)](https://role-call-taylordrew4u2s-projects.vercel.app)
&nbsp;
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

</div>

---

## 📸 Demo

> **[▶ Open the live app](https://role-call-taylordrew4u2s-projects.vercel.app)** — sign in and create a project in under a minute.

|  |  |
|---|---|
| **Dashboard** — projects & series at a glance | **Script → suggest → approve → publish** |
| <img src="docs/screenshots/dashboard.svg" alt="RoleCall dashboard" width="100%"/> | <img src="docs/screenshots/script.svg" alt="Script workspace with suggest-and-approve" width="100%"/> |

**Shot list, generated from your script and organized by cast**

<img src="docs/screenshots/shotlist.svg" alt="Shot list organized by cast" width="100%"/>

> _UI previews above. Live, signed-in screens are on the [demo](https://role-call-taylordrew4u2s-projects.vercel.app)._

---

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) · React Server Components · TypeScript |
| **Styling** | Tailwind CSS v4 · custom shadcn-style component system |
| **Auth** | Clerk v7 |
| **Database** | Vercel Postgres (Neon) · Drizzle ORM |
| **Storage / Email** | Vercel Blob · Resend _(both optional)_ |
| **Hosting / CI** | Vercel (preview deploy per PR) |

---

## ✨ Features

- **🎭 Cast from script** — auto-detects every speaking character in the
  screenplay (handles `(V.O.)`/`(CONT'D)`, `NAME:` and title-case formats, and
  scripts with no slug lines), then you assign who plays each role.
- **🎥 Shot list from script** — generates scenes and a shot list (action,
  full **dialogue coverage**, or both) with **zero AI cost** — pure parsing.
  Descriptions read like the script; framing lives in the Size/Angle columns;
  **every shot is tagged with its character**.
- **📱 Camera-aware coverage** — pick **iPhone / 1 camera** (one person per
  shot) or **2 cameras** (adds two-shots), and the coverage adapts.
- **✍️ Script workspace** — Editing draft + published **Final Script**, a real
  screenwriting toolbar, and a **suggest-and-approve** workflow where an
  appointed **Writer** accepts or declines edits.
- **🎟️ Smart invites** — name-only invites with a copyable link (email
  optional); invite people **as Writer or Director**, where a Director gets
  **full owner-level powers**.
- **🎬 Roles & crew** — onboarding wizard, Role Assignment Board with
  critical-role warnings, and a one-click **lean 8-person template**.
- **🎞️ Series** — one team across many projects; series members fan out into
  every project automatically.
- **🗓️ Schedule + exports** — shoot days with call times; view the shot list by
  **Scene / Cast / Table / Cards**; export **CSV**, copy as text, or print.

---

## 🚀 Getting started

**Prerequisites:** Node 18+, a Clerk app (free), and a Postgres URL (Neon/Vercel, free).

```bash
# 1. Clone & install
git clone https://github.com/taylordrew4u2/Role-Call.git
cd Role-Call
npm install

# 2. Configure environment
cp .env.example .env.local      # then fill in the values below

# 3. Run
npm run dev                     # http://localhost:3000
```

Then open `http://localhost:3000/api/setup` **once** to create the tables and
seed the production roles (safe to re-run).

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` · `CLERK_SECRET_KEY` | ✅ | Auth (clerk.com) |
| `POSTGRES_URL` | ✅ | Database (Neon/Vercel) |
| `RESEND_API_KEY` | — | Invite emails |
| `BLOB_READ_WRITE_TOKEN` | — | Script file uploads |
| `NEXT_PUBLIC_APP_URL` | — | Site URL (falls back to `VERCEL_URL`) |

**Deploy to Vercel:** import the repo, add the **Neon** and **Clerk**
marketplace integrations (both free, keys auto-injected), redeploy, then hit
`/api/setup` once. _No third-party billing required._

---

## 🎯 Usage

1. **Create a project** — the wizard suggests the crew for what you're making.
2. **Add the script** — type/paste it in the Script tab (autosaves).
3. **Generate the cast** — one click pulls every character out of the script.
4. **Generate the shot list** — choose your camera setup and coverage; RoleCall
   builds scenes + shots, each tagged with who's in it.
5. **Invite the team** — share copyable links; assign roles; set shoot days.
6. **On set** — open it on your phone, work the **By Cast** view, export/print.

---

## 🧠 Challenges & what I built

I designed and built **RoleCall end to end** — data model, API, and UI. A few
problems worth calling out:

- **Turning a screenplay into a production plan, for free.** Rather than reach
  for an LLM, I wrote resilient parsers (`lib/parse-characters`,
  `lib/parse-scenes`, `lib/script-to-shots`) that handle messy real-world
  formats — `(V.O.)` tags, `NAME:`/title-case cues, transitions, and Zoom-style
  scripts with no slug lines — and turn them into cast lists and proper coverage
  (master → OTS → CU). No API keys, no rate limits, no per-use cost.
- **Coverage that matches how you actually shoot.** A "Filming on" setting
  drives whether dialogue is covered one-person-per-shot (one camera) or with
  two-shots (two cameras), and the shot list reorganizes by character with a
  dedicated "Characters together" section.
- **Shipping schema changes to a live DB with no downtime.** Instead of a
  brittle migration step, new columns/tables are applied **idempotently at
  runtime** (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`), so
  features roll out to existing data instantly — plus a backfill tool to apply
  new fields to old records.
- **A clean permission model.** A single `requireProjectManager` gate (owner
  _or_ director) backs every management endpoint, and **Series** membership uses
  a fan-out pattern so every per-project feature works unchanged.

**Result:** a solo filmmaker can paste a script and walk away with a cast list
and a shootable, cast-tagged shot list in seconds.

---

## 📂 Project structure

```
app/            Next.js routes (dashboard, project tabs, API)
components/     UI — ShotListBoard, ScriptWorkspace, RoleAssignmentBoard, …
lib/            parsers (script→cast, script→shots), access guards, db schema
docs/           screenshots & brand assets
```

## 📜 License & links

- **License:** [MIT](LICENSE)
- **Live demo:** https://role-call-taylordrew4u2s-projects.vercel.app
- **Repository:** https://github.com/taylordrew4u2/Role-Call

<div align="center">

🎬 **RoleCall** — _every role, every shot, every day. Called._

</div>
