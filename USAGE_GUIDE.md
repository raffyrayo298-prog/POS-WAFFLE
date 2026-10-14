# Waffle King POS - Usage Guide

## 🔐 Default Login Credentials

### Admin Account
- **Email**: `admin123@waffleking.com`
- **Password**: `Admin123`
- **Access**: Full admin access (Dashboard, Inventory, Settings, POS)

### Staff/Cashier Account
You can create staff accounts via the signup page:
- **Email**: Your choice
- **Password**: Minimum 6 characters
- **Access**: POS only (cannot access Admin Portal)

## 🚀 Getting Started

### First Time Setup
1. Open http://localhost:8080 in your browser
2. Use the default admin credentials to log in
3. The system will automatically seed with:
   - 3 Categories: Waffle, Drinks, Others
   - Sample products in each category
   - Default admin account

### If You Need to Reset Data
1. Go to http://localhost:8080/reset-data.html
2. Click "Clear All Data & Reset"
3. This will clear all data and re-seed with default products

## 📱 POS System (app.html)

### For Cashiers/Staff
1. Log in at http://localhost:8080/login.html
2. Use the dropdown to select categories:
   - **Waffle**: Classic, Chocolate, Strawberry, Banana, Nutella
   - **Drinks**: Hot Coffee, Iced Coffee, Milktea, Frappe, Latte
   - **Others**: Donut, Sandwich, Fries, Burger
3. Click products to add to cart
4. Adjust quantities in the modal
5. Click "Charge" to complete the order
6. Select payment method (Cash, Card, E-wallet)
7. For cash payments, enter amount tendered
8. Receipt will print automatically (if printer connected)

### For Admins
Admins can also use the POS with full access to all features.

## 📊 Admin Portal (admin.html)

### Dashboard
- **Today's Revenue**: Total sales for the day
- **Today's Orders**: Number of orders completed
- **Items Sold Today**: Total items sold
- **Average Order Value**: Average transaction amount
- **Live Sales Feed**: Real-time order updates
- **Top Sellers Today**: Best-selling products
- **Low Stock Alerts**: Products that need restocking

### Inventory
- View all products with stock levels
- Filter by: All products, Low stock, Out of stock
- **Restock**: Add/remove stock (logged for tracking)
- **Edit**: Modify product details
- **Delete**: Remove products from catalog
- **Recent Stock Movements**: Log of all inventory changes

### Settings (Admin Only)
- **Printer Setup**:
  - Bluetooth: Connect directly from browser (Chrome/Edge)
  - WiFi: Use local print-bridge server
  - Test print to verify connection
- **Shop Details**:
  - Shop name
  - Currency symbol
  - Tax rate
  - Receipt footer text
- **Categories**: Add, edit, delete menu categories
- **Products**: Add, edit, delete products with variants

## 🔧 Printer Setup

### Bluetooth Printer
1. Go to Settings in Admin Portal
2. Click "Connect via Bluetooth"
3. Select your printer from the list
4. Status will show "Connected - [Printer Name]"
5. Use "Test print" to verify

### WiFi Printer
1. Ensure print-bridge server is running (see README in print-bridge folder)
2. Enter printer IP address and port (default 9100)
3. Click "Use this printer"
4. Test print to verify

### Browser Print Fallback
If no printer is connected, the system will automatically open the browser print dialog for receipts.

## 📦 Inventory Management

### Adding Products
1. Go to Admin Portal → Settings → Products
2. Click "+ Add product"
3. Fill in:
   - Name
   - Category
   - Base price
   - Starting stock
   - Unit cost (for margin calculation)
   - Low-stock threshold
   - Image URL (optional)
   - Variants (e.g., "Small:0, Medium:15, Large:25")
4. Click "Save product"

### Restocking
1. Go to Admin Portal → Inventory
2. Find the product
3. Click "Restock"
4. Enter quantity (positive to add, negative to remove)
5. Add optional note
6. Click "Save"

### Stock Movement Log
All stock changes are logged with:
- Date and time
- User who made the change
- Type (Sale, Restock, Adjustment, Return)
- Quantity change
- Stock after change
- Notes

## 🔄 Data Sync

The system uses localStorage for data storage, which means:
- All data is stored in your browser
- Works offline without internet
- Data syncs automatically between tabs
- **Note**: Data is not shared between different browsers/devices

For multi-device sync, configure Firebase in `js/config.js`.

## 🛠️ Troubleshooting

### Login Issues
- **Stuck on redirect loop**: Go to reset-data.html to clear data
- **Invalid credentials**: Use default admin account
- **Can't login**: Check browser console for errors

### Printer Issues
- **Bluetooth not working**: Use Chrome/Edge on desktop or Android
- **WiFi not working**: Ensure print-bridge server is running
- **Test print fails**: Check printer is powered on and connected

### Category/Product Issues
- **Products not showing**: Check category assignment
- **Wrong prices**: Edit product in Settings
- **Stock not updating**: Check browser console for errors

## 📞 Support

For issues or questions:
1. Check the browser console (F12) for error messages
2. Reset data if needed (see above)
3. Ensure you're using a supported browser (Chrome, Edge, Firefox)

## 🎯 Tips

- **For testing**: Use the reset-data.html page to start fresh
- **For production**: Configure Firebase for multi-device sync
- **For inventory**: Set low-stock thresholds to get alerts
- **For receipts**: Customize shop details in Settings
