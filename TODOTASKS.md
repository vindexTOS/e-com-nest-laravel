 
assigment:



PX: Technical Assessment for Backend
Overview
O
bjectives
Project Structure
Database Design
Task: Design a database schema for an e
-commerce platform
Nest.js Core Implementation
Set up Nest.js API Gateway
Product Module
Order Processing
Laravel Admin Panel
Admin Authentication & Dash
b
oard
Product Management
Order Management & Reports
Integration Tasks
Service Communication
Shared Authentication
DevOps
Deployment Configuration
Bonus Points
Sub
mission Guidelines
Overview
Project: Hybrid E
Time Estimate: 2-3 days
Level: Mid-to
-Senior Full
-Stack Developer
-commerce Platform with Laravel (Admin) + Nest.js (API Gateway)
O
bjectives
1.
Evaluate Nest.js architecture understanding
2. Test Laravel proficiency for admin features
3.
Assess the ab
ility to integrate multiple services
4.
Evaluate database design and API development
Project Structure
1 ec
ommerce-platform/
2 ├── admin-service/ # Laravel (Admin Panel)
3 ├── api-gateway/ # Nest.js (Gateway + Core API)
4 └── do
cker-c
ompose.yml # Container setup
Database Design
Task: Design a database schema for an e
-commerce platform
Requirements:
Users (customers + admins)
Products with categories
Orders with order items
Inventory management
Deliverab
les:
1. SQL schema with relationships
2. Migration files for b
oth frameworks
3. Brief explanation of design choices
Nest.js Core Implementation
Set up Nest.js API Gateway
Requirements
Create a Nest.js project with TypeORM
Implement JWT authentication
Set up request validation using class-validator
Create role
-based guards (Customer,
Admin)
Implement glo
bal error handling
Product Module
Endpoints
GET /api/products GET /api/products/:id POST /api/products PUT /api/products/:id // List with pagination & filters
// Get single product
// Create (Admin only)
// Update (Admin only)
Features
Use DTOs for validation
Implement caching with Redis
Add request logging middleware
Write unit tests for the service layer
Order Processing
Business Logic
1. Create an order with validation
2. Check inventory availab
ility
3. Process payment (mock implementation)
4. Send order confirmation email (queue jo
b
)
5. Update inventory
Bonus: Implement event-driven architecture using @nestjs/microservices
Laravel Admin Panel
b
Admin Authentication & Dash
oard
Requirements
Laravel Breeze/Jetstream for admin auth
Admin middleware
Dash
b
oard with metrics
User management CRUD
Product Management
Features
1. Product CRUD with image upload
2. Category management with nested categories
3. Bulk operations (
import/export)
4. Soft deletes with restore functionality
Use:
Laravel Resources for API responses
Form Request validation
Queues for processing uploads
Eloquent relationships
Order Management & Reports
Requirements
Order listing with filters
Order status management
Sales reports (daily, weekly,
monthly)
Export reports to CSV/PDF
Bonus: Real
-time notifications using Laravel Echo
Integration Tasks
Service Communication
Nest.js -> Laravel communication:
1. Laravel admin creates a product
2. Nest.js API syncs via we
b
hook/queue
3. Implement API key authentication
b
etween services
OR use a shared database with careful transaction management
Shared Authentication
Requirements
A single JWT token works for b
oth services
Shared user session
b
etween Laravel admin and Nest.js API
Centralized user service (can
b
e in either)
DevOps
Deployment Configuration
1. Docker configuration for b
oth services
2. Nginx configuration for routing
3.
Environment variab
les setup
4. Database seeding scripts
Bonus Points
1. Real
-time features (We
bSockets for order updates)
2. GraphQL endpoint in Nest.js alongside REST
3.
Advanced search with Elasticsearch/Algolia
4. Docker compose with all services
5. CI/CD pipeline configuration
Sub
mission Guidelines
1. Share the GitHub repository with the code deployed
2. Complete as many tasks as possi
b
le
3. Include README with:
Setup instructions
API documentation
Design decisions explanation