# 🚀 Quick Deployment Guide

## Your app is ready for production! Here's how to deploy:

### 🎯 Recommended: Split Deployment

#### **Frontend (Vercel)** - Free & Fast
```bash
npm i -g vercel
vercel
```
**Environment Variables to set in Vercel dashboard:**
- `VITE_GEMINI_API_KEY`: `AIzaSyArZGBt_iBF68xvGV1lraKjkyjNGnk6g1g`
- `VITE_API_URL`: `https://your-app.railway.app` (get this after backend deployment)

#### **Backend (Railway)** - Python & FFmpeg Included
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway auto-detects Python and deploys
4. Get your Railway app URL (like `https://video-to-text-production-xyz.railway.app`)
5. Update `VITE_API_URL` in Vercel with this URL

### ✅ What's Already Configured

- ✅ Environment variables setup
- ✅ API URLs use environment variables
- ✅ Railway deployment config (`railway.json`)
- ✅ Vercel deployment config (`vercel.json`)
- ✅ Python requirements updated
- ✅ CORS headers configured
- ✅ YouTube integration working

### 🛠️ Easy Deployment Script

Run: `./deploy.sh` and choose option 3 for full deployment

### 🌐 Production URLs

After deployment, you'll have:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-app.railway.app`

### 🔧 Local Development

Both servers are running and working:
- Frontend: http://localhost:5173 ✅
- Backend API: http://localhost:5002 ✅

Ready to deploy! 🎉