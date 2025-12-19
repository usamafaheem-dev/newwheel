# Vercel Deployment - No vercel.json Needed!

Modern Vercel automatically detects Express.js apps. **You don't need vercel.json file!**

## Deployment Steps:

### Option 1: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your repository
4. **Settings:**
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

5. **Environment Variables:**
   - `MONGODB_URI` = `mongodb://localhost:27017/wheelspin`
   - (or your MongoDB Atlas URI)

6. Click "Deploy"

### Option 2: Vercel CLI

```bash
cd backend
npm i -g vercel
vercel
```

## Important:

- **No vercel.json needed** - Vercel auto-detects Express.js
- Make sure `server.js` exports the app: `export default app`
- All routes should start with `/api/`
- CORS is already configured in server.js

## If you still get errors:

1. Make sure Root Directory is set to `backend` in Vercel dashboard
2. Check Environment Variables are set correctly
3. Verify MongoDB connection string is correct

