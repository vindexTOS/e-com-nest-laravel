# E-Commerce Platform

Hybrid e-commerce platform with Nest.js API Gateway and Laravel Admin Panel. Built with Clean Architecture principles, featuring JWT authentication, role-based access control, and shared authentication between services.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start Setup](#quick-start-setup)
- [API Documentation](#api-documentation)

---

## Architecture Overview

This application implements all the requirements from the assignment, but I've added my own architectural decisions to make it more scalable and maintainable.

The core idea is to separate read and write operations using CQRS (Command Query Responsibility Segregation). I've set up two PostgreSQL database instances - one for writes and one for reads. The write database handles all mutations (creates, updates, deletes) while the read database is optimized for queries. This approach makes sense for e-commerce applications since they typically have way more reads than writes.

For the NestJS side, I went with Clean Architecture, separating the codebase into three distinct layers: domain (business logic), application (controllers), and infrastructure (services, database, cache). This makes the codebase much easier to test and maintain.

On the Laravel side, I chose GraphQL for all endpoints because the assignment specifically asked for it. NestJS also has a GraphQL endpoint, so you can use either REST or GraphQL depending on your preference.

The system uses an event-driven architecture, especially for the ordering flow. When an order is created, we emit several events - one for sending emails, another for payment processing, and so on. For notification updates, I'm using webhooks with API key authentication for demonstration purposes, which call Laravel endpoints that update the write database and publish Redis events for syncing to the read database.

Speaking of Redis, I'm using it to sync data between the read and write databases. When something changes in the write database, we publish a Redis event that triggers a sync to the read database. This keeps both databases in sync without adding unnecessary complexity.

For real-time updates, we use two different approaches. On the user side, we use Socket.IO - when a user is created or updated, it emits an event that pushes the updated information to all connected clients. On the admin dashboard, we use Laravel Echo with Soketi (a Pusher-compatible server) for live notification updates. This is also part of the ordering event flow - when an order is created, admins get instant notifications.

To handle product searches and caching, we've integrated Elasticsearch and Redis. Products are indexed in Elasticsearch for fast full-text search, and we use Redis to cache frequently accessed data, reducing the load on the database.

The whole system is containerized with Docker Compose, making it easy to spin up all services with a single command. All services communicate through a shared network, and Nginx acts as a reverse proxy to route requests to the appropriate service.

---

## Quick Start Setup

### Step 1: Clone and Start

```bash
git clone https://github.com/vindexTOS/e-com-nest-laravel.git
cd e-com-nest-laravel
docker compose up -d --build

```
#### for legacy docker
```
docker-compose up -d --build

```
```
It takes few seconds for nestjs API gateway to load, in this time nginx might return 502 gateway error 
```

Wait for all services to start (this may take a few minutes on first run).

### Step 2: Access the Application

#### Admin Dashboard
- **URL**: http://localhost/admin
- **Email**: `admin@gmail.com`
- **Password**: `1234567`

#### User/Customer Dashboard
- **URL**: http://localhost
- **Email**: `user@gmail.com`
- **Password**: `1234567`

### Step 3: Seed Products (Optional)

1. Log in to the admin dashboard at http://localhost/admin
2. Navigate to the **Products** page
3. Click the **"Seed Products"** button to generate sample products

### Step 4: Run Tests

```bash
./cicd/test.sh
```

This will run all NestJS service unit tests.

---

## Nginx Reverse Proxy

The application uses **Nginx** as a reverse proxy to route requests to the appropriate services. All services are accessible through `http://localhost` (port 80).

### Nginx Configuration

The Nginx configuration (`nginx/nginx.conf`) routes requests as follows:

- **`/`** → Laravel Admin Service (frontend dashboard)
- **`/api/admin-api/`** → Laravel Admin Service API endpoints
- **`/api/gateway/`** → NestJS API Gateway endpoints
- **`/api/documentation`** → Laravel Swagger documentation
- **`/api/gateway/docs`** → NestJS API Gateway Swagger documentation

### Routing Rules

1. **Root Path (`/`)**: Serves the Laravel admin dashboard (React frontend)
2. **Admin API (`/api/admin-api/*`)**: Proxies to Laravel admin service API
3. **Gateway API (`/api/gateway/*`)**: Proxies to NestJS API Gateway
4. **All other paths**: Default to Laravel admin service

### Accessing Services Directly

While Nginx handles routing, you can also access services directly:

- **API Gateway**: http://localhost:3000 (internal Docker network)
- **Admin Service**: http://localhost:8000 (internal Docker network)

> **Note**: Direct access may not work from your host machine. Use `http://localhost` (port 80) for all access through Nginx.

## API Documentation

### Base URLs

- **Nginx Proxy (Recommended)**: `http://localhost`
- **NestJS API Gateway (Direct)**: `http://localhost:3000`
- **Laravel Admin Service (Direct)**: `http://localhost:8000`
- **GraphQL Endpoint**: `http://localhost/graphql`
- **Socket.IO Endpoint**: `http://localhost/socket.io`
- **Laravel Echo / Soketi (WebSocket)**: `http://localhost/app/` (Pusher-compatible)

### Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your-access-token>
```

**How to get a token:**
1. **GraphQL API**: Login via GraphQL mutation at `http://localhost/admin-api/graphql` (see [GraphQL API](#graphql-api) section)
   - Use `login` mutation for customers
   - Use `adminLogin` mutation for admins
   - Use `register` mutation to create new accounts
2. **NestJS REST API**: Register via `POST http://localhost/api/gateway/auth/register` (creates account and returns token)
3. Use the `accessToken` from the response

**Note**: All authentication (login, logout, refresh) should be done via GraphQL. Tokens from GraphQL work with all NestJS REST API endpoints as both services share the same JWT secret.

---

## REST API Endpoints

### Authentication Endpoints

#### Register Customer

**Full URL**: `http://localhost/api/gateway/auth/register`

**Method**: `POST`

**Authentication**: Not required (Public)

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Validation Rules:**
- `email`: Valid email address (required)
- `password`: Minimum 6 characters (required)
- `firstName`: 2-50 characters (required)
- `lastName`: 2-50 characters (required)
- `phone`: Valid phone format (optional)

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `409`: Email already exists

**Note**: For login, logout, and token refresh, use the GraphQL API at `http://localhost/admin-api/graphql`. See the [GraphQL API](#graphql-api) section for authentication mutations.

---

### Product Endpoints

#### Get All Products

**Full URL**: `http://localhost/api/gateway/products`

**Method**: `GET`

**Authentication**: Not required (Public)

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Items per page
- `search` (string, optional): Search term
- `categoryId` (string, optional): Filter by category
- `status` (string, optional): Filter by status (active, draft, archived)
- `trashed` (string, optional): Set to `"true"` to include deleted products

**Example:**
```
GET http://localhost/api/gateway/products?page=1&limit=20&search=laptop&status=active
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Product Name",
      "slug": "product-name",
      "description": "Product description",
      "sku": "SKU-001",
      "price": 99.99,
      "stock": 50,
      "status": "active",
      "category": { "id": "uuid", "name": "Category" }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

**Note**: Uses **Elasticsearch** for search and **Redis** for caching. Products are cached for 1 hour.

---

#### Get Product by ID

**Full URL**: `http://localhost/api/gateway/products/:id`

**Method**: `GET`

**Authentication**: Not required (Public)

**Example:**
```
GET http://localhost/api/gateway/products/123e4567-e89b-12d3-a456-426614174000
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Product Name",
  "slug": "product-name",
  "description": "Product description",
  "sku": "SKU-001",
  "price": 99.99,
  "stock": 50,
  "status": "active",
  "category": { "id": "uuid", "name": "Category" }
}
```

**Note**: Uses **Elasticsearch** for product lookup and **Redis** for caching.

---

#### Create Product

**Full URL**: `http://localhost/api/gateway/products`

**Method**: `POST`

**Authentication**: Required (Admin only)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Wireless Mouse",
  "slug": "wireless-mouse",
  "description": "Ergonomic wireless mouse",
  "sku": "MOUSE-001",
  "price": 29.99,
  "compareAtPrice": 39.99,
  "costPrice": 15.00,
  "stock": 100,
  "lowStockThreshold": 10,
  "weight": 0.2,
  "status": "active",
  "categoryId": "uuid",
  "isFeatured": true,
  "image": "products/mouse.jpg"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Wireless Mouse",
  "slug": "wireless-mouse",
  "price": 29.99,
  "stock": 100,
  "status": "active"
}
```

**How it works**: 
- Writes to **write database** (PostgreSQL)
- Publishes Redis event to sync to **read database**
- Syncs to **Elasticsearch** for search
- Invalidates **Redis cache**

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Admin access required

---

#### Update Product

**Full URL**: `http://localhost/api/gateway/products/:id`

**Method**: `PUT`

**Authentication**: Required (Admin only)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Updated Product Name",
  "price": 39.99,
  "stock": 75
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Product Name",
  "price": 39.99,
  "stock": 75
}
```

**How it works**: 
- Updates **write database** (PostgreSQL)
- Publishes Redis event to sync to **read database**
- Syncs to **Elasticsearch** for search
- Invalidates **Redis cache**

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Admin access required
- `404`: Product not found

---

### Category Endpoints

#### Get All Categories

**Full URL**: `http://localhost/api/gateway/categories`

**Method**: `GET`

**Authentication**: Not required (Public)

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Items per page
- `search` (string, optional): Search term
- `parentId` (string, optional): Filter by parent category
- `isActive` (boolean, optional): Filter by active status

**Example:**
```
GET http://localhost/api/gateway/categories?page=1&limit=20&search=electronics
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic products",
      "isActive": true,
      "parent": null,
      "children": []
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

#### Get Category by ID

**Full URL**: `http://localhost/api/gateway/categories/:id`

**Method**: `GET`

**Authentication**: Not required (Public)

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Electronics",
  "slug": "electronics",
  "description": "Electronic products",
  "isActive": true,
  "parent": null,
  "children": []
}
```

---

### Order Endpoints

#### Get All Orders

**Full URL**: `http://localhost/api/gateway/orders`

