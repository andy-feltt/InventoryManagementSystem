# Architecture

## Why Clean Architecture

Clean Architecture keeps business rules independent from frameworks and infrastructure. The inventory rules can be tested without ASP.NET Core, SQL Server or Entity Framework, while the API and database layers can evolve with less risk.

## Layers

- **Domain** contains entities, enums and pure business rules. The stock movement rule that prevents negative inventory lives here.
- **Application** contains DTOs, validators, service interfaces and use-case services. It coordinates repositories without depending on Entity Framework.
- **Infrastructure** contains SQL Server persistence, `DbContext`, repositories, password hashing and database seed logic.
- **Api** contains controllers, JWT authentication, Swagger, CORS, dependency injection and error middleware.

## Request Flow

1. A client sends a request to an API controller.
2. ASP.NET Core validates authentication and role requirements.
3. The controller validates the request DTO with FluentValidation.
4. The controller calls an Application service.
5. The service applies application logic and calls repository interfaces.
6. Infrastructure repositories persist through EF Core and SQL Server.
7. The service returns a DTO or a clear error result.

## Separation of Responsibilities

Controllers stay thin and do not contain business rules. Services own use-case coordination. Domain entities protect core inventory invariants. Infrastructure owns database-specific details, migrations and external implementations.
