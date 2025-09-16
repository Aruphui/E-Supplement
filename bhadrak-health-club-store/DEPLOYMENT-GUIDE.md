# Bhadrak Health Club - Vercel Deployment Guide

## 📋 Prerequisites

1. **GitHub Account**: You need a GitHub account to deploy on Vercel
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Node.js**: Version 18 or higher installed locally

## 🚀 Step-by-Step Deployment Instructions

### Step 1: Prepare Your Code

1. **Initialize Git Repository** (if not already done):
   ```bash
   cd C:\Users\ahui1\E-Supplement\bhadrak-health-club-store
   git init
   git add .
   git commit -m "Initial commit - Bhadrak Health Club Store"
   ```

2. **Create GitHub Repository**:
   - Go to [GitHub](https://github.com) and create a new repository
   - Name it: `bhadrak-health-club-store`
   - Don't initialize with README (since we already have files)

3. **Push Code to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/bhadrak-health-club-store.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Vercel

1. **Login to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Your Repository**:
   - Click "New Project"
   - Select "Import Git Repository"
   - Choose your `bhadrak-health-club-store` repository

3. **Configure Project Settings**:
   - **Project Name**: `bhadrak-health-club-store`
   - **Framework Preset**: Leave as "Other" (we have custom config)
   - **Root Directory**: Leave empty (uses root)
   - **Build Command**: Leave empty (handled by vercel.json)
   - **Output Directory**: Leave empty
   - **Install Command**: `cd backend && npm install`

### Step 3: Environment Variables

1. **Add Environment Variables**:
   - In Vercel project settings, go to "Environment Variables"
   - Add the following:
     ```
     Name: JWT_SECRET
     Value: bhadrak_health_club_secret_key_2024_production
     ```

2. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete (usually 1-2 minutes)

### Step 4: Access Your Application

Once deployed, you'll get URLs like:
- **User Store**: `https://your-project-name.vercel.app/`
- **Admin Portal**: `https://your-project-name.vercel.app/admin`

## 🔧 Post-Deployment Configuration

### Admin Access
- **Username**: `admin`
- **Password**: `admin123`

### Features Available:
✅ User registration and login  
✅ Product catalog with categories  
✅ Shopping cart and checkout  
✅ Order history for users  
✅ Admin dashboard with analytics  
✅ Sales filtering (weekly/monthly/yearly)  
✅ Logo management  
✅ Modern responsive design  
✅ UPI payment approval workflow  

## 📁 Project Structure

```
bhadrak-health-club-store/
├── backend/                 # Node.js API server
│   ├── server.js           # Main server file
│   ├── database.js         # SQLite database logic
│   ├── package.json        # Backend dependencies
│   └── uploads/            # Logo and file uploads
├── user-store/             # Customer frontend
│   ├── index.html          # Main store page
│   ├── store.js            # Store functionality
│   ├── styles.css          # Modern styling
│   └── config.js           # Environment config
├── admin-portal/           # Admin frontend
│   ├── index.html          # Admin dashboard
│   ├── admin.js            # Admin functionality
│   ├── styles-modern.css   # Modern admin styling
│   └── config.js           # Environment config
├── vercel.json             # Vercel deployment config
├── package.json            # Root package file
└── .gitignore             # Git ignore rules
```

## 🛠 Local Development

To run the project locally:

```bash
cd C:\Users\ahui1\E-Supplement\bhadrak-health-club-store

# Install backend dependencies
cd backend
npm install

# Start the server
npm run dev

# Open in browser:
# User Store: http://localhost:3001 (served statically by backend)
# Admin Portal: http://localhost:3001/admin
```

## 📊 Database Information

- **Type**: SQLite (serverless, perfect for Vercel)
- **Location**: `backend/bhadrak_health_club.db`
- **Auto-initialization**: Database and tables are created automatically on first run
- **Default Admin**: Username: `admin`, Password: `admin123`

## 🔒 Security Features

- JWT-based authentication for both users and admin
- Password hashing with bcrypt
- Protected API routes
- Input validation and sanitization
- File upload restrictions (images only, 5MB max)

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🎨 UI/UX Features

- Modern glassmorphism design
- Dark theme with gradient backgrounds
- Smooth animations and transitions
- Interactive charts and analytics
- Toast notifications
- Loading states
- Modal dialogs

## 🔄 Updates and Maintenance

To update the deployed application:

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```
3. Vercel will automatically redeploy

## 🆘 Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check that all dependencies are in `backend/package.json`
   - Ensure Node.js version is 18+ in `package.json`

2. **API Not Working**:
   - Verify environment variables are set in Vercel dashboard
   - Check the Functions tab in Vercel for error logs

3. **Database Issues**:
   - SQLite database is created automatically
   - Check if admin credentials work: username: `admin`, password: `admin123`

4. **File Uploads Not Working**:
   - Vercel has limitations on file uploads
   - Consider using external storage (Cloudinary, AWS S3) for production

## 📞 Support

For technical support or questions:
- Check Vercel deployment logs
- Review browser console for frontend errors
- Ensure all environment variables are properly set

## 🎯 Success Checklist

After deployment, verify:
- [ ] User store loads at main URL
- [ ] Admin portal loads at `/admin`
- [ ] User registration works
- [ ] Product catalog displays
- [ ] Shopping cart functions
- [ ] Checkout process works
- [ ] Admin login works
- [ ] Dashboard analytics display
- [ ] Logo upload/management works
- [ ] All styling appears correctly
- [ ] Mobile responsiveness works

Your Bhadrak Health Club supplement store is now ready for production use! 🎉