**Method**: `GET`

**Authentication**: Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `user_id` (string, optional): Filter by user ID
- `status` (string, optional): Filter by status (pending, processing, completed, cancelled)
- `fulfillment_status` (string, optional): Filter by fulfillment status
- `order_number` (string, optional): Search by order number
- `limit` (number, optional): Items per page
- `offset` (number, optional): Pagination offset

**Example:**
```
GET http://localhost/api/gateway/orders?status=pending&limit=20&offset=0
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-1234567890-1234",
      "status": "pending",
      "total": 199.99,
      "user": { "id": "uuid", "email": "user@example.com" },
      "items": [
        {
          "id": "uuid",
          "productId": "uuid",
          "quantity": 2,
          "price": 99.99,
          "product": { "name": "Product Name" }
        }
      ]
    }
  ],
  "total": 50
}
```

---

#### Get My Orders

**Full URL**: `http://localhost/api/gateway/orders/my-orders`

**Method**: `GET`

**Authentication**: Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` (string, optional): Filter by status
- `fulfillment_status` (string, optional): Filter by fulfillment status
- `limit` (number, optional): Items per page
- `offset` (number, optional): Pagination offset

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-1234567890-1234",
      "status": "pending",
      "total": 199.99,
      "items": []
    }
  ],
  "total": 10
}
```

