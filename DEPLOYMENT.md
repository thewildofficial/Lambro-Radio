s# Deployment Guide

## Backend (Render)

1. **Deploy to Render:**
   - Connect your GitHub repository to Render
   - Create a new Web Service
   - Set the build command: `pip install -r requirements.txt`
   - Set the start command: `python main.py`
   - Set environment to Python 3.11+
   - Note your Render app URL (e.g., `https://your-app-name.onrender.com`)

2. **Update CORS settings:**
   - In `backend/main.py`, update the CORS origins list with your actual Vercel domain:
   ```python
   origins = [
       # ... existing origins ...
       "https://your-actual-vercel-domain.vercel.app",
   ]
   ```

## Frontend (Vercel)

1. **Update Environment Variables:**
   - **In your code**: Edit `/frontend/.env` and replace `https://your-app-name.onrender.com` with your actual Render URL
   - **Commit this change** - the `.env` file is tracked by git so Vercel will see it
   - **Alternative**: You can also set `BACKEND_URL` in Vercel dashboard under Settings → Environment Variables (this will override the .env file)

2. **Deploy:**
   - Connect your GitHub repository to Vercel
   - Vercel will automatically deploy on every push to main

## Keep-Alive Setup

The keep-alive system is now configured:

- **Backend**: Has `/keep-alive` and `/health` endpoints
- **Frontend**: Automatically pings backend every 10 minutes
- **Monitoring**: Shows connection status (in development only)

## Testing the Setup

1. **Local testing:**
   ```bash
   # Backend
   cd backend
   python main.py
   
   # Frontend (in new terminal)
   cd frontend
   npm run dev
   ```

2. **Production testing:**
   - Visit your Vercel URL
   - Check browser dev tools for any CORS errors
   - The keep-alive component will show connection status

## Environment Variables Summary

### How it works:
- **`.env`** - Contains production config, **IS committed to git**, Vercel can see it
- **`.env.local`** - Contains local overrides, **NOT committed to git**, only for your machine

### Frontend (.env) - COMMITTED TO GIT
```
BACKEND_URL=https://your-actual-render-url.onrender.com
```

### Frontend (.env.local) - NOT COMMITTED, LOCAL ONLY
```
BACKEND_URL=http://localhost:8000
```

### Setup Steps:
1. Edit `/frontend/.env` with your actual Render URL
2. Commit and push the change
3. Vercel will automatically use the URL from the committed `.env` file
4. Locally, `.env.local` will override it for development

## Notes

- The keep-alive component pings the backend every 10 minutes to prevent Render's free tier from spinning down
- In production, the keep-alive status indicator is hidden for cleaner UI
- CORS is configured to allow both your local development and production Vercel domains
