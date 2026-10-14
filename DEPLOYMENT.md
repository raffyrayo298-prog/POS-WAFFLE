# Vercel Deployment Guide

This guide will help you deploy the Waffle King POS system to Vercel.

## Prerequisites

- A Vercel account (free tier is sufficient)
- Git repository (GitHub, GitLab, or Bitbucket)
- Node.js installed locally (for testing)

## Quick Deployment

### Option 1: Deploy via Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to the `brew-pos` directory:
   ```bash
   cd brew-pos
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel
   ```

5. Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? (select your account/team)
   - Link to existing project? **No** (or select existing if applicable)
   - Project name: `waffle-king-pos` (or your preferred name)
   - In which directory is your code located? **./** (current directory)
   - Want to override settings? **No** (we've configured everything in vercel.json)

6. After successful deployment, run `vercel --prod` to deploy to production.

### Option 2: Deploy via Vercel Dashboard

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to [vercel.com](https://vercel.com) and log in

3. Click **"Add New..."** → **"Project"**

4. Import your repository

5. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `brew-pos` (or leave empty if repo root is brew-pos)
   - **Build Command**: `npm run build` (auto-detected from package.json)
   - **Output Directory**: `.` (root directory)

6. Click **"Deploy"**

## Configuration Details

### vercel.json

The project includes a `vercel.json` configuration file that handles:

- **Build Command**: Runs `npm run build` to compile Tailwind CSS
- **Output Directory**: Serves from the root directory
- **Headers**: Configures service worker headers and security headers
- **Rewrites**: Ensures all routes are handled correctly

### Build Process

The build process:
1. Installs dependencies (`npm install`)
2. Runs `npm run build` which compiles Tailwind CSS
3. Serves static files (HTML, CSS, JS)

### Environment Variables

Currently, Firebase configuration is hardcoded in `js/config.js`. For production:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables (optional - if you want to override the defaults):
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`
   - `FIREBASE_MEASUREMENT_ID`

**Note**: The current setup uses default Firebase credentials that work. You only need to set these if you want to use your own Firebase project.

## Deployment Checklist

- [x] vercel.json configured with build settings
- [x] package.json includes build script
- [x] .vercelignore excludes unnecessary files
- [x] Tailwind CSS builds successfully
- [x] Service worker configured for offline support
- [x] Firebase configuration in place

## Post-Deployment Steps

1. **Test the deployment**:
   - Visit your Vercel URL
   - Test the landing page (index.html)
   - Test the POS app (app.html)
   - Test the admin portal (admin.html)
   - Test login/signup flows

2. **Verify Firebase connectivity**:
   - The app uses Firebase by default
   - Check browser console for any Firebase errors
   - Test offline functionality (service worker)

3. **Customize domain** (optional):
   - Go to Vercel project settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

4. **Monitor deployment**:
   - Check Vercel dashboard for build logs
   - Monitor for any runtime errors
   - Set up analytics if desired

## Troubleshooting

### Build Fails

If the build fails:
1. Check that `node_modules` is not ignored incorrectly
2. Verify Tailwind CSS is installed: `npm list tailwindcss`
3. Check build logs in Vercel dashboard

### Styles Not Loading

If styles don't load:
1. Verify `styles.output.css` is generated during build
2. Check that CSS files are referenced correctly in HTML
3. Clear browser cache

### Service Worker Issues

If service worker has issues:
1. Check browser console for registration errors
2. Verify sw.js is being served
3. Unregister old service workers in DevTools

### Firebase Errors

If Firebase has errors:
1. Verify Firebase project is accessible
2. Check Firebase console for any security rule issues
3. Ensure Firebase SDK versions are compatible

## Files Deployed

The deployment includes:
- All HTML files (index.html, app.html, admin.html, login.html, signup.html, etc.)
- Compiled CSS (styles.output.css)
- JavaScript modules (js/*.js)
- Libraries (lib/*.js)
- Assets (images/, assets/)
- Service worker (sw.js)
- Manifest (manifest.json)

Excluded (via .vercelignore):
- node_modules/
- Development documentation
- Test files
- Print bridge utility
- Firebase debug logs

## Performance Optimization

The deployment is optimized for:
- **Static serving**: All files are static, no server-side processing
- **CDN**: Vercel's global CDN for fast delivery
- **HTTPS**: Automatic SSL certificate
- **Service Worker**: Offline-first caching
- **Minimal bundle**: Only essential files deployed

## Support

For issues:
- Check Vercel deployment logs
- Review browser console for errors
- Consult Firebase documentation for backend issues
- Test locally with `npm start` to verify before deployment

## Next Steps

After successful deployment:
1. Customize the branding (colors, logo, shop name)
2. Set up Firebase security rules
3. Configure payment processing if needed
4. Add custom domain
5. Set up monitoring and analytics