---

#### Get Order by ID

**Full URL**: `http://localhost/api/gateway/orders/:id`

**Method**: `GET`

**Authentication**: Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "orderNumber": "ORD-1234567890-1234",
  "status": "pending",
  "total": 199.99,
  "user": { "id": "uuid", "email": "user@example.com" },
  "items": []
}
```

---

#### Create Order

**Full URL**: `http://localhost/api/gateway/orders`

**Method**: `POST`

**Authentication**: Required (Customer or Admin)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "userId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ],
  "shippingAddress": "123 Main St, City, State 12345",
  "billingAddress": "123 Main St, City, State 12345",
  "paymentMethod": "wallet_balance",
  "notes": "Please deliver during business hours"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "orderNumber": "ORD-1234567890-1234",
  "status": "pending",
  "total": 199.99,
  "user": { "id": "uuid", "email": "user@example.com" },
  "items": []
}
```

**How it works**: 
- Writes to **write database** (PostgreSQL)
- Publishes Redis event to sync to **read database**
- Creates admin notification
- Publishes order event for email processing
- Broadcasts notification via **Soketi** (Pusher-compatible) for live admin notifications

**Error Responses:**
- `400`: Validation error or insufficient stock
- `401`: Unauthorized
- `404`: User or product not found

---

### User Endpoints

#### Get All Users

**Full URL**: `http://localhost/api/gateway/users`

