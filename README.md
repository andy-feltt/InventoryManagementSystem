# InventoryManagementSystem

Professional fullstack inventory management system built as a portfolio project for a Junior Full Stack Developer profile.

## Objective

Demonstrate practical experience with .NET 10, ASP.NET Core Web API, React, TypeScript, SQL Server, Entity Framework Core, JWT, Docker, unit testing, Swagger, GitHub Actions and Clean Architecture.

## Tech Stack

- Backend: .NET 10, ASP.NET Core Web API, EF Core, SQL Server, JWT, FluentValidation, Serilog, Swagger.
- Frontend: React, TypeScript, Vite, TailwindCSS, Axios, React Router, Context API.
- Testing: xUnit, Moq, FluentAssertions.
- DevOps: Docker, Docker Compose, GitHub Actions CI.

## Architecture

The backend uses Clean Architecture:

- `InventoryManagement.Domain`: entities, enums and inventory business rules.
- `InventoryManagement.Application`: DTOs, validators, repository contracts and use-case services.
- `InventoryManagement.Infrastructure`: EF Core, SQL Server repositories, migrations and seed data.
- `InventoryManagement.Api`: controllers, JWT, Swagger, CORS and middleware.

See [docs/architecture.md](docs/architecture.md).

## Features

- JWT login and authenticated profile endpoint.
- Roles: Admin and Employee.
- Product management with SKU uniqueness and logical deactivation.
- Category and supplier CRUD with logical deactivation.
- Inventory entries, exits and manual adjustments.
- Prevents stock exits that would create negative stock.
- Dashboard metrics and latest movements.
- Swagger documentation with Bearer token support.
- Responsive React UI with protected routes.

## Screenshots

Screenshots can be added under [docs/screenshots](docs/screenshots).

## Run Locally

Requirements: .NET 10 SDK, Node.js 24+, SQL Server.

```bash
cd backend
dotnet restore InventoryManagement.sln
dotnet tool restore
dotnet ef database update --project InventoryManagement.Infrastructure --startup-project InventoryManagement.Api
dotnet run --project InventoryManagement.Api
```

```bash
cd frontend/inventory-management-client
npm install
npm run dev
```

Frontend default: `http://localhost:5173`  
API default: `http://localhost:5000`  
Swagger: `http://localhost:5000/swagger`

## Run With Docker

```bash
cp .env.example .env
docker compose up --build
```

## Test Credentials

- Email: `admin@inventory.local`
- Password: `Admin123*`

Seed data is created automatically when the API starts.

## Main API Endpoints

See [docs/api-endpoints.md](docs/api-endpoints.md).

## Database Diagram

See [docs/database-diagram.md](docs/database-diagram.md).

## Run Tests

```bash
cd backend
dotnet test InventoryManagement.sln
```

## Project Structure

```text
InventoryManagementSystem/
├── backend/
├── frontend/
├── docs/
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .env.example
└── README.md
```

## Next Improvements

- Refresh tokens.
- User management screen.
- Advanced filtering and export reports.
- Integration tests with Testcontainers.
- Role-based UI permissions.

## Author

Andy Feltt
