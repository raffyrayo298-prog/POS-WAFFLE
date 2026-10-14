# Waffle King POS - Setup Instructions

## Default Admin Credentials
- **Email:** admin123@waffleking.com
- **Password:** Admin123

## Quick Start Guide

### 1. Firebase Setup (Optional - for multi-device sync)
If you want to use Firebase for real-time sync across devices:

1. Go to Firebase Console (https://console.firebase.google.com/)
2. Create a new project named "waffle-king-pos"
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"
4. Create Realtime Database:
   - Go to Realtime Database → Create Database
   - Choose any region
   - Start in "Test Mode" (or use the rules below)
5. Copy your Firebase config and update `js/config.js`
6. Publish the database rules from `database.rules.json`

### 2. Local Storage Mode (Default - Works immediately)
The system works with local storage by default - no setup needed! Just open `index.html` in a browser.

### 3. Database Rules for Firebase
If using Firebase, publish these rules in the Firebase Console:
- File: `database.rules.json`
- Go to Realtime Database → Rules → Publish

## System Features

### For Cashiers (app.html)
- **Order Tab:** Take orders, add items to cart, process payments
- **History Tab:** View order history, reprint receipts, cancel orders (admin only)
- **Settings Tab:** Configure printer, view shop settings (admin can edit products)

### For Admins (admin.html)
- **Dashboard:** Real-time sales tracking, today's revenue, live feed of orders
- **Inventory:** Stock levels, restock items, view stock movement history
- **Reports:** Generate sales reports, print reports, export to CSV
- **Analytics:** Revenue trends, top products, ROI analysis

## Product Management
Admins can add/edit products via Settings → Products in the POS app:
- Name, category, price
- Stock levels and low-stock thresholds
- Unit costs for profit calculations
- Image URLs (optional)
- Product variants (e.g., sizes with price adjustments)

## Database File Location
The system uses browser localStorage by default. Data is stored in:
- **Browser:** localStorage (local mode)
- **Firebase:** Realtime Database (if configured)

## File Structure
```
brew-pos/
├── admin.html          # Admin dashboard
├── app.html            # POS terminal for cashiers
├── index.html          # Entry point (redirects based on auth)
├── login.html          # Staff login
├── signup.html         # Create new staff accounts
├── database.rules.json # Firebase security rules
├── css/
│   └── styles.css      # Custom styles
├── js/
│   ├── backend.js      # Backend selector (local vs Firebase)
│   ├── backend-local.js # Local storage implementation
│   ├── backend-firebase.js # Firebase implementation
│   ├── config.js       # Firebase configuration
│   ├── app.js          # Main POS app shell
│   ├── admin-app.js    # Admin dashboard shell
│   ├── admin-dashboard.js # Dashboard view
│   ├── admin-inventory.js  # Inventory management
│   ├── admin-reports.js    # Sales reports
│   ├── admin-analytics.js  # Analytics & ROI
│   ├── order-view.js   # Order taking interface
│   ├── history-view.js # Order history
│   ├── settings-view.js # Settings & product management
│   ├── cart.js         # Shopping cart logic
│   ├── printer.js      # Thermal printer integration
│   ├── auth-guard.js   # Authentication guards
│   └── utils.js        # Shared utilities
└── print-bridge/
    ├── server.js       # Local print bridge for WiFi printers
    └── README.md       # Print bridge documentation
```

## First-Time Setup
1. Open `index.html` in a browser
2. Login with: admin123@waffleking.com / Admin123
3. Go to Settings → Products to customize your menu
4. Go to Settings → Shop details to set your shop name and tax rate
5. Configure printer in Settings if needed

## Troubleshooting
- **Login issues:** Ensure you're using the exact credentials above
- **Firebase errors:** Check that Email/Password auth is enabled in Firebase Console
- **Printer issues:** See print-bridge/README.md for WiFi printer setup
- **Data not syncing:** Verify Firebase config in js/config.js

## Important Notes
- The first account created automatically becomes admin
- Existing staff accounts can only use the POS (not admin dashboard)
- Stock is automatically decremented when orders are completed
- Cancelled orders return items to stock automatically
- Admins can adjust stock manually via Inventory → Restock