**Method**: `GET`

**Authentication**: Required

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit` (number, optional): Items per page
- `offset` (number, optional): Pagination offset

**Example:**
```
GET http://localhost/api/gateway/users?limit=20&offset=0
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "isActive": true
    }
  ],
  "total": 50
}
```

---

### Payment Endpoints

#### Add Balance

**Full URL**: `http://localhost/api/gateway/payment/add-balance`

**Method**: `POST`

**Authentication**: Required (Customer or Admin)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "amount": 100.00,
  "cardNumber": "4111111111111111",
  "cardExpiry": "12/25",
  "cardCvv": "123"
}
```

**Validation Rules:**
- `amount`: Number between 1 and 10000 (required)
- `cardNumber`: 13-19 digits (required)
- `cardExpiry`: MM/YY format (required)
- `cardCvv`: 3-4 digits (required)

**Response (200):**
```json
{
  "balance": 150.00,
  "message": "Successfully added $100.00 to your balance"
}
```

**Error Responses:**
- `400`: Validation error or invalid card
- `401`: Unauthorized
- `404`: User not found

---

#### Get Balance

**Full URL**: `http://localhost/api/gateway/payment/balance`

**Method**: `GET`

**Authentication**: Required (Customer or Admin)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "balance": 150.00,
  "message": "Balance retrieved successfully"
}
```

---

#### Process Payment

**Full URL**: `http://localhost/api/gateway/payment/process`

**Method**: `POST`

**Authentication**: Required (Customer or Admin)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "orderId": "uuid",
  "paymentMethod": "wallet_balance"
}
```

**Or for credit card:**
```json
{
  "orderId": "uuid",
  "paymentMethod": "credit_card",
  "cardNumber": "4111111111111111",
  "cardExpiry": "12/25",
  "cardCvv": "123",
  "cardholderName": "John Doe"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "order": {
    "id": "uuid",
    "orderNumber": "ORD-1234567890-1234",
    "paymentStatus": "paid",
    "total": 199.99
  }
}
```

**Error Responses:**
- `400`: Validation error, insufficient balance, or order already paid
- `401`: Unauthorized
- `404`: Order or user not found

---

### Notification Endpoints

#### Get All Notifications

**Full URL**: `http://localhost/api/gateway/notifications`

**Method**: `GET`

**Authentication**: Required (Admin only)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit` (number, default: 50): Items per page
- `page` (number, default: 1): Page number
- `unread_only` (string, optional): Set to `"true"` to show only unread

**Example:**
```
GET http://localhost/api/gateway/notifications?limit=20&page=1&unread_only=true
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "order_created",
      "title": "New Order Received",
      "message": "Order ORD-123 placed by John Doe",
      "readAt": null,
      "createdAt": "2024-12-23T10:00:00Z"
    }
  ],
  "total": 50,
  "unreadCount": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

