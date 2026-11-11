# Smart Attendance Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 frontend for the Smart
Attendance platform. All API requests are proxied through `/api/*` to the
Laravel backend (same origin, no CORS).

## Architecture overview

The frontend uses a feature-based architecture. Route files stay thin; domain
logic lives in `src/features`; reusable UI lives in `src/components`.

```text
src/
├── app/                          # Routes, layouts, Next.js-specific files only
│   ├── (app)/                    # Authenticated shell (route group — no URL prefix)
│   │   ├── layout.tsx            #   Renders AppShell (client boundary)
│   │   └── <module>/page.tsx     #   Thin routes → feature views
│   ├── login/page.tsx            # Public login route → LoginForm
│   ├── layout.tsx                # Root layout: fonts (Inter, Plus Jakarta Sans), metadata
│   ├── page.tsx                  # Marketing landing page
│   └── globals.css               # Tailwind v4 theme tokens (colors, radii, shadows)
├── components/
│   ├── layout/                   # App shell: AppShell, Sidebar, Topbar, BottomTabBar
│   ├── ui/                       # Design-system primitives: Button, Input, Card, Badge,
│   │                              #   PageHeader, EmptyState, Spinner
│   └── shared/                   # Cross-feature widgets: BackendStatus, ModulePlaceholder
├── features/                     # One folder per domain module
│   └── <feature>/
│       ├── api.ts                # Feature API calls (endpoints live here, not in routes)
│       ├── types.ts              # Feature-specific types
│       └── components/           # Feature views and widgets
├── hooks/                        # Reusable client hooks (use-backend-status)
├── lib/
│   ├── api/
│   │   ├── client.ts             # apiFetch + ApiError (shared fetch infrastructure)
│   │   └── session.ts            # Token/user storage (localStorage)
│   └── utils/                    # Pure helpers (cx, name initials)
├── config/
│   └── nav.ts                    # Navigation items, sections, mobile tabs
└── types/                        # Cross-feature shared types (AuthUser)
```

### Dependency rules

- `src/app` imports from `features` and `components` only — never the reverse.
- `features/*` may import from `lib`, `components`, `config`, and `types`.
- `lib/api/session.ts` is shared infrastructure (the API client needs the
  token), which is why it lives in `lib` rather than `features/auth`.
- `components` must not import from `features` except through the shell
  (`AppShell` calls `features/auth/api` for logout).

## Folder responsibilities

| Folder | Responsibility |
|---|---|
| `app/` | Routing, layouts, metadata. Route files render exactly one feature view. |
| `components/layout/` | The application shell: collapsible sidebar, topbar, mobile tab bar, auth guard, logout. |
| `components/ui/` | Design-system primitives styled with the tokens in `globals.css`. |
| `components/shared/` | Widgets reused across features (API status chip, module placeholder). |
| `features/<name>/` | All code owned by a domain module (API calls, types, views). |
| `hooks/` | Reusable client-side hooks. |
| `lib/api/` | Fetch infrastructure and session storage. |
| `lib/utils/` | Pure functions with no React dependency. |
| `config/` | Navigation configuration (drives sidebar, mobile tabs, breadcrumbs). |
| `types/` | Types shared across features. |

## How to add a new feature

1. Create `src/features/<module>/` with `components/<Module>View.tsx`,
   plus `api.ts` and `types.ts` when the feature talks to the backend.
2. Register the module in `src/config/nav.ts` (label, href, icon, description,
   endpoint) so it appears in the sidebar, mobile menu, and placeholders.
3. Create the route `src/app/(app)/<module>/page.tsx`:

```tsx
import { ModuleView } from "@/features/<module>/components/ModuleView";

export const metadata = {
  title: "Module",
};

export default function ModulePage() {
  return <ModuleView />;
}
```

## How to add a new page (non-feature)

Add a folder under `src/app/` with a `page.tsx`. Server Components are the
default; add `"use client"` only when the page needs state, effects, or
browser APIs. Authenticated pages belong inside the `(app)` route group so
they get the shell and the auth guard.

## API integration conventions

- All HTTP calls go through `apiFetch` in `src/lib/api/client.ts`:
  - attaches `Authorization: Bearer <token>` from the session automatically;
  - JSON-encodes the `body` option;
  - throws `ApiError` with `.status` and `.errors` (Laravel 422 field errors).
- Endpoint paths live in the owning feature's `api.ts`, never in route files.
- Laravel responses are wrapped in a `{ data: ... }` envelope; unwrap in the
  feature `api.ts` (see `features/dashboard/api.ts`).
- A `401` from an authenticated call means the session is stale: clear it with
  `clearSession()` and redirect to `/login` (see `DashboardView`).
- Login stores the token and user via `setSession`; the shell guard reads them
  with `getToken` / `getStoredUser`.

## Naming conventions

- Components: `PascalCase.tsx` files with named exports (`export function Sidebar`).
- Route files keep Next.js defaults (`page.tsx`, `layout.tsx`) with default exports.
- Features and routes: kebab-case folders matching the URL (`class-sections` → `/class-sections`).
- Hooks: `use-<name>.ts` with a named `use<Name>` export.
- Client hooks/views that need interactivity carry `"use client"`; route files
  and static views stay as Server Components.

## Development commands

```bash
npm run dev        # Local dev server (uses API_PROXY_URL, default http://localhost:8001)
npm run build      # Production build (runs TypeScript check + static generation)
npm start          # Serve the production build
```

Inside Docker Compose (from the repository root):

```bash
docker compose up -d --build frontend
```

## Testing and verification

There is no frontend unit test suite yet. Verify changes with:

```bash
npm run build      # TypeScript check + prerender of all 15 routes
```

Backend tests (not frontend):

```bash
docker compose exec -T app php artisan test
```

Known gaps: no ESLint configuration and no frontend test runner are installed
yet. Adding both is recommended before the team scales up.
