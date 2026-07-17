# HostelEase — Hostel Management System

A full backend (Node.js + Express + MongoDB) with a working HTML/JS frontend
for managing student hostel accommodation: room allocation, fee & occupancy
tracking, complaints, and visitor records.

This isn't a generic CRUD scaffold — the modules are **linked by real business
rules**, not just separate tables:

- **Room allocation engine** — matches a student's room-type/floor preference
  against live vacancy and gender rules; auto-waitlists them if nothing
  fits, and supports a **room-swap request** workflow between two allocated
  students (with warden approval).
- **Fee engine** — computes rent + mess + a **late fine that grows weekly**
  the longer a bill goes unpaid, and derives status (`unpaid` /
  `partial` / `overdue` / `paid`) automatically on every read.
- **Fee to Visitor cross-check** — a student who is a "fee defaulter" (overdue
  past a 14-day grace period) has **visitor check-ins blocked** at the gate
  until dues are cleared. This is enforced server-side, not just in the UI.
- **Complaint auto-escalation** — a complaint left `open`/`in_progress` for
  longer than a configurable window (default 48h) automatically bumps up a
  priority level, so nothing quietly goes stale.
- **Live occupancy analytics** — per-hostel and per-room-type occupancy % is
  computed on the fly from actual room/occupant data, not a stored counter
  that can drift out of sync.

## Tech stack
- Node.js + Express (REST API)
- MongoDB + Mongoose (data layer)
- JWT auth with role-based access (`admin`, `warden`, `student`)
- Vanilla HTML/CSS/JS frontend (no build step, no framework — just open it
  in a browser once the server is running)

## Project structure
```
hostelease/
  backend/
    config/db.js            MongoDB connection
    models/                 Mongoose schemas (User, Hostel, Room, Allocation,
                             FeeRecord, Payment, Complaint, Visitor)
    middleware/auth.js       JWT auth + role guard
    middleware/errorHandler.js
    utils/feeCalculator.js   Fee/late-fine/defaulter logic (pure functions)
    utils/allocationEngine.js  Room-matching/waitlist/swap logic (pure functions)
    controllers/             Route handlers, one file per module
    routes/                  Express routers, one file per module
    seed/seedData.js         Populates sample hostel, rooms, users, fees
    server.js                App entry point
    package.json
    .env.example
  frontend/
    index.html               Login / register
    dashboard.html            Admin/warden analytics
    rooms.html                Room list + allocation request/creation
    fees.html                 Fee records + payments
    complaints.html            Complaints + escalation
    visitors.html               Visitor check-in/out
    css/style.css
    js/                       api.js (fetch wrapper) + one file per page
```

## Setup (run this on your own machine — my sandbox has no internet access,
so I wrote and syntax-checked every file but couldn't `npm install` or run a
live MongoDB here)

### 1. Install MongoDB
Either install MongoDB Community Server locally, or use a free
MongoDB Atlas cluster (mongodb.com/atlas) and grab its connection string.

### 2. Install dependencies
```bash
cd hostelease/backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# then edit .env: set MONGO_URI (and change JWT_SECRET to something random)
```

### 4. Seed sample data
```bash
npm run seed
```
This creates:

| Role    | Email                  | Password    | Notes                          |
|---------|-------------------------|-------------|---------------------------------|
| admin   | admin@hostelease.com    | admin123    | full access                     |
| warden  | warden@hostelease.com   | warden123   | manages one hostel               |
| student | aman@student.com        | student123  | has an overdue fee — try checking in a visitor for him to see the block |
| student | rohit@student.com       | student123  | fully paid                       |

### 5. Run the server
```bash
npm run dev     # with nodemon, auto-restarts on changes
# or
npm start
```
Server runs at `http://localhost:5000` and also serves the frontend, so just
open `http://localhost:5000` in your browser — no separate frontend server
needed.

## Trying the unique cross-module logic
1. Log in as **admin**, open **Fees**, note student Aman's fee record is
   `overdue`.
2. Log in as **warden**, open **Visitors**, try checking in a visitor for
   Aman (use his student `_id` and room `_id`, visible via the Fees/Rooms
   pages' network responses or `npm run seed` console output).
3. The check-in is **rejected with a 403** explaining he must clear dues
   first — this rule lives in `controllers/visitorController.js` and reuses
   the same `isDefaulter()` function the fee module uses.
4. Record a payment covering his balance on the Fees page, then repeat the
   visitor check-in — it now succeeds.

## API overview
All protected routes require `Authorization: Bearer <token>` from
`POST /api/auth/login`.

| Method | Route | Role | Purpose |
|---|---|---|---|
| POST | /api/auth/register | public | Create a student account |
| POST | /api/auth/login | public | Get a JWT |
| POST | /api/hostels | admin | Create a hostel |
| GET | /api/hostels | any | List hostels |
| POST | /api/rooms | admin/warden | Create a room |
| GET | /api/rooms | any | List/filter rooms |
| POST | /api/allocations/request | student | Request a room (auto-allocate or waitlist) |
| GET | /api/allocations/me | student | My current allocation |
| POST | /api/allocations/swap | student | Request a room swap with another student |
| POST | /api/allocations/:id/approve-swap | admin/warden | Approve a pending swap |
| POST | /api/allocations/:id/vacate | admin/warden | Vacate a room |
| POST | /api/fees/generate | admin/warden | Create a fee record for a student |
| GET | /api/fees/me | student | My fee records (late fine auto-recalculated) |
| GET | /api/fees/defaulters | admin/warden | Students overdue past grace period |
| POST | /api/fees/:id/pay | admin/warden | Record a payment |
| POST | /api/complaints | student | File a complaint |
| GET | /api/complaints/me | student | My complaints (priority auto-escalated) |
| PATCH | /api/complaints/:id | admin/warden | Assign/resolve a complaint |
| POST | /api/complaints/:id/rate | student | Rate a resolved complaint |
| POST | /api/visitors/checkin | admin/warden | Check in a visitor (blocked if host is a defaulter) |
| POST | /api/visitors/:id/checkout | admin/warden | Check out a visitor |
| GET | /api/dashboard/occupancy | admin/warden | Live occupancy analytics |
| GET | /api/dashboard/summary | admin/warden | Snapshot counts for the dashboard |

## What I verified without a live database
Since I couldn't reach npm's registry or run MongoDB in this sandbox, I
unit-tested the framework-independent logic directly with plain Node:
- `utils/feeCalculator.js` — late fine growth, status derivation, defaulter
  detection — run and confirmed correct against sample dates.
- `utils/allocationEngine.js` — best-room matching by type/floor/gender,
  waitlist positioning, and swap validation — run and confirmed correct
  against sample room sets.
- Every `.js` file in the project passed `node --check` (syntax validation).

The parts I couldn't execute end-to-end here (Express routing + MongoDB
queries) follow the same patterns throughout and are ready to run as soon as
you `npm install` with internet access — if anything errors on your machine,
send me the message and I'll fix it immediately.
