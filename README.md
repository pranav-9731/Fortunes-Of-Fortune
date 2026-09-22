# Fortune of Fortunes (a.k.a FortuneArc)

**FortuneArc** is a full-stack subscription, scoring, charity, draw, and
winner-management platform built for **Digital Heroes**.

The application uses **Next.js 14 (App Router)**, **TypeScript**,
**Tailwind CSS**, and **Supabase**. It uses Supabase Auth and PostgreSQL
as the source of truth, with database constraints, triggers, and Row
Level Security (RLS) enforcing the rules that matter.

There is no localStorage-based source of truth and no seeded fake
production data.

------------------------------------------------------------------------

## Features

-   Real email/password authentication with Supabase Auth
-   Separate subscriber and administrator accounts
-   Protected administrator account creation using a server-side setup
    key
-   Subscriber dashboard
-   Administrator dashboard
-   Subscription lifecycle management
-   Score tracking
-   Rolling five-score logic
-   One score per date
-   Charity directory and charity selection
-   Independent donations
-   Draw simulation and publishing
-   Winner management and proof submission
-   Jackpot rollover tracking
-   Reports and analytics
-   PostgreSQL Row Level Security
-   Database-level protection against unauthorized role and winner-field
    changes
-   Live public statistics on the landing page

------------------------------------------------------------------------

## Tech Stack

-   **Framework:** Next.js 14, App Router
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS
-   **Authentication:** Supabase Auth
-   **Database:** PostgreSQL via Supabase
-   **Security:** Supabase RLS, PostgreSQL constraints, triggers, and
    server-side authorization
-   **Deployment:** Compatible with Vercel and other Next.js hosting
    platforms

------------------------------------------------------------------------

## Project Structure

``` text
.
├── app/
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── charities.ts
│   │   ├── donations.ts
│   │   ├── draws.ts
│   │   ├── profile.ts
│   │   ├── scores.ts
│   │   └── winners.ts
│   │
│   ├── admin/
│   │   ├── AdminClient.tsx
│   │   └── page.tsx
│   │
│   ├── dashboard/
│   │   ├── DashboardClient.tsx
│   │   └── page.tsx
│   │
│   ├── login/
│   │   └── page.tsx
│   │
│   └── page.tsx
│
├── components/
│   ├── admin/
│   │   ├── CharityManagement.tsx
│   │   ├── DrawManagement.tsx
│   │   ├── ReportsAnalytics.tsx
│   │   ├── UserManagement.tsx
│   │   └── WinnersManagement.tsx
│   └── ...
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── ticket.ts
│   └── types.ts
│
├── supabase/
│   └── schema.sql
│
├── middleware.ts
├── .env.example
└── package.json
```

------------------------------------------------------------------------

## Getting Started

### 1. Clone the repository

``` bash
git clone <your-repository-url>
cd <your-repository-folder>
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Create a Supabase project

Create a project in [Supabase](https://supabase.com).

Open the Supabase SQL Editor and run the complete contents of:

``` text
supabase/schema.sql
```

This creates the required tables, constraints, triggers, functions, and
RLS policies.

The schema does not rely on seeded fake users or fake application data.

### 4. Configure environment variables

Create `.env.local` from `.env.example`:

``` bash
cp .env.example .env.local
```

Configure the required values:

``` env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_or_secret_key
ADMIN_SIGNUP_KEY=your_private_admin_setup_key
```

### Security Notes

The following variables must remain server-side:

``` env
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SIGNUP_KEY=
```

Do **not** prefix either variable with `NEXT_PUBLIC_`.

The service-role/secret key can bypass normal RLS and must never be
exposed to browser-side code.

`ADMIN_SIGNUP_KEY` is used only by the server-side admin account
creation flow.

### 5. Start the development server

``` bash
npm run dev
```

Open:

``` text
http://localhost:3000
```

------------------------------------------------------------------------

## Application Routes

  Route          Purpose                                        Access
  -------------- ---------------------------------------------- ---------------------
  `/`            Public landing page and platform information   Public
  `/login`       Sign in and account creation                   Public
  `/dashboard`   Subscriber dashboard                           Authenticated users
  `/admin`       Administration console                         Admins only

------------------------------------------------------------------------

## Authentication and Authorization

Authentication is handled by **Supabase Auth**.

Authorization is enforced at multiple layers:

1.  **Middleware** protects authenticated application routes.
2.  **Server Components** verify the current authenticated user.
3.  **The `/admin` page** verifies that the user's profile has
    `role = 'admin'`.
4.  **PostgreSQL RLS policies** enforce which rows the authenticated
    user can read or modify.
5.  **Database triggers and constraints** prevent protected fields from
    being changed through direct database requests.

### Subscriber Access

A subscriber can access their own profile and user-specific application
data.

Subscribers cannot:

-   Read other subscribers' profiles
-   Change their own role to `admin`
-   Modify another user's scores or data
-   Publish draws
-   Approve or modify protected winner fields

### Administrator Access

Administrators can access the administration console and the records
required for platform management.

The database policy for profiles follows the same rule:

``` sql
id = auth.uid()
OR public.is_admin()
```

This means a subscriber sees their own profile while an administrator
can query all profiles permitted by the database policy.

------------------------------------------------------------------------

## Admin Account Creation

Administrator creation is intentionally different from normal subscriber
signup.

A normal signup creates a subscriber account.

An administrator account requires:

1.  The user selects **Admin** during signup.
2.  The private `ADMIN_SIGNUP_KEY` is supplied.
3.  The server validates that key.
4.  The server uses the Supabase Admin API with the server-only service
    key.
5.  The new Supabase user receives:

``` text
app_metadata.role = admin
```

6.  The database trigger creates the corresponding profile with:

``` text
role = admin
```

The administrator then signs in through the same authentication system.

There is no client-side mechanism that allows a subscriber to promote
themselves.

------------------------------------------------------------------------

## Database Model

The main tables are:

  -----------------------------------------------------------------------
  Table                               Purpose
  ----------------------------------- -----------------------------------
  `profiles`                          User identity, role, subscription
                                      state, charity selection, and
                                      account metadata

  `scores`                            Subscriber scoring records

  `charities`                         Charity directory

  `donations`                         Independent donations

  `draws`                             Published draw records and jackpot
                                      information

  `winners`                           Draw winners, proof, payout, and
                                      review state
  -----------------------------------------------------------------------

All application data is stored in PostgreSQL through Supabase.

------------------------------------------------------------------------

## Database Integrity

Important business rules are enforced at the database level rather than
relying only on the UI.

Examples include:

-   Score range validation
-   One score per user per date
-   Rolling five-score calculation
-   Protected profile roles
-   Protected winner fields
-   Admin-only operations
-   User-specific RLS access
-   Admin access to platform-wide records

This means the rules still apply even if someone bypasses the React
interface and sends requests directly to the database API.

------------------------------------------------------------------------

## Draw System

The draw system separates simulation from publishing.

### Simulation

A draw can be simulated as a preview without committing the result.

### Publishing

Publishing a draw:

-   Recalculates the required data from the current database state
-   Creates the draw record
-   Creates the associated winner records
-   Applies the relevant jackpot/rollover logic
-   Is restricted to administrators through authorization and RLS

The draw weighting is based on ticket-number frequency generated from
active subscribers' scores.

------------------------------------------------------------------------

## Architecture

``` text
                    ┌─────────────────────┐
                    │    Next.js App      │
                    │   App Router / TS   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        Server Actions    Server Components   Client UI
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Supabase Auth     │
                    │  Session / Identity │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ PostgreSQL / RLS    │
                    │ Constraints/Triggers│
                    └─────────────────────┘