#### Get Unread Count

**Full URL**: `http://localhost/api/gateway/notifications/unread-count`

**Method**: `GET`

**Authentication**: Required (Admin only)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "unreadCount": 10
}
```

---

#### Mark Notification as Read

**Full URL**: `http://localhost/api/gateway/notifications/:id/read`

**Method**: `POST`

**Authentication**: Required (Admin only)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Notification marked as read",
  "notification": {
    "id": "uuid",
    "userId": null,
    "type": "order_created",
    "title": "New Order Received",
    "message": "Order ORD-123 placed by User",
    "data": {},
    "readAt": "2024-12-23T10:00:00.000Z",
    "createdAt": "2024-12-23T09:00:00.000Z",
    "updatedAt": "2024-12-23T10:00:00.000Z"
  }
}
```

**How it works**: 
- Calls Laravel webhook endpoint with API key authentication
- Laravel updates **write database** (PostgreSQL) and publishes Redis event
- NestJS updates **read database** directly and publishes Redis event
- `DatabaseEventSubscriber` syncs via Redis `database:events` channel

---

#### Mark All Notifications as Read

**Full URL**: `http://localhost/api/gateway/notifications/mark-all-read`

**Method**: `POST`

**Authentication**: Required (Admin only)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "All notifications marked as read",
  "count": 10
}
```

**How it works**: 
- Calls Laravel webhook endpoint with API key authentication
- Laravel updates all admin notifications in **write database** (PostgreSQL) and publishes Redis events
- NestJS updates all unread notifications in **read database** and publishes Redis events
- `DatabaseEventSubscriber` syncs via Redis `database:events` channel

---

### Storage Endpoints

#### Get Image

**Full URL**: `http://localhost/api/gateway/storage/images/:path`

**Method**: `GET`

**Authentication**: Not required (Public)

**Example:**
```
GET http://localhost/api/gateway/storage/images/products/mouse.jpg
```

**Response (200)**: Image file with appropriate content-type

**Note**: Proxies images from Laravel storage service.

---

#### Get Product Image

**Full URL**: `http://localhost/api/gateway/storage/product-image/:path`

**Method**: `GET`

**Authentication**: Not required (Public)

**Example:**
```
GET http://localhost/api/gateway/storage/product-image/mouse.jpg
```

**Response (200)**: Image file with appropriate content-type

---

## GraphQL API

### Endpoint

**Full URL**: `http://localhost/admin-api/graphql`

**Method**: `POST`

**Authentication**: Required for mutations (Bearer token)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Queries

#### Get Current Admin User

```graphql
query {
  adminUser {
    id
    email
    first_name
    last_name
    role
    is_active
  }
}
```

---

### Mutations

#### Register

```graphql
mutation {
  register(input: {
    email: "user@example.com"
    password: "password123"
    firstName: "John"
    lastName: "Doe"
    phone: "+1234567890"
  }) {
    accessToken
    refreshToken
    user {
      id
      email
      first_name
      last_name
      role
    }
  }
}
```

---

#### Login

```graphql
mutation {
  login(input: {
    email: "user@example.com"
    password: "password123"
  }) {
    accessToken
    refreshToken
    user {
      id
      email
      first_name
      last_name
      role
    }
  }
}
```

---

#### Admin Login

```graphql
mutation {
  adminLogin(input: {
    email: "admin@gmail.com"
    password: "1234567"
  }) {
    accessToken
    refreshToken
    user {
      id
      email
      first_name
      last_name
      role
    }
  }
}
```

---

#### Create Category

```graphql
mutation {
  createCategory(input: {
    name: "Electronics"
    description: "Electronic products"
    is_active: true
  }) {
    id
    name
    slug
    description
    is_active
  }
}
```

