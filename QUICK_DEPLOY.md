# 🚀 Quick Deploy to Vercel

## Deploy in 5 minutes!

### Prerequisites
- GitHub account with this repo
- Vercel account
- Firebase project

### Step 1: Deploy Backend
1. Go to [Vercel](https://vercel.com/new)
2. Import your GitHub repository
3. **Set root directory**: `server`
4. Add these environment variables:
   ```
   NODE_ENV=production
   CLIENT_URL=https://your-frontend.vercel.app
   FIREBASE_PROJECT_ID=xxx
   FIREBASE_PRIVATE_KEY=xxx
   FIREBASE_CLIENT_EMAIL=xxx
   SESSION_SECRET=random-string-here
   ```
5. Deploy!

### Step 2: Deploy Frontend
1. Create new project in Vercel
2. Import same repository
3. **Set root directory**: `web`
4. Add these environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.vercel.app/api
   NEXT_PUBLIC_FIREBASE_API_KEY=xxx
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
   NEXT_PUBLIC_FIREBASE_APP_ID=xxx
   NEXT_PUBLIC_USE_EMULATOR=false
   ```
5. Deploy!

### Step 3: Update URLs
1. Update `CLIENT_URL` in backend with your frontend URL
2. Update `NEXT_PUBLIC_API_URL` in frontend with your backend URL
3. Redeploy both

### That's it! 🎉

Your app should now be live at your Vercel URLs.

## Common Issues

### Build Errors
- Make sure all Firebase environment variables are set
- Check that URLs don't have trailing slashes

### CORS Issues
- Verify CLIENT_URL in backend matches your frontend URL exactly
- Check browser console for specific CORS errors

### Auth Issues
- Add your Vercel domain to Firebase Authorized Domains
- Go to Firebase Console > Authentication > Settings > Authorized Domains

## Need Help?
Check the full [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.