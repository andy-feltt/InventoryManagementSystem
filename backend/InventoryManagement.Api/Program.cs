using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using FluentValidation;
using InventoryManagement.Api;
using InventoryManagement.Application;
using InventoryManagement.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

EnvFile.Load(
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "..", ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "InventoryManagement.Api", ".env"),
    Path.Combine(AppContext.BaseDirectory, ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration).WriteTo.Console());

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IReactivationGuard, ReactivationGuard>();
builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();

var jwt = builder.Configuration.GetSection("Jwt");
var secret = builder.Configuration["JWT_SECRET"] ?? jwt["Secret"] ?? throw new InvalidOperationException("JWT secret is not configured.");
var issuer = builder.Configuration["JWT_ISSUER"] ?? jwt["Issuer"] ?? "InventoryManagement";
var audience = builder.Configuration["JWT_AUDIENCE"] ?? jwt["Audience"] ?? "InventoryManagementClient";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // JWT validation is configured from appsettings or environment variables for Docker/cloud portability.
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    var allowedOrigins = (builder.Configuration["Frontend:AllowedOrigins"] ?? builder.Configuration["Frontend:Url"] ?? "http://localhost:5173;http://127.0.0.1:5173")
        .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "InventoryManagementSystem API",
        Version = "v1",
        Description = "Fullstack inventory management API built with .NET 10, EF Core, JWT and Clean Architecture."
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a valid JWT Bearer token."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            []
        }
    });
});

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<DatabaseSeeder>().SeedAsync();
}

app.Run();