**How it works**: 
- Writes to **write database** (PostgreSQL)
- Automatically syncs to **read database** via PostgreSQL Logical Replication

---

#### Update Category

```graphql
mutation {
  updateCategory(id: "uuid", input: {
    name: "Updated Electronics"
    is_active: true
  }) {
    id
    name
    slug
    is_active
  }
}
```

---

#### Delete Category

```graphql
mutation {
  deleteCategory(id: "uuid") {
    message
  }
}
```

---

#### Restore Category

```graphql
mutation {
  restoreCategory(id: "uuid") {
    message
  }
}
```

---

#### Create Product

```graphql
mutation {
  createProduct(input: {
    name: "Wireless Mouse"
    sku: "MOUSE-001"
    price: 29.99
    stock: 100
    status: active
    categoryId: "uuid"
  }) {
    id
    name
    sku
    price
    stock
    status
  }
}
```

**How it works**: 
- Writes to **write database** (PostgreSQL)
- Publishes Redis event to sync to **read database**
- Syncs to **Elasticsearch** for search
- Invalidates **Redis cache**

---

#### Update Product

```graphql
mutation {
  updateProduct(id: "uuid", input: {
    name: "Updated Mouse"
    price: 39.99
    stock: 75
  }) {
    id
    name
    price
    stock
  }
}
```

**How it works**: 
- Updates **write database** (PostgreSQL)
- Publishes Redis event to sync to **read database**
- Syncs to **Elasticsearch** for search
- Invalidates **Redis cache**

---

#### Delete Product

```graphql
mutation {
  deleteProduct(id: "uuid") {
    message
  }
}
```

---

#### Create Order

```graphql
mutation {
  createOrder(input: {
    userId: "uuid"
    items: [
      {
        productId: "uuid"
        quantity: 2
      }
    ]
    shippingAddress: "123 Main St"
    paymentMethod: "wallet_balance"
  }) {
    id
    orderNumber
    status
    total
    items {
      id
      productId
      quantity
      price
    }
  }
}
```

**How it works**: 
- Writes to **write database** (PostgreSQL)
- Publishes Redis event to sync to **read database**
- Creates admin notification
- Publishes order event for email processing
- Broadcasts notification via **Soketi** (Pusher-compatible) for live admin notifications

---

#### Create User

```graphql
mutation {
  createUser(input: {
    email: "newuser@example.com"
    password: "password123"
    first_name: "Jane"
    last_name: "Doe"
    role: customer
  }) {
    id
    email
    first_name
    last_name
    role
  }
}
```

**How it works**: 
- Writes to **write database** (PostgreSQL)
- Publishes Redis event to sync to **read database**
- Triggers event emitter for Laravel Echo to push updated user list to connected clients

---

#### Update User

```graphql
mutation {
  updateUser(id: "uuid", input: {
    first_name: "Updated Name"
    is_active: true
  }) {
    id
    email
    first_name
    last_name
    is_active
  }
}
```

**How it works**: 
- Updates **write database** (PostgreSQL)
- Publishes Redis event to sync to **read database**
- Triggers event emitter for Laravel Echo to push updated user list to connected clients

---

#### Upload Product Image

```graphql
mutation {
  uploadProductImage(file: <Upload>) {
    path
    url
    filename
  }
}
```

**Note**: Uses multipart/form-data for file upload.

---

#### Add Balance

```graphql
mutation {
  addBalance(input: {
    amount: 100.00
    cardNumber: "4111111111111111"
    cardExpiry: "12/25"
    cardCvv: "123"
  }) {
    balance
    message
  }
}
```

---

#### Get My Balance

```graphql
mutation {
  getMyBalance {
    balance
    message
  }
}
```

---

### Notification Mutations

#### Mark Notification as Read

```graphql
mutation {
  markNotificationAsRead(id: "uuid") {
    id
    type
    title
    message
    read_at
    created_at
  }
}
```

