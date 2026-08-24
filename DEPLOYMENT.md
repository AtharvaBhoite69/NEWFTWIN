# 🚀 FTWIN Deployment Guide

FTWIN is configured for seamless deployment on **Vercel** (Frontend) + **Render / Railway** (Backend & Database).

---

## Part 1: Deploy Backend (Render or Railway)

### Option A: Deploy to Render (Free & Fast)
1. Push your repository to **GitHub**.
2. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Environment**: `Node`
5. Under **Environment Variables**, add:
   ```env
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=your-random-jwt-secret-key-here-12345
   JWT_REFRESH_SECRET=your-random-jwt-refresh-secret-67890
   GROQ_API_KEY=your_groq_api_key_here
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```
6. Click **Create Web Service**.
7. Copy your backend live URL (e.g. `https://ftwin-backend.onrender.com`).

---

### Option B: Deploy to Railway
1. Go to [railway.app](https://railway.app/) and create a **New Project** → **Deploy from GitHub repo**.
2. Select your repository.
3. In Service Settings:
   - **Root Directory**: `server`
   - **Custom Build Command**: `npm install && npm run build`
   - **Custom Start Command**: `npm run start`
4. In **Variables**, add:
   ```env
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-jwt-refresh-secret
   GROQ_API_KEY=your_groq_api_key
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```
5. Click **Deploy**. Copy the public domain URL.

---

## Part 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com/) and click **Add New...** → **Project**.
2. Import your GitHub repository.
3. In the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` (Click "Edit" and select `client`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   ```env
   VITE_API_URL=https://ftwin-backend.onrender.com
   ```
   *(Replace with your actual backend URL from Part 1)*
5. Click **Deploy**!

---

## Part 3: Connect Frontend & Backend

1. Once Vercel gives you your frontend domain (e.g. `https://ftwin.vercel.app`):
2. Go back to your Render/Railway backend environment variables.
3. Update `CORS_ORIGIN`:
   ```env
   CORS_ORIGIN=https://ftwin.vercel.app
   ```
4. Save and redeploy backend.

🎉 **Your app is now live with full frontend, backend API, AI financial advisor, and all 141+ credit card images mapped!**
