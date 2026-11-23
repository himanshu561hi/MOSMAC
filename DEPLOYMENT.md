# MOSMAC E-Commerce Deployment Guide

This project is structured as a full-stack monorepo:
- **Frontend**: React + Vite + Tailwind CSS + Redux Toolkit (Optimized for **Netlify**)
- **Backend**: Node.js + Express + Mongoose + JWT (Optimized for **Vercel** serverless)

---

## 🚀 Step 1: Deploy Backend on Vercel

1. **Log in to Vercel**: [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. **Import Git Repository**: Select `MOSMAC` (`https://github.com/himanshu561hi/MOSMAC.git`).
3. **Configure Project Settings**:
   - **Framework Preset**: `Other`
   - **Root Directory**: Select `backend` (or leave root as `.` since root `vercel.json` is also provided).
   - **Build Command**: `echo 'Backend ready'` (or leave default)
   - **Output Directory**: Leave empty
4. **Environment Variables**:
   Under **Settings > Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas connection string (`mongodb+srv://...`)
   - `JWT_ACCESS_SECRET`: A secure 32+ character random secret
   - `JWT_REFRESH_SECRET`: A secure 32+ character random secret
   - `CORS_ORIGIN`: `https://<your-site>.netlify.app,http://localhost:5173` *(Update with your exact Netlify domain after deploying frontend)*
   - `COOKIE_SAME_SITE`: `none`
   - `CLOUDINARY_CLOUD_NAME`: *(Optional for media uploads)*
   - `CLOUDINARY_API_KEY`: *(Optional)*
   - `CLOUDINARY_API_SECRET`: *(Optional)*
   - `RAZORPAY_KEY_ID`: *(Optional for payments)*
   - `RAZORPAY_KEY_SECRET`: *(Optional)*
   - `ADMIN_EMAIL`: `admin@mosmac.com`
   - `ADMIN_PASSWORD`: `YourAdminPassword123!`
5. Click **Deploy**.
6. Once deployed, note down your backend URL (e.g., `https://mosmac-backend.vercel.app`).
   Your API endpoints will be live at `https://mosmac-backend.vercel.app/api/v1/health`.

---

## 🌐 Step 2: Deploy Frontend on Netlify

1. **Log in to Netlify**: [netlify.com](https://app.netlify.com) and click **"Add new site" > "Import an existing project"**.
2. **Connect Git Provider**: Select GitHub and choose the `MOSMAC` repository.
3. **Site Configuration**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. **Environment Variables**:
   Under **Site configuration > Environment variables**, add:
   - `VITE_API_BASE_URL`: `https://<your-backend-app>.vercel.app/api/v1` *(Replace with your Vercel URL from Step 1)*
5. Click **Deploy site**.
6. Once deployed, note down your Netlify site URL (e.g., `https://mosmac.netlify.app`).

---

## 🔄 Step 3: Link CORS on Vercel Backend

1. In your **Vercel** dashboard for the backend project, go to **Settings > Environment Variables**.
2. Update `CORS_ORIGIN` to include your live Netlify domain:
   `https://mosmac.netlify.app,http://localhost:5173`
3. Trigger a redeploy on Vercel (Deployments > Redeploy) to apply the CORS update.
