# MIGRATION_CHECKLIST.md

This checklist tracks the migration from the legacy CRA app in client/ to the Next.js 14 app in web/.

Core setup
- [x] Ensure Node 18+ and install all deps (npm run install-all)
- [x] Dev both services (npm run dev)
- [x] Configure web/.env.local with NEXT_PUBLIC_* vars (API and Firebase)
- [x] Confirm API at http://localhost:5000 and web at http://localhost:3000

Routes (App Router in web/app)
- [x] Home (/)
- [x] Projects list (/projects)
- [x] Project details (/projects/[id])
- [x] New project (/projects/new)
- [x] Dashboard (/dashboard)
- [x] Messages (/messages and /messages/[conversationId])
- [x] Applications (/applications)
- [x] Profile (/profile)
- [ ] Teams (/teams) — create page with my/team projects views
- [ ] Settings (/settings) — create page and wire Firebase account actions
- [ ] Admin (/admin) — create page with basic system overview and projects table

Components and libraries
- [x] Use web/lib/api.ts for fetch + JSON + caching hints
- [x] Use web/lib/authClient.ts to attach Authorization: Bearer <token>
- [x] Initialize Firebase client in web/lib/firebase.ts
- [ ] Port any missing UI from client/src/components to web/components
- [ ] Replace any remaining axios usage with api() helper in Next.js code

Styles and assets
- [x] Tailwind configured in web; global styles in @/styles/globals.css
- [ ] If Bootstrap is needed temporarily, install in web and import in layout
- [ ] Move static assets from client/public to web/public (path-compatible)

Realtime (Socket.IO)
- [x] socket.io-client available in web
- [ ] Initialize socket in client components that need realtime; join expected rooms (user_, team_, conversation_)

Verification
- [ ] Type-check web: npx tsc -p web --noEmit
- [ ] Lint web: npm --prefix web run lint
- [ ] Manual QA for all migrated routes

Decommission
- [ ] Remove client/ from active use and update docs once feature parity is reached
