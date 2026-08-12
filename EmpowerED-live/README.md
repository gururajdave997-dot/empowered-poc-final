# EmpowerED — Internal Resource Management Portal

AI-assisted internal resource management portal for Resource Managers, Delivery Managers, PMO, HR and Leadership. Built with **React + Vite + TypeScript + Tailwind + Recharts**, secured with **Supabase email + password authentication**, with in-browser Excel import for the Skill Management Report and Time Sheet workbooks.

## Prerequisites
- Node.js 18+ and npm
- A Supabase project (URL + anon key)

## Local setup
```bash
npm install
cp .env.example .env      # then fill in your Supabase values (see below)
npm run dev               # http://localhost:5173
npm run build             # production build in dist/
npm run preview           # preview the production build locally
```

## Environment variables
Vite only exposes variables prefixed with `VITE_` to the browser. Set these in `.env` locally and in your host's environment settings for production.

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase Project URL. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key (browser-safe; Row-Level Security protects data). |
| `VITE_ALLOWED_USERS` | Comma-separated list of authorized emails. Only these can sign in. |
| `VITE_USER_ROLES` | `email:Role` pairs. Roles: `Admin`, `Manager`. |
| `VITE_APP_ENV` | `development` or `production`. |

Example:
```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
VITE_ALLOWED_USERS=gururaj.k@excelsoftcorp.com,manjula@excelsoftcorp.com
VITE_USER_ROLES=gururaj.k@excelsoftcorp.com:Admin,manjula@excelsoftcorp.com:Manager
VITE_APP_ENV=production
```

## User roles
- **Admin** — full access, including the Admin page (data uploads, user/audit context).
- **Manager** — resource, skills, availability, projects, AI Assistant and reports.

Access is restricted to emails in `VITE_ALLOWED_USERS`. There is **no public sign-up or self-registration** — unlisted emails receive *"Access Denied. Please contact the administrator."* and never receive a code. To add/remove users, edit `VITE_ALLOWED_USERS` / `VITE_USER_ROLES` and redeploy.

## Supabase setup (one time)
1. **SQL Editor** — run, in order: `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_seed.sql`.
2. **Authentication ▸ Providers ▸ Email** — ensure Email is enabled.
3. **Authentication ▸ Users ▸ Add user** — create each approved account with an email + password and tick **Auto Confirm User**:
   - `gururaj.k@excelsoftcorp.com` (Admin)
   - `manjula@excelsoftcorp.com` (Manager)
   No SMTP or email templates are required.

See `docs/TECHNICAL_GUIDE.md` (Supabase setup, auth flow, uploads, security) and `docs/DATABASE_SCHEMA.md`.

## Authentication flow
1. User enters work email + password.
2. Email is validated against `VITE_ALLOWED_USERS`; unlisted emails are denied.
3. Supabase verifies the credentials and issues a session.
4. Profile is upserted to `public.users` and a login entry is written to `public.audit_logs`.
5. Protected routes require a valid session; logout ends it.
6. Roles (Admin/Manager) come from `VITE_USER_ROLES`.

## Excel upload (single sheet)
Upload one workbook on **Admin ▸ Data Upload**; parsed in-browser; the dashboard refreshes instantly and blank rows are skipped.

Recognised columns (from the "Data for Dashboard" sheet):
`Emp ID`, `Name of Employee`, `2026 Tribe`, `Team`, `Squad`, `Skill set`, `2026 - Capacity`,
`2026-Billable/Buffer`, `Total Exp`, `Level`, `Project code mapped`, `Excel Mail ID`, `Reports to`, `Category`.

Mapping: **2026 Tribe** (else Team) → department grouping · **Skill set** → skill · **Capacity + Billable/Buffer** → Resource Allocation Status (Buffer = Unallocated, Capacity 0.75 → 75%) · **Total Exp** → experience · **Project code mapped** → current project. Header matching is case/space-insensitive.

## Dashboard data
The dashboard currently uses built-in sample data for presentation. The data layer is behind a single `DataService` seam (`src/data/dataService.ts`), so it can be switched to live Supabase queries later without changing pages or components.

## Deployment (Vercel — recommended)
1. Push this repo to GitHub.
2. vercel.com ▸ **Add New… ▸ Project** ▸ import the repo. Vite is auto-detected (Build `npm run build`, Output `dist`).
3. **Settings ▸ Environment Variables**: add the five `VITE_*` variables above (Production).
4. **Deploy**. Your live URL appears on the project dashboard (e.g. `https://empowered-poc.vercel.app`). Every push to `main` redeploys.
5. Set the Supabase **Site URL** (step 4 of Supabase setup) to this URL.

Alternative: static build (`npm run build`) can be hosted on any static host (Netlify, Azure Static Web Apps, GitHub Pages — workflow included at `.github/workflows/deploy.yml`).

## Project structure
```
src/
  pages/        Login (OTP), Dashboard, Resources, Skills, Availability, Projects, AIAssistant, Reports, Admin
  components/    Layout, SkillFilterBar, ResourceTable, PageHeader, ui/*
  data/          mockData.ts, dataService.ts (Excel import for both templates)
  ai/            queryParser.ts, scoring.ts, insights.ts
  lib/           auth.tsx (Supabase email+password + allow-list + roles), supabase.ts, alloc.ts, types.ts, utils.ts
supabase/migrations/   0001_init.sql, 0002_rls.sql, 0003_seed.sql
docs/                  TECHNICAL_GUIDE.md, DATABASE_SCHEMA.md
public/templates/      Timesheet_Template.xlsx, Skills_Template.xlsx
```