**How it works**: 
- Updates notification in **write database** (PostgreSQL)
- Publishes Redis event to sync to **read database**

---

#### Mark All Notifications as Read

```graphql
mutation {
  markAllNotificationsAsRead {
    message
    count
  }
}
```

**How it works**: 
- Marks all admin notifications (where `user_id` is null) as read in **write database** (PostgreSQL)
- Publishes Redis events to sync to **read database**

---

## Socket.IO / WebSocket API

### Connection

**Full URL**: `http://localhost/socket.io`

**Namespace**: `/ws`

**Path**: `/socket.io`

**Authentication**: Optional (JWT token in query or auth object)

**Example (JavaScript):**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost/socket.io', {
  path: '/socket.io',
  transports: ['websocket'],
  query: {
    token: 'your-jwt-token' // Optional
  }
});
```

---

### Events

#### Users Events

##### Get Users List

**Emit:**
```javascript
socket.emit('users:get', {
  search: 'john',
  role: 'customer',
  page: 1,
  limit: 50,
  withDeleted: false
});
```

**Listen:**
```javascript
socket.on('users:list', (data) => {
  console.log(data);
  // { data: [...], total: 50 }
});
```

**How it works**: 
- When a user is created or updated via Laravel GraphQL, it publishes a Redis event
- UsersGateway subscribes to Redis `database:events` channel
- On receiving a `users` event (INSERT, UPDATE, DELETE), it waits 300ms for DB sync
- Fetches the latest user list from read database
- Broadcasts `users:list` event to all connected clients

---

##### Restore User

**Emit:**
```javascript
socket.emit('users:restore', {
  id: 'uuid'
});
```

**Listen:**
```javascript
socket.on('users:restored', (data) => {
  console.log(data);
  // { success: true, data: {...} }
});
```

---

#### Orders Events

##### Get Orders List

**Emit:**
```javascript
socket.emit('orders:get', {
  userId: 'uuid',
  status: 'pending',
  page: 1,
  limit: 50
});
```

**Listen:**
```javascript
socket.on('orders:list', (data) => {
  console.log(data);
  // { success: true, data: [...], total: 50 }
});
```

---

##### Get Single Order

**Emit:**
```javascript
socket.emit('orders:getOne', {
  id: 'uuid'
});
```

**Listen:**
```javascript
socket.on('orders:one', (data) => {
  console.log(data);
  // { success: true, data: {...} }
});
```

---

##### Get My Orders

**Emit:**
```javascript
socket.emit('orders:getMyOrders', {
  status: 'pending',
  page: 1,
  limit: 50
});
```

**Listen:**
```javascript
socket.on('orders:myList', (data) => {
  console.log(data);
  // { success: true, data: [...], total: 10 }
});
```

**Note**: Requires authentication (JWT token).

---

##### Restore Order

**Emit:**
```javascript
socket.emit('orders:restore', {
  id: 'uuid'
});
```

**Listen:**
```javascript
socket.on('orders:restored', (data) => {
  console.log(data);
  // { success: true, data: {...} }
});
```

---

##### Order Updated (Broadcast)

**Listen:**
```javascript
socket.on('orders:updated', (order) => {
  console.log('Order updated:', order);
});
```

**Note**: Automatically broadcasted when an order is updated.

---

## Laravel Echo / Real-time Events (Notifications)

### Connection

**Full URL**: `http://localhost/app/`

**Broadcaster**: Pusher-compatible (Soketi)

**Authentication**: Not required for public channels

**Example (JavaScript):**
```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: 'ecom-key',
    wsHost: window.location.hostname || 'localhost',
    wsPort: 6001,
    wssPort: 6001,
    forceTLS: false,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    cluster: 'mt1',
});
```

---

### Events

#### Notifications Events

##### New Notification (Broadcast)

