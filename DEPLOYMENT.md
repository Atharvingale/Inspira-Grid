# Inspira-Grid Deployment Guide

## 🚀 Deployment to Vercel

This guide will walk you through deploying Inspira-Grid to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. A [Firebase project](https://console.firebase.google.com/)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Project Structure

This is a monorepo with two main parts:
- **web/** - Next.js frontend application
- **server/** - Express.js backend API

## Step 1: Firebase Setup

### 1.1 Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password, Google, GitHub)
4. Create a Firestore database
5. Set up Storage (optional)

### 1.2 Get Firebase Credentials

#### Client SDK (for Next.js):
1. Go to Project Settings > General
2. Under "Your apps", click "Add app" and select Web
3. Copy the configuration object

#### Admin SDK (for Express.js):
1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file (keep it secure!)

## Step 2: Deploy Backend (Express.js)

### 2.1 Deploy to Vercel
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New" > "Project"
4. Import your repository
5. **IMPORTANT**: Set the root directory to `server`
6. Vercel will detect it's a Node.js app

### 2.2 Configure Environment Variables
In Vercel project settings, add these environment variables:

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-frontend.vercel.app

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Session
SESSION_SECRET=generate-a-random-string

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=https://your-backend.vercel.app/api/github/callback
```

### 2.3 Deploy
Click "Deploy" and wait for the build to complete. Note your backend URL.

## Step 3: Deploy Frontend (Next.js)

### 3.1 Deploy to Vercel
1. Create another new project in Vercel
2. Import the same repository
3. **IMPORTANT**: Set the root directory to `web`
4. Vercel will detect it's a Next.js app

### 3.2 Configure Environment Variables
Add these environment variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.vercel.app

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Emulator (set to false for production)
NEXT_PUBLIC_USE_EMULATOR=false
```

### 3.3 Deploy
Click "Deploy" and wait for the build to complete.

## Step 4: Post-Deployment Setup

### 4.1 Update CORS Settings
In your backend Vercel project, ensure CORS is configured for your frontend URL.

### 4.2 Firebase Security Rules
Set up proper Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read
    match /{document=**} {
      allow read: if request.auth != null;
    }
    
    // Specific write rules for each collection
    match /users/{userId} {
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /projects/{projectId} {
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.ownerId || 
         request.auth.token.admin == true);
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.ownerId;
    }
  }
}
```

### 4.3 Test Your Deployment
1. Visit your frontend URL
2. Try registering a new account
3. Create a test project
4. Test all major features

## Alternative Deployment Options

### Deploy as Single App
If you prefer to deploy as a single application:

1. Use the root `vercel.json` configuration
2. Deploy from the root directory
3. Vercel will handle both frontend and backend

### Deploy Backend to Other Services

#### Railway
```bash
railway login
railway init
railway add
railway up
```

#### Render
1. Create a Web Service
2. Connect your GitHub repo
3. Set root directory to `server`
4. Add environment variables
5. Deploy

#### Heroku
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
# Add all other env variables
git push heroku main
```

## Troubleshooting

### Build Fails
- Check all environment variables are set correctly
- Ensure Firebase credentials are valid
- Check build logs for specific errors

### API Connection Issues
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS configuration
- Ensure backend is running

### Authentication Issues
- Verify Firebase configuration
- Check authorized domains in Firebase Console
- Ensure client and server Firebase configs match

### Database Issues
- Check Firestore security rules
- Verify service account has correct permissions
- Check Firebase project ID matches

## Environment Variables Reference

### Required for Frontend (web/)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_FIREBASE_*` - All Firebase client config
- `NEXT_PUBLIC_USE_EMULATOR` - Set to "false" for production

### Required for Backend (server/)
- `NODE_ENV` - Set to "production"
- `CLIENT_URL` - Frontend URL for CORS
- `FIREBASE_*` - All Firebase admin SDK config
- `SESSION_SECRET` - Random string for sessions

## Monitoring & Analytics

### Vercel Analytics
Enable analytics in your Vercel dashboard for both projects.

### Firebase Performance Monitoring
1. Enable Performance Monitoring in Firebase Console
2. Monitor app performance and user metrics

### Error Tracking
Consider adding Sentry for error tracking:
```bash
npm install @sentry/nextjs @sentry/node
```

## CI/CD Pipeline

### GitHub Actions
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Support

For issues or questions:
- Check the [Issues](https://github.com/your-repo/issues) section
- Review Firebase documentation
- Check Vercel deployment guides

## License

MIT License - see LICENSE file for details