namespace InventoryManagement.Api
{
    public sealed class JwtTokenService(IConfiguration configuration) : ITokenService
    {
        public AuthResponse CreateToken(InventoryManagement.Domain.User user)
        {
            var secret = configuration["JWT_SECRET"] ?? configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT secret is not configured.");
            var issuer = configuration["JWT_ISSUER"] ?? configuration["Jwt:Issuer"] ?? "InventoryManagement";
            var audience = configuration["JWT_AUDIENCE"] ?? configuration["Jwt:Audience"] ?? "InventoryManagementClient";
            var expiresAt = DateTime.UtcNow.AddHours(8);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(issuer, audience, claims, expires: expiresAt, signingCredentials: credentials);
            return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt, new UserResponse(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt));
        }
    }

    public sealed class ReactivationGuard(IConfiguration configuration) : IReactivationGuard
    {
        public Result Validate(string password)
        {
            var expectedPassword = configuration["REACTIVATE_PASSWORD"] ?? configuration["Security:ReactivatePassword"];
            if (string.IsNullOrWhiteSpace(expectedPassword))
            {
                return Result.Fail("Reactivation password is not configured.", StatusCodes.Status500InternalServerError);
            }

            // Reactivation is a privileged recovery action, so it requires a separate operator password.
            return password == expectedPassword
                ? Result.Ok()
                : Result.Fail("Invalid reactivation password.", StatusCodes.Status403Forbidden);
        }
    }

    public sealed class ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger, IHostEnvironment environment)
    {
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await next(context);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled API exception");
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "An unexpected error occurred.",
                    detail = environment.IsDevelopment() ? ex.Message : null
                });
            }
        }
    }

    public static class EnvFile
    {
        public static void Load(params string[] paths)
        {
            foreach (var path in paths.Distinct())
            {
                if (!File.Exists(path))
                {
                    continue;
                }

                foreach (var line in File.ReadAllLines(path))
                {
                    var trimmed = line.Trim();
                    if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith('#'))
                    {
                        continue;
                    }

                    var separatorIndex = trimmed.IndexOf('=');
                    if (separatorIndex <= 0)
                    {
                        continue;
                    }

                    var key = trimmed[..separatorIndex].Trim();
                    var value = trimmed[(separatorIndex + 1)..].Trim().Trim('"');
                    Environment.SetEnvironmentVariable(key, value);
                }
            }
        }
    }

    [ApiController]
    public abstract class ApiControllerBase : ControllerBase
    {
        protected Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new InvalidOperationException("User id claim is missing."));

        protected static IActionResult FromResult<T>(Result<T> result) =>
            result.Success ? new OkObjectResult(result.Value) : new ObjectResult(new { error = result.Error }) { StatusCode = result.StatusCode };

        protected static IActionResult FromResult(Result result) =>
            result.Success ? new NoContentResult() : new ObjectResult(new { error = result.Error }) { StatusCode = result.StatusCode };

        protected static async Task<IActionResult?> ValidateAsync<T>(IValidator<T> validator, T request, CancellationToken cancellationToken)
        {
            var validation = await validator.ValidateAsync(request, cancellationToken);
            return validation.IsValid ? null : new BadRequestObjectResult(new { errors = validation.Errors.Select(x => new { x.PropertyName, x.ErrorMessage }) });
        }
    }

    [Route("api/auth")]
    public sealed class AuthController(IAuthService auth, IValidator<LoginRequest> loginValidator, IValidator<RegisterRequest> registerValidator) : ApiControllerBase
    {
        [HttpPost("register-admin")]
        [AllowAnonymous]
        public async Task<IActionResult> RegisterAdmin(RegisterRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(registerValidator, request, cancellationToken);
            return invalid ?? FromResult(await auth.RegisterAdminAsync(request, cancellationToken));
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(loginValidator, request, cancellationToken);
            return invalid ?? FromResult(await auth.LoginAsync(request, cancellationToken));
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me(CancellationToken cancellationToken) => FromResult(await auth.GetProfileAsync(CurrentUserId, cancellationToken));
    }

    [Authorize]
    [Route("api/products")]
    public sealed class ProductsController(IProductService products, IValidator<ProductCreateRequest> createValidator, IValidator<ProductUpdateRequest> updateValidator, IValidator<ReactivateRequest> reactivateValidator) : ApiControllerBase
    {
        [HttpGet]
        public Task<PagedResult<ProductResponse>> Get([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] Guid? categoryId = null, [FromQuery] bool? isActive = null, CancellationToken cancellationToken = default) =>
            products.GetPagedAsync(page, pageSize, search, categoryId, isActive, cancellationToken);

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken) => FromResult(await products.GetByIdAsync(id, cancellationToken));

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create(ProductCreateRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(createValidator, request, cancellationToken);
            return invalid ?? FromResult(await products.CreateAsync(request, cancellationToken));
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(Guid id, ProductUpdateRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(updateValidator, request, cancellationToken);
            return invalid ?? FromResult(await products.UpdateAsync(id, request, cancellationToken));
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken) => FromResult(await products.DeactivateAsync(id, cancellationToken));

        [HttpPatch("{id:guid}/activate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reactivate(Guid id, ReactivateRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(reactivateValidator, request, cancellationToken);
            return invalid ?? FromResult(await products.ReactivateAsync(id, request, cancellationToken));
        }
    }

    [Authorize]
    [Route("api/categories")]
    public sealed class CategoriesController(ICategoryService categories, IValidator<CategoryRequest> validator, IValidator<ReactivateRequest> reactivateValidator) : ApiControllerBase
    {
        [HttpGet]
        public Task<IReadOnlyList<CategoryResponse>> Get(CancellationToken cancellationToken) => categories.GetAllAsync(cancellationToken);

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create(CategoryRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(validator, request, cancellationToken);
            return invalid ?? FromResult(await categories.CreateAsync(request, cancellationToken));
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(Guid id, CategoryRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(validator, request, cancellationToken);
            return invalid ?? FromResult(await categories.UpdateAsync(id, request, cancellationToken));
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken) => FromResult(await categories.DeactivateAsync(id, cancellationToken));

        [HttpPatch("{id:guid}/activate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reactivate(Guid id, ReactivateRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(reactivateValidator, request, cancellationToken);
            return invalid ?? FromResult(await categories.ReactivateAsync(id, request, cancellationToken));
        }
    }

    [Authorize]
    [Route("api/suppliers")]
    public sealed class SuppliersController(ISupplierService suppliers, IValidator<SupplierRequest> validator, IValidator<ReactivateRequest> reactivateValidator) : ApiControllerBase
    {
        [HttpGet]
        public Task<IReadOnlyList<SupplierResponse>> Get(CancellationToken cancellationToken) => suppliers.GetAllAsync(cancellationToken);

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create(SupplierRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(validator, request, cancellationToken);
            return invalid ?? FromResult(await suppliers.CreateAsync(request, cancellationToken));
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(Guid id, SupplierRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(validator, request, cancellationToken);
            return invalid ?? FromResult(await suppliers.UpdateAsync(id, request, cancellationToken));
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken) => FromResult(await suppliers.DeactivateAsync(id, cancellationToken));

        [HttpPatch("{id:guid}/activate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reactivate(Guid id, ReactivateRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(reactivateValidator, request, cancellationToken);
            return invalid ?? FromResult(await suppliers.ReactivateAsync(id, request, cancellationToken));
        }
    }

    [Authorize]
    [Route("api/inventory-movements")]
    public sealed class InventoryMovementsController(IInventoryMovementService movements, IValidator<InventoryMovementRequest> validator) : ApiControllerBase
    {
        [HttpGet("latest")]
        public Task<IReadOnlyList<InventoryMovementResponse>> Latest([FromQuery] int take = 20, CancellationToken cancellationToken = default) => movements.GetLatestAsync(take, cancellationToken);

        [HttpGet("product/{productId:guid}")]
        public Task<IReadOnlyList<InventoryMovementResponse>> ByProduct(Guid productId, CancellationToken cancellationToken) => movements.GetByProductAsync(productId, cancellationToken);

        [HttpPost]
        public async Task<IActionResult> Register(InventoryMovementRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(validator, request, cancellationToken);
            return invalid ?? FromResult(await movements.RegisterAsync(request, CurrentUserId, cancellationToken));
        }
    }

    [Authorize]
    [Route("api/dashboard")]
    public sealed class DashboardController(IDashboardService dashboard) : ApiControllerBase
    {
        [HttpGet]
        public Task<DashboardResponse> Get(CancellationToken cancellationToken) => dashboard.GetAsync(cancellationToken);
    }

    [Authorize(Roles = "Admin")]
    [Route("api/admin")]
    public sealed class AdminController(IAdminService admin, IValidator<ProtectedDeleteRequest> deleteValidator) : ApiControllerBase
    {
        [HttpDelete("products/{id:guid}")]
        public async Task<IActionResult> DeleteProduct(Guid id, ProtectedDeleteRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(deleteValidator, request, cancellationToken);
            return invalid ?? FromResult(await admin.DeleteProductAsync(id, request, cancellationToken));
        }

        [HttpDelete("categories/{id:guid}")]
        public async Task<IActionResult> DeleteCategory(Guid id, ProtectedDeleteRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(deleteValidator, request, cancellationToken);
            return invalid ?? FromResult(await admin.DeleteCategoryAsync(id, request, cancellationToken));
        }

        [HttpDelete("suppliers/{id:guid}")]
        public async Task<IActionResult> DeleteSupplier(Guid id, ProtectedDeleteRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(deleteValidator, request, cancellationToken);
            return invalid ?? FromResult(await admin.DeleteSupplierAsync(id, request, cancellationToken));
        }

        [HttpDelete("inventory-movements/{id:guid}")]
        public async Task<IActionResult> DeleteInventoryMovement(Guid id, ProtectedDeleteRequest request, CancellationToken cancellationToken)
        {
            var invalid = await ValidateAsync(deleteValidator, request, cancellationToken);
            return invalid ?? FromResult(await admin.DeleteInventoryMovementAsync(id, request, cancellationToken));
        }
    }
}
