using InventoryManagement.Domain;

namespace InventoryManagement.Application;

public sealed record Result(bool Success, string? Error = null, int StatusCode = 200)
{
    public static Result Ok() => new(true);
    public static Result Fail(string error, int statusCode = 400) => new(false, error, statusCode);
}

public sealed record Result<T>(bool Success, T? Value = default, string? Error = null, int StatusCode = 200)
{
    public static Result<T> Ok(T value) => new(true, value);
    public static Result<T> Fail(string error, int statusCode = 400) => new(false, default, error, statusCode);
}

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public sealed record LoginRequest(string Email, string Password);
public sealed record RegisterRequest(string FullName, string Email, string Password, UserRole Role = UserRole.Admin);
public sealed record AuthResponse(string Token, DateTime ExpiresAt, UserResponse User);
public sealed record UserResponse(Guid Id, string FullName, string Email, UserRole Role, DateTime CreatedAt);

public sealed record ProductCreateRequest(
    string Name,
    string? Description,
    string SKU,
    Guid CategoryId,
    Guid SupplierId,
    int CurrentStock,
    int MinimumStock,
    decimal UnitPrice);

public sealed record ProductUpdateRequest(
    string Name,
    string? Description,
    Guid CategoryId,
    Guid SupplierId,
    int MinimumStock,
    decimal UnitPrice,
    bool IsActive);

public sealed record ProductResponse(
    Guid Id,
    string Name,
    string? Description,
    string SKU,
    Guid CategoryId,
    string CategoryName,
    Guid SupplierId,
    string SupplierName,
    int CurrentStock,
    int MinimumStock,
    decimal UnitPrice,
    bool IsActive,
    bool IsLowStock,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record CategoryRequest(string Name, string? Description);
public sealed record CategoryResponse(Guid Id, string Name, string? Description, bool IsActive);

public sealed record SupplierRequest(string Name, string? ContactName, string? Email, string? Phone, string? Address);
public sealed record SupplierResponse(Guid Id, string Name, string? ContactName, string? Email, string? Phone, string? Address, bool IsActive);

public sealed record ReactivateRequest(string Password);

public sealed record InventoryMovementRequest(Guid ProductId, MovementType Type, int Quantity, string Reason);
public sealed record InventoryMovementResponse(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string SKU,
    MovementType Type,
    int Quantity,
    int PreviousStock,
    int NewStock,
    string Reason,
    Guid CreatedByUserId,
    string CreatedByUserName,
    DateTime CreatedAt);

public sealed record DashboardResponse(
    int TotalActiveProducts,
    int LowStockProducts,
    int TotalActiveSuppliers,
    decimal EstimatedInventoryValue,
    IReadOnlyList<InventoryMovementResponse> LatestMovements);

public interface IAuthService
{
    Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<Result<UserResponse>> RegisterAdminAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<Result<UserResponse>> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface IProductService
{
    Task<Result<ProductResponse>> CreateAsync(ProductCreateRequest request, CancellationToken cancellationToken = default);
    Task<PagedResult<ProductResponse>> GetPagedAsync(int page, int pageSize, string? search, Guid? categoryId, bool? isActive, CancellationToken cancellationToken = default);
    Task<Result<ProductResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<ProductResponse>> UpdateAsync(Guid id, ProductUpdateRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeactivateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result> ReactivateAsync(Guid id, ReactivateRequest request, CancellationToken cancellationToken = default);
}

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Result<CategoryResponse>> CreateAsync(CategoryRequest request, CancellationToken cancellationToken = default);
    Task<Result<CategoryResponse>> UpdateAsync(Guid id, CategoryRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeactivateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result> ReactivateAsync(Guid id, ReactivateRequest request, CancellationToken cancellationToken = default);
}

public interface ISupplierService
{
    Task<IReadOnlyList<SupplierResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Result<SupplierResponse>> CreateAsync(SupplierRequest request, CancellationToken cancellationToken = default);
    Task<Result<SupplierResponse>> UpdateAsync(Guid id, SupplierRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeactivateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result> ReactivateAsync(Guid id, ReactivateRequest request, CancellationToken cancellationToken = default);
}

public interface IInventoryMovementService
{
    Task<Result<InventoryMovementResponse>> RegisterAsync(InventoryMovementRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryMovementResponse>> GetByProductAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryMovementResponse>> GetLatestAsync(int take = 20, CancellationToken cancellationToken = default);
}

public interface IDashboardService
{
    Task<DashboardResponse> GetAsync(CancellationToken cancellationToken = default);
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}

public interface ITokenService
{
    AuthResponse CreateToken(User user);
}

public interface IReactivationGuard
{
    Result Validate(string password);
}

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<bool> AnyAsync(CancellationToken cancellationToken = default);
    Task AddAsync(User user, CancellationToken cancellationToken = default);
}

public interface IProductRepository
{
    Task AddAsync(Product product, CancellationToken cancellationToken = default);
    Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Product?> GetBySkuAsync(string sku, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Product> Items, int TotalCount)> GetPagedAsync(int page, int pageSize, string? search, Guid? categoryId, bool? isActive, CancellationToken cancellationToken = default);
    Task<int> CountActiveAsync(CancellationToken cancellationToken = default);
    Task<int> CountLowStockAsync(CancellationToken cancellationToken = default);
    Task<decimal> EstimatedValueAsync(CancellationToken cancellationToken = default);
}

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Category?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(Category category, CancellationToken cancellationToken = default);
}

public interface ISupplierRepository
{
    Task<IReadOnlyList<Supplier>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Supplier?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> CountActiveAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Supplier supplier, CancellationToken cancellationToken = default);
}

public interface IInventoryMovementRepository
{
    Task AddAsync(InventoryMovement movement, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryMovement>> GetByProductAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryMovement>> GetLatestAsync(int take, CancellationToken cancellationToken = default);
}
