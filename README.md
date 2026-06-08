# Task Manager

Queue-based task manager with user boards, time tracking, and task types.

## Setup

### Prerequisites
- Node.js 16+
- MongoDB running locally on port 27017

### Backend
```bash
cd backend
npm install
npm start
# runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start
# runs on http://localhost:3000
```

## Features
- Multi-tenant organization signup and login by organization slug
- Subscription-first onboarding with a mock payment step
- Basic plan onboarding without AI or external chat by default
- Optional AI onboarding with admin-provided OpenAI/Gemini API key
- Optional WhatsApp, Google Chat, or Teams configuration during onboarding
- Separate MongoDB database per organization
- Organization branding with logo URL and primary color
- Subscription metadata and access enforcement (`trial` / `active` tenants can use the app)
- Add tasks with type: **Bug 🐛 / Feature ✨ / Enhancement ⚡**
- Global Queue shows all unassigned tasks in FIFO order
- Pick a task → moves to your personal board as **In Progress**
- Auto time logging starts when task is picked (live timer)
- Move task to **In QA** or back to **In Progress**
- All Users tab shows every user's board

## Multi-Tenant Notes

The backend stores platform-level tenant records in the database from `MONGO_URI`.
Each tenant gets its own database named like:

```txt
taskmanager_tenant_<organization-slug>
```

Login now requires:

```txt
organization slug + username + password
```

If the platform database is empty, the backend seeds:

```txt
organization slug: default
username: admin
password: admin123
```

New organizations can be created from `/register-organization`.
The onboarding flow is:

```txt
Choose subscription plan -> Complete mock payment -> Set up organization data -> Optional AI/chat configuration
```

For now, payment is mocked in the frontend and the backend requires a completed mock payment payload before creating the tenant. New paid tenants are created with subscription status `active`.
If the admin does not enable AI during onboarding, AI generation is blocked for that tenant.
