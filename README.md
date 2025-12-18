# E-Commerce Platform

Hybrid e-commerce platform with Nest.js API Gateway and Laravel Admin Panel.

## Architecture

- **Nest.js API Gateway**: Core API with REST + GraphQL (Port 3000)
- **Laravel Admin Panel**: Admin dashboard with React frontend (Port 8000)
- **PostgreSQL**: Shared database
- **Redis**: Caching, sessions, and queues

## NestJS Clean Architecture Overview

The Nest.js API Gateway follows **Clean Architecture** principles, ensuring separation of concerns, testability, and maintainability. The codebase is organized into three main layers:

### 📁 Project Structure

```
api-gateway/src/
├── domain/                    # 🎯 Domain Layer (Business Logic)
│   ├── entities/              # Database entities (User, Product, Order, etc.)
│   │   ├── baseEntity.ts      # Base entity with common fields (id, timestamps)
│   │   └── user.entity.ts     # User entity with business rules
│   └── dto/                   # Data Transfer Objects (Request/Response models)
│       └── auth/
│           ├── register.dto.ts
│           ├── login.dto.ts
│           ├── auth-response.dto.ts
│           └── refresh-token.dto.ts
│
├── application/                # 📡 Application Layer (Use Cases)
│   └── controllers/           # HTTP Controllers (thin layer, only routing)
│       ├── auth/
│       │   └── auth.controller.ts
│       └── user/
│           └── user.controller.ts
│
└── infrastructure/            # 🔧 Infrastructure Layer (Technical Details)
    ├── services/              # Business Services (called by controllers)
    │   └── auth/
    │       └── auth.service.ts
    ├── authentication/        # JWT & Passport Configuration
    │   ├── jwt.strategy.ts    # JWT validation strategy
    │   └── auth.module.ts     # Authentication module
    ├── cache/                 # Redis Caching
    │   ├── redis.service.ts
    │   └── redis.module.ts
    ├── persistence/           # Database Layer
    │   ├── database.module.ts
    │   ├── data-source.ts
    │   ├── migrations/        # TypeORM migrations
    │   └── seeders/           # Database seeders
    └── libs/                  # Helper Classes & Utilities
        ├── guards/            # Authentication & Authorization guards
        │   ├── jwt-auth.guard.ts
        │   └── roles.guard.ts
        ├── decorators/        # Custom decorators
        │   ├── public.decorator.ts
        │   ├── roles.decorator.ts
        │   └── current-user.decorator.ts
        ├── filters/           # Exception filters
        │   └── http-exception.filter.ts
        └── swagger/           # Swagger API documentation decorators
            ├── api-docs.decorator.ts
            ├── auth-api-docs.decorator.ts
            └── user-api-docs.decorator.ts
```

### 🎯 Layer Responsibilities

#### 1. Domain Layer (`domain/`)
**Purpose**: Contains business logic and core entities. No framework dependencies.

The Domain Layer is the innermost layer and represents the core business logic of the application. It contains:

- **Entities** (`domain/entities/`): Database models that represent business objects like User, Product, Order, etc. These entities contain business rules and validation logic. They define the structure and behavior of core business concepts.

- **DTOs** (`domain/dto/`): Data Transfer Objects that define the shape of data flowing in and out of the application. These include request DTOs (like RegisterDto, LoginDto) and response DTOs (like AuthResponseDto). They contain validation rules using class-validator decorators.

This layer has no dependencies on external frameworks or libraries. It's pure business logic that could theoretically be used with any framework or even in a different language.

#### 2. Application Layer (`application/`)
**Purpose**: Thin layer containing only controllers. Handles HTTP requests/responses.

The Application Layer is a thin orchestration layer that coordinates between HTTP requests and business services. It contains:

- **Controllers** (`application/controllers/`): HTTP controllers that receive incoming requests, validate input using DTOs from the domain layer, call appropriate services from the infrastructure layer, and return responses. Controllers are kept thin - they don't contain business logic, only routing and request/response handling.

