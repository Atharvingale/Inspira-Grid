# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Inspira-Grid is a full-stack collaborative platform for students, creators, and developers built with Next.js (frontend) and Express.js (backend) using Firebase services.

## Architecture

This is a monorepo structure with two main applications:

### Frontend (`web/`)
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with class-variance-authority
- **State Management**: React hooks with Firebase Realtime Database
- **Authentication**: Firebase Auth with react-firebase-hooks
- **Real-time Communication**: Socket.io-client

### Backend (`server/`)
- **Framework**: Express.js with Node.js
- **Authentication**: Firebase Admin SDK + Passport.js
- **Real-time**: Socket.io for WebSocket connections
- **Database**: Firebase Firestore
- **Session Management**: express-session

## Development Commands

### Initial Setup
```bash
# Install all dependencies for both frontend and backend
npm run install-all

# Or install separately
npm run server:install
npm run web:install

# Setup environment variables (currently not implemented)
npm run setup
```

### Development
```bash
# Run both frontend and backend concurrently
npm run dev

# Run frontend only (from web/)
cd web && npm run dev

# Run backend only (from server/)
cd server && npm run dev
```

### Build & Production
```bash
# Build frontend for production
npm run build

# Start production server
npm start

# Type check frontend
cd web && npm run type-check

# Lint frontend
cd web && npm run lint
```

### Testing
```bash
# Currently no tests configured
# Backend test placeholder exists: cd server && npm test
```

## Environment Variables

### Frontend (`web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_EMULATOR=false
```

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=
FIREBASE_TOKEN_URI=
FIREBASE_DATABASE_URL=
SESSION_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/github/callback
```

## Code Structure

### Frontend Routes (App Router)
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/dashboard` - Main dashboard (protected)
- `/dashboard/projects` - Projects management
- `/dashboard/applications` - Application management
- `/dashboard/messages` - Messaging interface
- `/dashboard/teams` - Team collaboration
- `/dashboard/profile` - User profile
- `/settings` - User settings
- `/admin` - Admin panel

### Backend API Endpoints
All endpoints are prefixed with `/api` and require Firebase token validation:
- `/api/auth` - Authentication operations
- `/api/github` - GitHub integration
- `/api/projects` - Project CRUD operations
- `/api/applications` - Job/project applications
- `/api/messages` - Messaging system
- `/api/users` - User management

### Service Layer Architecture
The frontend uses a centralized service layer (`web/lib/services/`) for API interactions:
- `baseService.ts` - Base class with common functionality
- `authService.ts` - Authentication operations
- `projectService.ts` - Project-related operations
- `userService.ts` - User management operations
- `applicationService.ts` - Application/job requests operations
- `messageService.ts` - Messaging and conversations
- `notificationService.ts` - Notifications and alerts

## Real-time Features

Socket.io events handled:
- `join_user_room` - Join personal notification room
- `join_conversation` - Join chat room
- `leave_conversation` - Leave chat room
- `join_team_room` - Join team collaboration room
- `typing_start/typing_stop` - Typing indicators

## Database Structure

### Firestore Collections
- `users` - User profiles and settings
- `projects` - Project information and metadata
- `applications` - Job/project applications
- `messages` - Message threads and conversations
- `teams` - Team collaboration data
- `notifications` - User notifications

## Key Dependencies

### Frontend
- `next@15.5.3` - React framework
- `firebase@10.7.1` - Firebase client SDK
- `react-firebase-hooks@5.1.1` - Firebase React hooks
- `framer-motion@12.23.16` - Animation library
- `socket.io-client@4.8.1` - WebSocket client
- `tailwindcss@3.4.0` - CSS framework
- `zod@4.1.11` - Schema validation

### Backend
- `express@5.1.0` - Web framework
- `firebase-admin@13.5.0` - Firebase Admin SDK
- `socket.io@4.8.1` - WebSocket server
- `passport@0.7.0` - Authentication middleware
- `helmet@8.1.0` - Security headers
- `express-rate-limit@8.1.0` - Rate limiting
- `cloudinary@2.7.0` - Image management

## Deployment

The project is configured for Vercel deployment with:
- Frontend deployed at root `web/`
- Backend deployed at root `server/`
- Environment variables must be configured in Vercel dashboard
- CORS configured for production URLs

See `DEPLOYMENT.md` and `QUICK_DEPLOY.md` for detailed deployment instructions.

## Security Considerations

- Firebase token validation on all API routes
- Helmet.js for security headers
- CORS configured for specific origins
- Session management with secure cookies in production
- Rate limiting on API endpoints
- Input validation with express-validator

## Common Development Tasks

### Adding a New API Endpoint
1. Create route file in `server/routes/`
2. Add route to `server/server.js`
3. Create corresponding service in `web/lib/services/`
4. Update TypeScript types in `web/types/`

### Adding a New Page
1. Create page component in `web/app/[route]/page.tsx`
2. Add navigation link if needed
3. Implement authentication check if protected

### Modifying Database Schema
1. Update Firestore security rules
2. Update TypeScript interfaces in `web/types/`
3. Update corresponding backend models in `server/models/`

### Working with Real-time Features
1. Emit Socket.io events from backend routes
2. Listen for events in React components using useEffect
3. Clean up listeners on component unmount

## TypeScript Configuration

The frontend uses TypeScript with:
- Strict mode enabled
- Path aliases configured (`@/*` for root)
- Next.js plugin for enhanced type checking
- Target ES2017 for compatibility

## Performance Optimizations

- Images configured for remote patterns (Google profile pictures)
- Socket.io fallback configuration for Webpack
- Proper code splitting with Next.js dynamic imports
- Service layer uses singleton pattern to prevent memory leaks