# E-Commerce Platform

Hybrid e-commerce platform with Nest.js API Gateway and Laravel Admin Panel. Built with Clean Architecture principles, featuring JWT authentication, role-based access control, and shared authentication between services.

## 📑 Quick Navigation

| Section | Description |
|---------|-------------|
| [NestJS Architecture](#nestjs-clean-architecture-overview) | Clean architecture structure and layer responsibilities |
| [Quick Start](#quick-start) | Setup and running instructions |
| [API Documentation](#api-documentation) | Complete API endpoints for Nest.js and Laravel |
| [Authentication Flow](#authentication-flow) | JWT token sharing and usage |
| [Error Handling](#error-handling) | Global error handling and validation |
| [Validation](#validation) | DTO validation rules |
| [Authentication & Authorization](#authentication--authorization) | Guards, roles, and token management |
| [Development](#development) | Local development setup |

## Architecture

- **Nest.js API Gateway**: Core API with REST + GraphQL (Port 3000)
- **Laravel Admin Panel**: Admin dashboard with React frontend (Port 8000)
- **PostgreSQL Write DB**: Primary database for writes (Port 5432)
- **PostgreSQL Read DB**: Replica database for reads (Port 5433) - Replicated via Logical Replication
- **Redis**: Caching, sessions, and queues

## NestJS Clean Architecture Overview

The Nest.js API Gateway follows **Clean Architecture** principles with three main layers:

### 📁 Project Structure

```
api-gateway/src/
├── domain/              # Business logic (entities, DTOs)
├── application/         # Controllers only (thin routing layer)
└── infrastructure/      # Services, auth, cache, database, helpers
```

### 🎯 Layer Responsibilities

**1. Domain Layer** (`domain/`)
- **Entities**: Database models (User, Product, Order) with business rules
- **DTOs**: Request/response validation models (RegisterDto, LoginDto, etc.)
- **No framework dependencies** - pure business logic

**2. Application Layer** (`application/`)
- **Controllers**: HTTP endpoints that route requests to services
- **Thin layer** - no business logic, only routing

**3. Infrastructure Layer** (`infrastructure/`)
- **Services**: Business logic implementation (AuthService, ProductService)
- **Authentication**: JWT strategy and token validation
- **Cache**: Redis for caching and token blacklisting
- **Persistence**: TypeORM configuration, migrations, seeders
- **Libs**: Guards, decorators, filters, Swagger decorators

### 🔄 Data Flow

```
HTTP Request → Controllers → Services → Database/Redis
```

### ✅ Benefits

- **Separation of Concerns**: Each layer has one responsibility
- **Testability**: Easy to mock and test in isolation
- **Maintainability**: Changes don't affect other layers
- **Scalability**: Easy to add new features

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- PHP 8.5+ (for local development)

### Start All Services

```bash
docker-compose up -d --build
```

### Services

- **API Gateway**: http://localhost:3000
- **Admin Panel**: http://localhost:8000
- **PostgreSQL Write**: localhost:5432
- **PostgreSQL Read**: localhost:5433
- **Redis**: localhost:6379

## Database Replication Setup

The platform uses **PostgreSQL Logical Replication** to replicate data from the write database to the read database in real-time.

### Architecture

- **Write Database** (`postgres-write`): Used by Laravel admin service for all writes
- **Read Database** (`postgres-read`): Used by NestJS API Gateway for reads (replicated from write DB)

### Initial Setup

1. **Start the databases:**
   ```bash
   docker-compose up -d postgres-write postgres-read
   ```

2. **Run migrations on write database:**
   ```bash
   docker-compose exec admin-service php artisan migrate
   ```

3. **Setup replication:**
   ```bash
   # Make scripts executable (if not already)
   chmod +x postgres/*.sh
   
   # Run replication setup script
   ./postgres/replicate.sh
   ```

### How It Works

PostgreSQL Logical Replication uses Write-Ahead Log (WAL) streaming:
- Changes in write database are automatically replicated to read database
- Replication happens at the database level (no application code needed)
- Real-time replication with minimal latency
- Handles INSERT, UPDATE, DELETE operations automatically

### Monitoring Replication

Check replication status:
```bash
./postgres/check-replication.sh
```

Or manually:
```bash
# Check subscription status
docker-compose exec postgres-read psql -U ecom_user -d ecom_db_read -c "SELECT * FROM pg_subscription;"

# Check replication lag
docker-compose exec postgres-read psql -U ecom_user -d ecom_db_read -c "SELECT * FROM pg_stat_subscription;"
```

### Adding New Tables

When you add new tables via migrations:

1. Run migrations on write database (Laravel)
2. Refresh the subscription:
   ```bash
   docker-compose exec postgres-read psql -U ecom_user -d ecom_db_read -c "ALTER SUBSCRIPTION ecom_subscription REFRESH PUBLICATION;"
   ```

### Troubleshooting

See `postgres/README.md` for detailed troubleshooting guide.

**Quick fixes:**
- **Replication not working**: Run `./postgres/replicate.sh` again
- **Tables missing**: Refresh subscription (see above)
- **Replication lag**: Check `pg_stat_subscription` for sync status

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

## Accessing the Application

### Swagger Documentation

#### API Gateway Swagger (NestJS)

**Full URL**: http://localhost/api/gateway/docs

- Complete API documentation for the NestJS API Gateway
- Interactive API testing interface
- Bearer token authentication support
- All endpoints with request/response schemas

#### Admin Service Swagger (Laravel)

**Full URL**: http://localhost/api/documentation

- Complete API documentation for the Laravel Admin Service
- Interactive API testing interface
- JWT token authentication support
- Admin-specific endpoints documentation

### Admin Dashboard

**Full URL**: http://localhost/

- React-based admin dashboard
- Accessible at the root path
- Requires admin authentication
- Manage products, categories, orders, and users

**Default Admin Credentials:**
- **Email**: `admin@gmail.com`
- **Password**: `1234567`

### User/Customer Pages

**Full URL**: http://localhost/

The same React frontend serves both admin and customer views based on user role and authentication:

- **Unauthenticated users**: Public pages (product catalog, product details)
- **Authenticated customers**: Customer dashboard, order history, profile management
- **Authenticated admins**: Admin dashboard with full management capabilities

The frontend automatically detects user role and displays the appropriate interface.

### Default Admin Credentials

- **Email**: `admin@gmail.com`
- **Password**: `1234567`

The admin user is automatically created on first startup.

## API Documentation

### Nest.js API Gateway

Base URL: `http://localhost:3000/api`

#### Authentication Endpoints

##### Register Customer

**POST** `/api/auth/register`

Register a new customer account.

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
- `phone`: Valid phone format, optional

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

---

##### Login (Customer or Admin)

**POST** `/api/auth/login`

Login with email and password. Works for both customers and admins.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `email`: Valid email address (required)
- `password`: Minimum 6 characters (required)

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Invalid credentials
- `403`: Account is inactive

**Note**: The same token works for both Nest.js API and Laravel Admin Panel.

---

##### Refresh Token

**POST** `/api/auth/refresh`

Refresh the access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

##### Logout

**POST** `/api/auth/logout`

Logout and invalidate the current token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### Laravel Admin Panel API

Base URL: `http://localhost:8000/api`

#### Admin Authentication Endpoints

##### Admin Login

**POST** `/api/admin/login`

Login to the admin panel. Only users with `role = 'admin'` can access.

**Request Body:**
```json
{
  "email": "admin@gmail.com",
  "password": "1234567"
}
```

**Validation Rules:**
- `email`: Valid email address (required)
- `password`: Minimum 6 characters (required)

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@gmail.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Invalid credentials
- `403`: Account is inactive or user is not an admin

**Note**: This token can also be used with Nest.js API endpoints. Both services share the same JWT secret.

---

##### Refresh Token

**POST** `/api/admin/refresh`

Refresh the access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Invalid or revoked refresh token

---

##### Admin Logout

**POST** `/api/admin/logout`

Logout from admin panel and invalidate tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body (optional):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `401`: Unauthorized

---

##### Get Current Admin User

**GET** `/api/admin/user`

Get the currently authenticated admin user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "admin@gmail.com",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "isActive": true
}
```

**Error Responses:**
- `401`: Unauthorized
- `403`: User is not an admin

---

## Authentication Flow

### Shared JWT Token

Both services use the same JWT secret, so tokens issued by one service work with the other:

1. **User logs in via Nest.js** → Gets JWT token
2. **Same token works in Laravel** → Can access admin panel
3. **Admin logs in via Laravel** → Gets JWT token
4. **Same token works in Nest.js** → Can access API endpoints

### Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "admin" | "customer",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Using Tokens

Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

### Nest.js Global Error Handler

All errors are caught and formatted consistently:

**Error Response Format:**
```json
{
  "statusCode": 400,
  "timestamp": "2024-12-18T12:00:00.000Z",
  "path": "/api/auth/login",
  "method": "POST",
  "message": "Validation failed",
  "errors": [
    {
      "property": "email",
      "constraints": {
        "isEmail": "email must be a valid email address"
      }
    }
  ]
}
```

**Status Codes:**
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

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

## Development

### Running Locally

#### Nest.js API Gateway

```bash
cd api-gateway
npm install
npm run start:dev
```

#### Laravel Admin Panel

```bash
cd admin-service
composer install
npm install
php artisan serve
npm run dev
```

### Database Migrations

#### Nest.js

```bash
cd api-gateway
npm run migration:run
```

#### Laravel

```bash
cd admin-service
php artisan migrate
```

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

