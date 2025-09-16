# Bhadrak Health Club - Online Supplement Store

A comprehensive e-commerce solution for Bhadrak Health Club's supplement store, featuring separate admin and customer portals with UPI payment approval workflow.

## 🌟 Features

### Customer Portal
- **Product Catalog**: Browse supplements by category with search functionality
- **Shopping Cart**: Add, remove, and modify quantities of products
- **Checkout Process**: Multi-step checkout with customer information and payment options
- **Payment Methods**: Cash on Delivery and UPI payment options
- **Responsive Design**: Mobile-friendly interface

### Admin Portal  
- **Dashboard**: Overview of sales, orders, and revenue statistics
- **Product Management**: Add, edit, delete, and manage supplement inventory
- **Order Management**: View and update order statuses
- **Payment Approvals**: Approve or reject UPI payments from customers
- **Sales Analytics**: Track business performance metrics

### Payment Workflow
- **Cash Orders**: Automatically approved upon placement
- **UPI Orders**: Require admin approval in the admin portal
- **Status Tracking**: Real-time updates for payment and order status

## 🛠 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Authentication**: JWT tokens for admin sessions
- **Styling**: Custom CSS with responsive design

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## 🚀 Installation & Setup

### 1. Clone or Navigate to Project Directory
```bash
cd bhadrak-health-club-store
```

### 2. Install Dependencies
```bash
# Install dependencies for all modules
npm run install:all
```

Or install individually:
```bash
# Backend dependencies
cd backend && npm install

# Return to root and install for admin portal  
cd ../admin-portal && npm install

# Return to root and install for user store
cd ../user-store && npm install
```

### 3. Start the Backend Server
```bash
# From project root
npm run dev:backend

# Or from backend directory
cd backend && npm start
```

The API server will start on `http://localhost:3001`

### 4. Start the Admin Portal
```bash
# From project root  
npm run dev:admin

# Or serve manually (if you have a local server)
# Navigate to admin-portal/index.html in your browser
```

### 5. Start the Customer Store
```bash
# From project root
npm run dev:user

# Or serve manually (if you have a local server)  
# Navigate to user-store/index.html in your browser
```

## 🔐 Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

## 📖 Usage Guide

### For Customers
1. **Browse Products**: Visit the customer store and explore supplements by category
2. **Add to Cart**: Select products and add them to your shopping cart
3. **Checkout**: Provide customer information and choose payment method
4. **Place Order**: Complete the order placement process
5. **Payment**: 
   - Cash orders are immediately approved
   - UPI orders require admin approval

### For Admins
1. **Login**: Access admin portal with provided credentials
2. **Dashboard**: View business metrics and recent orders
3. **Manage Products**: Add new supplements, update prices and inventory
4. **Process Orders**: Update order statuses and track deliveries  
5. **Approve Payments**: Review and approve UPI payment requests
6. **Monitor Sales**: Track revenue and business performance

## 🏗 Project Structure

```
bhadrak-health-club-store/
├── backend/                 # Node.js API server
│   ├── server.js           # Main server file
│   ├── database.js         # Database schema and initialization
│   ├── package.json        # Backend dependencies
│   └── .env               # Environment variables
├── admin-portal/           # Admin web interface  
│   ├── index.html         # Admin portal HTML
│   ├── admin.js           # Admin portal JavaScript
│   └── styles.css         # Admin portal styling
├── user-store/            # Customer web interface
│   ├── index.html         # Customer store HTML
│   ├── store.js           # Customer store JavaScript  
│   └── styles.css         # Customer store styling
└── package.json           # Root package.json with scripts
```

## 📊 Database Schema

### Tables
- **admin_users**: Admin authentication
- **products**: Supplement inventory
- **customers**: Customer information  
- **orders**: Order details and status
- **order_items**: Individual order line items

### Sample Data
The database initializes with:
- Default admin user
- Sample supplement products (Whey Protein, Creatine, BCAA, etc.)

## 🔧 API Endpoints

### Public Endpoints
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/orders` - Create new order
- `GET /api/categories` - Get product categories

### Admin Endpoints (Require Authentication)
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/dashboard` - Dashboard statistics
- `POST /api/admin/products` - Add new product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/payment` - Update payment status
- `PUT /api/admin/orders/:id/status` - Update order status

## 🎨 Customization

### Adding New Product Categories
1. Update the category options in `admin-portal/index.html`
2. Categories are automatically populated in the customer store

### Modifying Payment Methods
1. Update payment options in `user-store/index.html`
2. Modify payment logic in `user-store/store.js`
3. Update backend validation in `backend/server.js`

### Styling Changes
- Admin Portal: Modify `admin-portal/styles.css`
- Customer Store: Modify `user-store/styles.css`

## 🔒 Security Features

- JWT-based admin authentication
- Input validation and sanitization
- CORS protection
- SQL injection prevention with parameterized queries

## 📱 Mobile Responsiveness

Both portals are fully responsive and work seamlessly on:
- Desktop computers
- Tablets  
- Mobile phones

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Ensure Node.js is installed
- Check if port 3001 is available
- Verify dependencies are installed

**Database errors:**
- Database file is created automatically
- Check file permissions in project directory

**Admin can't login:**
- Use default credentials: admin/admin123
- Clear browser cache and try again

**Products not loading:**
- Ensure backend server is running
- Check browser console for errors
- Verify API endpoints are accessible

## 🔄 Development Scripts

```bash
# Start backend development server
npm run dev:backend

# Start admin portal development  
npm run dev:admin

# Start user store development
npm run dev:user

# Install all dependencies
npm run install:all

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Support

For support or questions about this project:

1. Check the troubleshooting section above
2. Review the API endpoints and ensure proper usage
3. Verify all dependencies are correctly installed
4. Check browser console for JavaScript errors

## 🔮 Future Enhancements

Potential features for future development:
- Email notifications for orders
- Advanced reporting and analytics  
- Customer registration and login
- Loyalty points system
- Integration with external payment gateways
- Inventory management alerts
- Order tracking with delivery status

---

**Built with ❤️ for Bhadrak Health Club**