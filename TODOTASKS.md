# E-Commerce Platform - Product Overview

## Project Architecture

### Services
1. **Nest.js API Gateway** - Core API with REST + GraphQL
2. **Laravel Admin Panel** - Admin dashboard with React frontend
3. **Shared Database** - PostgreSQL (shared between Nest.js and Laravel)
4. **Redis** - Caching and session management
5. **Elasticsearch** - Advanced search functionality
6. **Nginx** - Reverse proxy (future)

---

## Database Schema - Entities

### Total Entities: 8

#### 1. **User Entity**
- `id` (UUID, Primary Key)
- `email` (unique)
- `password` (hashed)
- `firstName`
- `lastName`
- `phone`
- `role` (enum: 'customer' | 'admin')
- `isActive` (boolean)
- `emailVerifiedAt` (timestamp, nullable)
- `createdAt`
- `updatedAt`
- **Relationships:**
  - One-to-Many: Orders

#### 2. **Product Entity**
- `id` (UUID, Primary Key)
- `name`
- `slug` (unique)
- `description` (text)
- `sku` (unique)
- `price` (decimal)
- `compareAtPrice` (decimal, nullable)
- `costPrice` (decimal, nullable)
- `stock` (integer)
- `lowStockThreshold` (integer)
- `weight` (decimal, nullable)
- `status` (enum: 'draft' | 'active' | 'archived')
- `isFeatured` (boolean)
- `metaTitle` (string, nullable)
- `metaDescription` (text, nullable)
- `categoryId` (UUID, Foreign Key)
- `createdAt`
- `updatedAt`
- **Relationships:**
  - Many-to-One: Category
  - One-to-Many: ProductImages
  - One-to-Many: OrderItems
  - Many-to-Many: Tags (through ProductTag)

#### 3. **Category Entity**
- `id` (UUID, Primary Key)
- `name`
- `slug` (unique)
- `description` (text, nullable)
- `parentId` (UUID, Foreign Key, nullable) - for nested categories
- `image` (string, nullable)
- `isActive` (boolean)
- `sortOrder` (integer)
- `metaTitle` (string, nullable)
- `metaDescription` (text, nullable)
- `createdAt`
- `updatedAt`
- **Relationships:**
  - Self-referential: Parent/Children (nested categories)
  - One-to-Many: Products

