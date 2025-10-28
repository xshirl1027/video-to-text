# Vercel Deployment Guide

## 🚀 Recommended Deployment Strategy

Due to the nature of YouTube processing (requires FFmpeg, file handling, longer processing times), the best approach is:

### **Frontend: Vercel** ✅
- Perfect for React/Vite apps
- Fast global CDN
- Easy deployment

### **Backend: Railway/Render** ✅ 
- Better for Python Flask apps
- Persistent storage
- No timeout limits
- FFmpeg support

## 📋 Deployment Steps

### 1. **Prepare Frontend for Vercel**

Update API URLs to use environment variables:

```javascript
// In src/App.jsx, replace hardcoded URLs:
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5002';

// Then use:
fetch(`${API_BASE_URL}/api/extract-audio`, ...)
```

### 2. **Create Vercel Environment Variables**

In Vercel dashboard:
- `VITE_API_URL` = `https://your-backend-app.railway.app` (or your backend URL)

### 3. **Deploy Backend to Railway**

```bash
# Create railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "python youtube_api.py",
    "healthcheckPath": "/api/health"
  }
}
```

### 4. **Deploy Frontend to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

## 🛠️ Alternative: All-in-One Vercel Solution

If you prefer everything on Vercel, we can:
1. Use Vercel Edge Functions for lighter processing
2. Integrate with external APIs for heavy lifting
3. Use Vercel Blob storage for temporary files

Would you like me to implement either approach?