Controllers delegate all business logic to services in the infrastructure layer. They act as a bridge between the HTTP world and the business logic world.

#### 3. Infrastructure Layer (`infrastructure/`)
**Purpose**: All technical implementations and external services.

The Infrastructure Layer contains all the technical details and external service integrations. It's organized into several sub-folders:

**Services** (`infrastructure/services/`):
Contains business services that implement the actual application logic. These services are called by controllers and handle operations like user registration, authentication, product management, etc. Services use repositories, cache, and other infrastructure components to perform their work.

**Authentication** (`infrastructure/authentication/`):
Handles JWT token validation and Passport.js strategy configuration. This includes the JWT strategy that validates tokens, extracts user information, and checks token blacklists. The authentication module configures JWT signing and validation.

**Cache** (`infrastructure/cache/`):
Manages Redis caching operations. This includes caching data for performance and maintaining token blacklists for logout functionality. The cache service provides methods to get, set, delete, and reset cached data.

**Persistence** (`infrastructure/persistence/`):
Handles all database-related operations. This includes TypeORM configuration, database connection setup, migrations for schema changes, and seeders for initial data. The persistence layer abstracts database operations from the rest of the application.

**Libs** (`infrastructure/libs/`):
Contains reusable helper classes and utilities:
- **Guards**: Protect routes by checking authentication (JWT) and authorization (roles). They run before controllers and can block unauthorized requests.
- **Decorators**: Custom decorators that add metadata to controllers and methods. Examples include `@Public()` to mark routes as public, `@Roles()` to specify required roles, and `@CurrentUser()` to inject the authenticated user.
- **Filters**: Global exception filters that catch and format all errors consistently across the application.
- **Swagger**: API documentation decorators separated from controllers to keep controllers clean. These decorators generate Swagger/OpenAPI documentation.

### 🔄 Data Flow

```
HTTP Request
    ↓
[Application Layer] Controllers
    ↓
[Infrastructure Layer] Services
    ↓
[Infrastructure Layer] Repositories/Cache
    ↓
[Domain Layer] Entities
    ↓
Database/Redis
```

### ✅ Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Easy to mock dependencies and test in isolation
3. **Maintainability**: Changes in one layer don't affect others
4. **Scalability**: Easy to add new features without breaking existing code
5. **Framework Independence**: Domain layer can be reused with different frameworks
6. **Clear Dependencies**: Dependencies flow inward (Infrastructure → Application → Domain)

### 📝 Key Principles

- **Dependency Rule**: Inner layers (Domain) don't depend on outer layers (Infrastructure)
- **Single Responsibility**: Each class/module has one reason to change
- **Interface Segregation**: Services expose only what controllers need
- **Open/Closed**: Open for extension, closed for modification

### 🎓 Understanding the Structure

**For New Developers**:
1. Start with `application/controllers/` to see available endpoints
2. Follow controllers to `infrastructure/services/` to understand business logic
3. Check `domain/entities/` to see data models
4. Review `infrastructure/libs/` for reusable utilities

**For Reviewers**:
- Controllers are in `application/` (thin layer)
- Business logic is in `infrastructure/services/`
- Data models are in `domain/entities/`
- All technical details are in `infrastructure/`

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

### Laravel Admin Panel

Base URL: `http://localhost:8000`

#### Admin Authentication Endpoints

##### Admin Login

**POST** `/admin/login`

Login to the admin panel. Only users with `role = 'admin'` can access.

**Request Body:**
```json
{
  "email": "admin@gmail.com",
  "password": "1234567"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
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
- `403`: User is not an admin

**Note**: This token can also be used with Nest.js API endpoints.

---

##### Admin Logout

**POST** `/admin/logout`

Logout from admin panel.

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

##### Get Current Admin User

**GET** `/admin/user`

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