#### 4. **Order Entity**
- `id` (UUID, Primary Key)
- `orderNumber` (string, unique)
- `userId` (UUID, Foreign Key)
- `status` (enum: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded')
- `subtotal` (decimal)
- `tax` (decimal)
- `shipping` (decimal)
- `discount` (decimal)
- `total` (decimal)
- `currency` (string, default: 'USD')
- `paymentStatus` (enum: 'pending' | 'paid' | 'failed' | 'refunded')
- `paymentMethod` (string, nullable)
- `shippingAddress` (JSON)
- `billingAddress` (JSON)
- `notes` (text, nullable)
- `shippedAt` (timestamp, nullable)
- `deliveredAt` (timestamp, nullable)
- `createdAt`
- `updatedAt`
- **Relationships:**
  - Many-to-One: User
  - One-to-Many: OrderItems

#### 5. **OrderItem Entity**
- `id` (UUID, Primary Key)
- `orderId` (UUID, Foreign Key)
- `productId` (UUID, Foreign Key)
- `quantity` (integer)
- `price` (decimal) - snapshot at time of order
- `subtotal` (decimal)
- `createdAt`
- `updatedAt`
- **Relationships:**
  - Many-to-One: Order
  - Many-to-One: Product

#### 6. **ProductImage Entity**
- `id` (UUID, Primary Key)
- `productId` (UUID, Foreign Key)
- `url` (string)
- `alt` (string, nullable)
- `isPrimary` (boolean)
- `sortOrder` (integer)
- `createdAt`
- `updatedAt`
- **Relationships:**
  - Many-to-One: Product

#### 7. **Inventory Entity** (for inventory management)
- `id` (UUID, Primary Key)
- `productId` (UUID, Foreign Key, unique)
- `quantity` (integer)
- `reserved` (integer) - for pending orders
- `available` (integer) - calculated: quantity - reserved
- `lastRestockedAt` (timestamp, nullable)
- `createdAt`
- `updatedAt`
- **Relationships:**
  - One-to-One: Product

#### 8. **Tag Entity** (for product tagging)
- `id` (UUID, Primary Key)
- `name` (unique)
- `slug` (unique)
- `createdAt`
- `updatedAt`
- **Relationships:**
  - Many-to-Many: Products (through ProductTag junction table)

---

## API Endpoints Overview

### Nest.js API Gateway - REST Endpoints

#### **Authentication Endpoints** (4)
- `POST /api/auth/register` - Customer registration
- `POST /api/auth/login` - Login (Customer/Admin)
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout

#### **Product Endpoints** (5)
- `GET /api/products` - List products (with pagination, filters, search)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

#### **Category Endpoints** (5)
- `GET /api/categories` - List categories (with nested structure)
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category (Admin only)
- `PUT /api/categories/:id` - Update category (Admin only)
- `DELETE /api/categories/:id` - Delete category (Admin only)

#### **Order Endpoints** (6)
- `GET /api/orders` - List orders (filtered by user role)
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order (with inventory check)
- `PUT /api/orders/:id/status` - Update order status (Admin only)
- `POST /api/orders/:id/cancel` - Cancel order
- `GET /api/orders/:id/invoice` - Get order invoice

#### **User Endpoints** (4)
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `GET /api/users` - List users (Admin only)
- `GET /api/users/:id` - Get user details (Admin only)

#### **Cart Endpoints** (4) - Optional, can be session-based
- `GET /api/cart` - Get cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:id` - Update cart item
- `DELETE /api/cart/items/:id` - Remove cart item

#### **Search Endpoints** (1)
- `GET /api/search` - Advanced search (Elasticsearch)

**Total REST Endpoints: ~29**

---

### GraphQL Endpoints

#### **GraphQL Endpoint** (1)
- `POST /api/graphql` - GraphQL endpoint

#### **GraphQL Queries** (8)
- `products` - Query products with filters
- `product(id)` - Get single product
- `categories` - Query categories
- `category(id)` - Get single category
- `order(id)` - Get order details
- `orders` - Query orders
- `me` - Get current user
- `search(query)` - Search products/categories

#### **GraphQL Mutations** (8)
- `createProduct` - Create product (Admin)
- `updateProduct` - Update product (Admin)
- `deleteProduct` - Delete product (Admin)
- `createOrder` - Create order
- `updateOrderStatus` - Update order status (Admin)
- `cancelOrder` - Cancel order
- `register` - Register new user
- `login` - Login user

**Total GraphQL Operations: 16**

---

### Laravel Admin Panel - REST Endpoints

#### **Admin Authentication** (3)
- `POST /admin/login` - Admin login
- `POST /admin/logout` - Admin logout
- `GET /admin/user` - Get admin user

#### **Dashboard Endpoints** (4)
- `GET /admin/dashboard/stats` - Dashboard metrics
- `GET /admin/dashboard/sales` - Sales data
- `GET /admin/dashboard/orders` - Recent orders
- `GET /admin/dashboard/products` - Product stats

#### **Product Management** (7)
- `GET /admin/products` - List products
- `GET /admin/products/:id` - Get product
- `POST /admin/products` - Create product
- `PUT /admin/products/:id` - Update product
- `DELETE /admin/products/:id` - Delete product
- `POST /admin/products/bulk-import` - Bulk import
- `GET /admin/products/export` - Export products

#### **Category Management** (5)
- `GET /admin/categories` - List categories
- `GET /admin/categories/:id` - Get category
- `POST /admin/categories` - Create category
- `PUT /admin/categories/:id` - Update category
- `DELETE /admin/categories/:id` - Delete category

#### **Order Management** (6)
- `GET /admin/orders` - List orders
- `GET /admin/orders/:id` - Get order
- `PUT /admin/orders/:id/status` - Update status
- `GET /admin/orders/reports/daily` - Daily report
- `GET /admin/orders/reports/weekly` - Weekly report
- `GET /admin/orders/reports/monthly` - Monthly report
- `GET /admin/orders/export/csv` - Export CSV
- `GET /admin/orders/export/pdf` - Export PDF

#### **User Management** (5)
- `GET /admin/users` - List users
- `GET /admin/users/:id` - Get user
- `POST /admin/users` - Create user
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user

**Total Laravel Admin Endpoints: ~30**

---

## GraphQL Usage

### Where GraphQL is Used:

1. **Nest.js API Gateway** - Primary GraphQL implementation
   - Location: `/api/graphql`
   - Use Cases:
     - Complex product queries with nested relationships
     - Flexible filtering and sorting
     - Real-time product search
     - Efficient data fetching for mobile apps
     - Public API for third-party integrations

2. **GraphQL Schema Areas:**
   - **Product Queries**: Complex filtering, nested category/product relationships
   - **Order Queries**: Nested order items with product details
   - **Search**: Advanced search with multiple filters
   - **Real-time Subscriptions**: Order status updates (WebSocket)

3. **GraphQL vs REST Decision:**
   - **REST**: Simple CRUD, file uploads, admin operations
   - **GraphQL**: Complex queries, mobile apps, public API, real-time features

---

## Technology Stack

### Nest.js API Gateway
- **Framework**: Nest.js 10
- **Database**: TypeORM + PostgreSQL
- **Cache**: Redis (cache-manager)
- **Search**: Elasticsearch
- **Queue**: Bull (Redis-based)
- **GraphQL**: Apollo Server
- **WebSockets**: Socket.io
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

### Laravel Admin Panel
- **Framework**: Laravel 10+
- **Frontend**: React (Inertia.js or separate SPA)
- **Database**: Eloquent ORM (shared PostgreSQL)
- **Cache**: Redis
- **Queue**: Laravel Queues (Redis)
- **File Storage**: Local/S3
- **PDF**: DomPDF or Snappy
- **Real-time**: Laravel Echo + Pusher/Socket.io

---

## Key Features & Requirements

### Authentication & Authorization
- JWT-based authentication
- Shared JWT between Nest.js and Laravel
- Role-based access control (Customer, Admin)
- Guards: `@Roles('admin')`, `@Public()`

### Product Module
- CRUD operations
- Image upload (multiple images)
- Category management (nested)
- Inventory tracking
- Redis caching
- Elasticsearch indexing
- Request logging middleware
- Unit tests for service layer

### Order Processing
- Order creation with validation
- Inventory availability check
- Mock payment processing
- Order confirmation email (queue job)
- Inventory update after order
- Event-driven architecture (optional)

### Admin Panel Features
- Laravel Breeze/Jetstream authentication
- Dashboard with metrics
- User management CRUD
- Product CRUD with image upload
- Category management (nested)
- Bulk operations (import/export)
- Soft deletes with restore
- Order management
- Sales reports (daily, weekly, monthly)
- CSV/PDF export
- Real-time notifications (Laravel Echo)

### Integration
- Service communication: Laravel → Nest.js (webhook/queue)
- API key authentication between services
- Shared database with transaction management
- Shared JWT token
- Shared user session

### DevOps
- Docker configuration for all services
- Nginx configuration for routing
- Environment variables setup
- Database seeding scripts
- CI/CD pipeline (bonus)

### Bonus Features
- Real-time features (WebSockets for order updates)
- GraphQL endpoint in Nest.js
- Advanced search with Elasticsearch
- Docker compose with all services
- CI/CD pipeline configuration

---

## Module Structure (Clean Architecture)

### Nest.js Structure
```
api-gateway/
├── domain/
│   ├── entities/          # 8 entities
│   └── interfaces/        # Repository interfaces
├── application/
│   ├── controllers/       # REST controllers
│   ├── resolvers/         # GraphQL resolvers
│   ├── services/          # Application services
│   ├── dto/               # Data Transfer Objects
│   └── guards/            # Auth guards
└── infrastructure/
    ├── persistence/       # TypeORM repositories
    ├── services/          # Redis, Elasticsearch
    └── migrations/        # Database migrations
```

### Laravel Structure
```
admin-service/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   └── Middleware/
│   ├── Models/            # Eloquent models
│   ├── Services/
│   └── Resources/         # API Resources
├── resources/
│   └── js/                # React frontend
└── database/
    └── migrations/
```

---

## Summary Statistics

- **Total Entities**: 8
- **Total REST Endpoints**: ~59 (29 Nest.js + 30 Laravel)
- **GraphQL Operations**: 16
- **Total API Endpoints**: ~75
- **Services**: 6 (API Gateway, Admin, PostgreSQL, Redis, Elasticsearch, Nginx)
- **Architecture**: Clean Architecture (Nest.js) + MVC (Laravel)

---

## Next Steps Priority

1. ✅ Fix modules and TypeORM (DONE)
2. ✅ Docker setup (DONE)
3. ⏭️ Create domain entities (8 entities)
4. ⏭️ Create database migrations
5. ⏭️ Implement authentication module
6. ⏭️ Implement product module (REST + GraphQL)
7. ⏭️ Implement order processing
8. ⏭️ Create Laravel admin service
9. ⏭️ Set up React frontend in Laravel
10. ⏭️ Implement Elasticsearch integration
11. ⏭️ Set up Swagger documentation
12. ⏭️ Create comprehensive README

