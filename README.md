# 🎬 RoleCall

**RoleCall** is a production-ready web app for short film producers and directors to assign every responsibility from a professional production checklist so nothing falls through the cracks on shoot day.

## Features

- 🔐 **Clerk authentication** — magic link, Google OAuth, email/password
- 🎭 **20 pre-loaded production roles** with realistic duty descriptions (16 marked critical)
- 📋 **Role Assignment Board** — table view with assign/reassign modals, duties viewer
- ⚡ **Lean 8-Person Template** — one-click crew distribution for small shoots
- 📧 **Email invites via Resend** — invite cast & crew by email with join links
- 👥 **Team Sidebar** — shows every member and their role count
- 🚨 **Critical role warnings** — red banner when critical roles are unfilled
- 📊 **Progress dashboard** — title, shoot date, and assignment progress bar
- �� **Fully responsive** — works on phone for set-day use

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styles | Tailwind CSS v4 + custom shadcn-style components |
| Auth | Clerk v7 (magic links + Google) |
| Database | Vercel Postgres + Drizzle ORM |
| Email | Resend |
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

Fill in your credentials:
- **Clerk**: Create a project at [clerk.com](https://clerk.com) and copy the publishable + secret keys
- **Vercel Postgres**: Add a Postgres database in your Vercel project dashboard; copy the connection strings
- **Resend**: Get an API key at [resend.com](https://resend.com)
- **`NEXT_PUBLIC_APP_URL`**: Set to `http://localhost:3000` for development

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Seed the roles

```bash
curl -X POST http://localhost:3000/api/seed
```

Or visit `http://localhost:3000/api/seed` and POST to it once after starting the dev server.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Vercel Deployment

1. Push to GitHub
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.example` in the Vercel dashboard
4. Deploy
5. After first deploy, run:
   ```
   vercel env pull .env.local
   npm run db:push
   curl -X POST https://your-app.vercel.app/api/seed
   ```

---

## Database Schema

```
projects        — id, owner_id (Clerk), title, shoot_date, description, created_at
project_members — id, project_id, clerk_user_id, email, display_name, status
roles           — id, name, category, duties (jsonb), is_critical, sort_order
assignments     — id, project_id, role_id, assigned_member_id, backup_member_id, notes
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push Drizzle schema to Postgres |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:generate` | Generate Drizzle migrations |