**Listen:**
```javascript
const channel = window.Echo.channel('admin-notifications');

channel.listen('new-notification', (notification) => {
    console.log('New notification:', notification);
    // {
    //   id: "uuid",
    //   user_id: null,
    //   type: "order_created",
    //   title: "New Order Received",
    //   message: "Order ORD-123 placed by John Doe",
    //   read_at: null,
    //   created_at: "2024-12-23T10:00:00Z"
    // }
});
```

**How it works**: 
- When an order is created, it creates an admin notification
- Notification is broadcasted via **Soketi** (Pusher-compatible) to `admin-notifications` channel with event `new-notification`
- Frontend uses Laravel Echo to listen to this channel for real-time updates
- This is the **primary method** for receiving notifications in the admin dashboard

**Channel**: `admin-notifications`  
**Event**: `new-notification`

---

## Laravel Admin Panel API

**Note**: Laravel REST API endpoints have been replaced by GraphQL. All admin operations should be performed via the GraphQL endpoint at `http://localhost/admin-api/graphql`. See the [GraphQL API](#graphql-api) section above for authentication and all available operations.

Tokens generated from GraphQL mutations (login, adminLogin, register) can be used with Nest.js API endpoints as both services share the same JWT secret.

---

## Validation

### Nest.js DTOs

All endpoints use DTOs with `class-validator`:

- **RegisterDto**: Validates registration data
- **LoginDto**: Validates login credentials
- **RefreshTokenDto**: Validates refresh token
- **AuthResponseDto**: Standardized auth response

Validation is automatic via `ValidationPipe` in `main.ts`.

## Authentication & Authorization

### JWT Authentication

- **Access Token**: Short-lived (default: 1 hour)
- **Refresh Token**: Long-lived (default: 7 days)
- **Token Blacklist**: Tokens are blacklisted in Redis on logout
- **Shared Secret**: Both services use the same JWT secret

### Guards

#### JWT Auth Guard (Global)

All routes are protected by default. Use `@Public()` decorator to make routes public:

```typescript
@Public()
@Post('login')
login() {
  // Public endpoint - no authentication required
}
```

#### Role-Based Guard

Use `@Roles()` decorator to restrict access by role:

```typescript
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Get('admin-only')
adminOnly() {
  // Only admins can access
}
```

#### Current User Decorator

Get the authenticated user in controllers:

```typescript
@Get('me')
getProfile(@CurrentUser() user: CurrentUserPayload) {
  return user; // { id, email, role, firstName, lastName }
}
```

### Refresh Token Flow

1. **Login/Register** → Returns `accessToken` and `refreshToken`
2. **Access Token Expires** → Use refresh token to get new tokens
3. **Refresh Endpoint** → `POST /api/auth/refresh` with `refreshToken`
4. **Returns New Tokens** → New `accessToken` and `refreshToken`
5. **Logout** → Blacklists both tokens in Redis

### Token Blacklist

When a user logs out, tokens are added to Redis blacklist:
- Key: `blacklist:<token>`
- TTL: Matches token expiration time
- Prevents reuse of logged-out tokens

## Project Structure

```
e-com-nest-laravel/
├── api-gateway/              # Nest.js API Gateway (Clean Architecture)
│   ├── src/
│   │   ├── domain/          # Domain layer (entities, DTOs)
│   │   ├── application/     # Application layer (controllers only)
│   │   └── infrastructure/ # Infrastructure layer (services, auth, cache, etc.)
│   └── Dockerfile
├── admin-service/           # Laravel Admin Panel
│   ├── app/                 # Models, Controllers
│   ├── resources/           # React frontend
│   └── Dockerfile
└── docker-compose.yml       # All services
```

> **Note**: See [NestJS Clean Architecture Overview](#nestjs-clean-architecture-overview) above for detailed explanation of the folder structure.

## Environment Variables

See `docker-compose.yml` for all environment variables.

Key variables:
- `JWT_SECRET`: Shared secret for JWT tokens
- `DATABASE_HOST`: PostgreSQL host
- `REDIS_HOST`: Redis host

## License

MIT

