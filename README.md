# Polmz Boardroom

A centralized virtual meeting dashboard and workspace manager. Each user gets a dedicated workspace URL where they manage, create, edit, and launch custom meeting links (Google Meet, Zoom, Microsoft Teams, etc.) via interactive button cards with real-time lock controls.

## Tech Stack

- **Frontend:** Vite + React 18 + React Router 6
- **Styling:** Tailwind CSS (executive corporate theme)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Deployment:** Vercel (SPA with rewrite config)

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup

Run the SQL migration in the **Supabase SQL Editor**:

1. Go to your Supabase Dashboard → SQL Editor → New Query
2. Paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run**

This creates the `profiles` and `meetings` tables, the auto-profile trigger, indexes, and all Row Level Security (RLS) policies.

### 3. Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Build for Production

```bash
npm run build
```

The build output goes to `dist/`. Preview locally with `npm run preview`.

## Deployment to Vercel

1. Push this repository to GitHub/GitLab
2. Import the project in Vercel
3. Set the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy — the `vercel.json` rewrite config ensures direct workspace links load without 404 errors

## Architecture

### Database Schema

- **`profiles`** — Extends `auth.users`. Stores the username and email. One row per user, created automatically on signup via a PostgreSQL trigger.
- **`meetings`** — Meeting records. Each belongs to a user (`user_id` FK). Has `title`, `description`, `url`, and `is_locked` fields.

### Row Level Security (RLS)

- **Profiles:** Publicly readable (for workspace routing). Only the owner can update.
- **Meetings:** Publicly readable (visitors can view a workspace's cards). Insert, update, and delete are restricted to the meeting owner only.

### Application Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login (username or email + password) |
| `/signup` | Sign up (username + email + password) |
| `/dashboard` | Owner's meeting management (auth required) |
| `/workspace/:username` | Public workspace view |

### Security Model

- Meeting records are strictly isolated per user profile. When a creator shares their workspace link, visitors see **only** that specific user's meetings — no cross-contamination between accounts.
- Each meeting card has a real-time lock toggle. Only the authenticated owner can flip it. When locked (`is_locked = true`), the meeting button becomes a disabled "LOCKED / Session Closed" element that blocks navigation.
- Non-owners who attempt to create, edit, delete, or toggle a lock see an intercept modal: *"Creator Authentication Required: Only the workspace owner can modify access."*

## Project Structure

```
polmz-boardroom/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── .env.example
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/
│   └── logo.png
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   └── supabaseClient.js
    ├── context/
    │   └── AuthContext.jsx
    ├── components/
    │   ├── Navbar.jsx
    │   ├── AuthGuardModal.jsx
    │   ├── MeetingCard.jsx
    │   ├── MeetingForm.jsx
    │   ├── ConfirmDialog.jsx
    │   ├── Spinner.jsx
    │   └── ProtectedRoute.jsx
    └── pages/
        ├── Landing.jsx
        ├── Login.jsx
        ├── Signup.jsx
        ├── Dashboard.jsx
        └── Workspace.jsx
```

## Logo

The placeholder logo is at `public/logo.png`. Replace it with your custom branding asset.
