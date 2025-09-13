# Environment Variables Required for Vercel Deployment

## Required Environment Variables

### Server Configuration
- `PORT` - Server port (Vercel will set this automatically)
- `NODE_ENV` - Set to "production"
- `CLIENT_URL` - Your Vercel app URL (e.g., https://your-app.vercel.app)
- `SESSION_SECRET` - Random secret key for sessions

### Firebase Configuration
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_PRIVATE_KEY_ID` - Firebase service account private key ID
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account client email
- `FIREBASE_CLIENT_ID` - Firebase service account client ID
- `FIREBASE_AUTH_URI` - Firebase auth URI (usually https://accounts.google.com/o/oauth2/auth)
- `FIREBASE_TOKEN_URI` - Firebase token URI (usually https://oauth2.googleapis.com/token)
- `FIREBASE_DATABASE_URL` - Firebase Realtime Database URL (optional)

### GitHub OAuth (Optional)
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret
- `GITHUB_CALLBACK_URL` - GitHub OAuth callback URL (e.g., https://your-app.vercel.app/api/auth/github/callback)

## How to set these in Vercel:
1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add each variable with the appropriate values