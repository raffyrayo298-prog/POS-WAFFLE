# Brew POS - Point of Sale System

A responsive, touch-friendly point-of-sale system for coffee shops with offline support and Firebase sync.

## Features

- 🧇 **Order Management** - Create and manage orders with modifiers
- 📦 **Inventory Tracking** - Track stock levels and ingredients
- 📊 **Admin Dashboard** - Real-time sales tracking and analytics
- 📱 **Mobile Friendly** - Works on tablets and phones
- 🌐 **Offline Support** - Works without internet (localStorage)
- ☁️ **Firebase Sync** - Hybrid mode syncs data when online
- 🖨️ **Thermal Printing** - Support for Bluetooth thermal printers
- 🎨 **Custom UI** - Modern, professional design

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Build CSS
npm run build

# Start local server
npm start
```

Open `http://localhost:3000/app.html` in your browser.

## Deployment to Vercel

### Option 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd C:\Users\user\Downloads\brew-pos-admin\brew-pos
   vercel
   ```

4. **Follow the prompts**
   - Set project name (e.g., `brew-pos`)
   - Link to existing Vercel project or create new
   - Select default settings

5. **Production Deployment**
   ```bash
   vercel --prod
   ```

### Option 2: Using Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   # Create a GitHub repository and push
   ```

2. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure**
   - Framework Preset: "Other"
   - Build Command: `npm run build`
   - Output Directory: `.` (root directory)
   - Click "Deploy"

### Option 3: Using Vercel Git Integration

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy with Git**
   ```bash
   vercel link
   git add .
   git commit -m "Deploy to Vercel"
   git push
   ```

## Environment Variables (Optional)

If using Firebase, add these in Vercel Dashboard > Settings > Environment Variables:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## Configuration

### Firebase Setup (Optional)

1. Create a Firebase project at https://console.firebase.google.com
2. Add a web app to your project
3. Copy your Firebase config
4. Update `js/config.js` with your Firebase credentials

### Mode Selection

The app supports three backend modes:

- **Hybrid (Default)**: localStorage + Firebase sync when online
- **Local Only**: Add `?local=1` to URL
- **Firebase Only**: Add `?firebase=1` to URL

## File Structure

```
brew-pos/
├── admin.html              # Admin portal
├── app.html                # Main POS app
├── login.html              # Login page
├── signup.html             # Signup page
├── admin-login.html        # Admin login
├── admin-signup.html       # Admin signup
├── css/
│   ├── styles.css          # Tailwind CSS source
│   └── styles.output.css   # Compiled CSS
├── js/
│   ├── backend.js          # Backend selector
│   ├── backend-local.js    # localStorage backend
│   ├── backend-firebase.js # Firebase backend
│   ├── backend-sync.js     # Hybrid sync layer
│   ├── app.js              # Main app shell
│   ├── admin-app.js        # Admin shell
│   └── ... (other modules)
├── lib/
│   └── chart.umd.min.js    # Chart.js (local)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
└── package.json
```

## Building for Production

```bash
# Build CSS (minified)
npm run build:css:min

# The build command builds CSS automatically
npm run build
```

## Offline Capability

The app works offline by default:

1. First visit caches all assets via service worker
2. All data stored in localStorage
3. Firebase sync occurs when online
4. Works completely without internet after first load

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

## Support

For issues or questions, check the code documentation or create an issue in your repository.

## License

ISC
