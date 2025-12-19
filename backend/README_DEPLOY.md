# Vercel Deployment Guide

## Backend Deployment

### Step 1: Vercel Account Setup
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Import your repository

### Step 2: Deploy Backend
1. In Vercel dashboard, click "New Project"
2. Select your repository
3. **Root Directory**: Set to `backend`
4. **Framework Preset**: Other
5. **Build Command**: Leave empty (or `npm install`)
6. **Output Directory**: Leave empty
7. **Install Command**: `npm install`

### Step 3: Environment Variables
Add these in Vercel project settings:
- `MONGODB_URI` = `mongodb://localhost:27017/wheelspin` (or your MongoDB URI)
- `PORT` = `3001` (optional, Vercel sets this automatically)

### Step 4: Deploy
Click "Deploy" and wait for deployment to complete.

Your backend will be available at: `https://your-project.vercel.app/api`

---

## Frontend Deployment

### Step 1: Deploy Frontend
1. In Vercel dashboard, click "New Project"
2. Select your repository (same or different)
3. **Root Directory**: Set to `frontend`
4. **Framework Preset**: Vite
5. **Build Command**: `npm run build` (auto-detected)
6. **Output Directory**: `dist` (auto-detected)
7. **Install Command**: `npm install`

### Step 2: Environment Variables (Optional)
If you want to use different API URL:
- `VITE_API_BASE_URL` = `https://your-backend.vercel.app/api`

### Step 3: Deploy
Click "Deploy" and wait for deployment to complete.

Your frontend will be available at: `https://your-frontend.vercel.app`

---

## Important Notes

1. **Backend URL**: After backend deployment, update frontend `src/config/api.js` with your backend URL
2. **CORS**: Backend CORS is already configured to allow all origins
3. **MongoDB**: Make sure MongoDB is accessible from Vercel (use MongoDB Atlas for cloud)
4. **File Upload**: Backend uses memory storage (Vercel compatible)

## Quick Deploy Commands

### Using Vercel CLI:

**Backend:**
```bash
cd backend
vercel
```

**Frontend:**
```bash
cd frontend
vercel
```

