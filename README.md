# CourtIQ

CourtIQ is a tennis management platform built for athletes and coaching staff. Athletes can manage their weekly schedules, log training load and fatigue, and track match results over time. Coaches can view athlete calendars, request sessions, and monitor performance stats from a shared dashboard.

The project has two parts: a Django REST backend that talks to a Supabase (PostgreSQL) database, and a Next.js frontend.

---

## Tech Stack

- **Backend:** Python, Django, Supabase (via supabase-py)
- **Frontend:** Next.js, TypeScript, Tailwind CSS, Chart.js

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- A Supabase project with the database already set up
- A `.env` file in the `backend/` directory (see below)

---

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```
DATABASE_URL=https://your-project.supabase.co
DATABASE_KEY=your-supabase-anon-key
```

Start the development server:

```bash
python manage.py runserver
```

The backend runs at `http://127.0.0.1:8000`.

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`.

---

## Running Both Together

Open two terminal windows. Run the backend in one and the frontend in the other. The frontend expects the backend to be running on port 8000.

---

## Project Structure

```
CourtIQ/
├── backend/
│   ├── authentication/     # Login, signup, profiles, linking athletes to staff
│   ├── scheduling/         # Events, activity logs, statistics, weekly summaries
│   └── courtiq_backend/    # Django settings and root URL config
└── frontend/
    └── src/
        └── pages/
            ├── index.tsx       # Login / signup
            ├── dashboard.tsx   # Stats and charts
            ├── schedule.tsx    # Weekly calendar
            └── profile.tsx     # Profile info and linked users
```

---

## Roles

There are three user roles, each with different permissions:

- **Athlete** - manages their own schedule, logs activity, approves or rejects session requests from staff
- **Coaching Staff** - requests sessions on an athlete's calendar (requires athlete approval)
- **Head Coach** - adds events directly to athlete schedules without needing approval, and can edit or delete them
