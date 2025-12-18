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
- **PostgreSQL**: Shared database
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
- **API Docs (Swagger)**: http://localhost:3000/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

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