```

### Server Actions

Application writes are performed through Server Actions, including:

-   Authentication
-   Profile/subscription operations
-   Score operations
-   Charity management
-   Donations
-   Draw simulation/publishing
-   Winner proof and review operations

The database remains the final authority for authorization and data
integrity.

------------------------------------------------------------------------

## Design Decisions

### PostgreSQL as the source of truth

Application state that matters is stored in Supabase PostgreSQL rather
than localStorage.

This allows multiple users and devices to interact with the same
dataset.

### Database-level security

Authorization is not treated as a UI feature.

RLS, constraints, and triggers provide protection even when requests do
not originate from the application's normal interface.

### Separate admin creation flow

Admin privileges are intentionally excluded from ordinary subscriber
signup.

The server-side setup key and Supabase Admin API provide a controlled
bootstrap mechanism without exposing privileged credentials to the
browser.

### Server-side draw publishing

Draw publishing is performed server-side against current database state
rather than trusting values supplied by the client.

------------------------------------------------------------------------

## Explicit Assumptions

The original product requirements leave several implementation details
open. The following decisions were made for this build.

### Pool funding rate

The platform uses a fixed pool funding rate of **30%**, represented by:

``` text
POOL_FUNDING_RATE
```

in `lib/types.ts`.

This is separate from the charity allocation percentage.

### Draw weighting

The draw algorithm weights ticket numbers according to their frequency
across active subscribers' generated tickets.

Tickets are generated deterministically from the relevant Stableford
scores.

### Winner proof

The product requirements call for a screenshot of scores as winner
proof.

The current implementation stores a proof URL/reference in:

``` text
winners.proof_url
```

rather than implementing direct Supabase Storage uploads.

### Payments

The product requirements reference Stripe.

A payment gateway is **not currently wired into this implementation**.
The current subscription action changes the subscription state directly.

Real payment processing is therefore a known remaining integration
rather than something this repository claims to implement.

------------------------------------------------------------------------

## Current Limitations

The following features are intentionally not implemented yet:

-   Real payment processing
-   Direct screenshot/file uploads through Supabase Storage
-   Production payment webhook handling
-   Payment reconciliation and failed-payment recovery

These can be added without replacing the existing authentication and RLS
architecture.

------------------------------------------------------------------------

## Development

Run the development server:

``` bash
npm run dev
```

Build for production:

``` bash
npm run build
```

Start the production build:

``` bash
npm start
```

Run linting:

``` bash
npm run lint
```

------------------------------------------------------------------------

## Environment Variables

Required:

``` env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SIGNUP_KEY=
```

### Public variables

``` env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

These may be used by browser-side Supabase clients.

### Server-only variables

``` env
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SIGNUP_KEY=
```

These must never be exposed to the client or committed to Git.

------------------------------------------------------------------------

## Git Safety

Do not commit:

``` text
.env
.env.local
.env.*.local
```

Do not place Supabase service-role/secret keys or the admin setup key in
source code.

If a privileged key is ever exposed publicly, rotate it immediately.

------------------------------------------------------------------------

## Status

**Current implementation:** Functional full-stack prototype with real
Supabase authentication, PostgreSQL persistence, RLS authorization,
subscriber/admin dashboards, scoring, charity, donation, draw, and
winner workflows.

**Company:** Digital Heroes

**Product:** FortuneArc
