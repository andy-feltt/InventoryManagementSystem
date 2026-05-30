using InventoryManagement.Domain;

namespace InventoryManagement.Application;

public sealed class AuthService(IUserRepository users, IPasswordHasher passwordHasher, ITokenService tokenService, IUnitOfWork unitOfWork) : IAuthService
{
    public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByEmailAsync(request.Email.Trim().ToLowerInvariant(), cancellationToken);
        if (user is null || !user.IsActive || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Result<AuthResponse>.Fail("Invalid email or password.", 401);
        }

        return Result<AuthResponse>.Ok(tokenService.CreateToken(user));
    }

    public async Task<Result<UserResponse>> RegisterAdminAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        if (await users.AnyAsync(cancellationToken))
        {
            return Result<UserResponse>.Fail("Initial admin user already exists.", 409);
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHasher.Hash(request.Password),
            Role = UserRole.Admin
        };

        await users.AddAsync(user, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<UserResponse>.Ok(MapUser(user));
    }

    public async Task<Result<UserResponse>> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken);
        return user is null ? Result<UserResponse>.Fail("User not found.", 404) : Result<UserResponse>.Ok(MapUser(user));
    }

    private static UserResponse MapUser(User user) => new(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt);
}

public sealed class ProductService(IProductRepository products, ICategoryRepository categories, ISupplierRepository suppliers, IUnitOfWork unitOfWork) : IProductService
{
    public async Task<Result<ProductResponse>> CreateAsync(ProductCreateRequest request, CancellationToken cancellationToken = default)
    {
        if (await products.GetBySkuAsync(request.SKU.Trim(), cancellationToken) is not null)
        {
            return Result<ProductResponse>.Fail("SKU already exists.", 409);
        }

        if (await categories.GetByIdAsync(request.CategoryId, cancellationToken) is null)
        {
            return Result<ProductResponse>.Fail("Category not found.", 404);
        }

        if (await suppliers.GetByIdAsync(request.SupplierId, cancellationToken) is null)
        {
            return Result<ProductResponse>.Fail("Supplier not found.", 404);
        }

        var product = new Product
        {
            Name = request.Name.Trim(),
            Description = request.Description,
            SKU = request.SKU.Trim().ToUpperInvariant(),
            CategoryId = request.CategoryId,
            SupplierId = request.SupplierId,
            CurrentStock = request.CurrentStock,
            MinimumStock = request.MinimumStock,
            UnitPrice = request.UnitPrice
        };

        await products.AddAsync(product, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        product = await products.GetByIdAsync(product.Id, cancellationToken) ?? product;
        return Result<ProductResponse>.Ok(MapProduct(product));
    }

    public async Task<PagedResult<ProductResponse>> GetPagedAsync(int page, int pageSize, string? search, Guid? categoryId, bool? isActive, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var (items, totalCount) = await products.GetPagedAsync(page, pageSize, search, categoryId, isActive, cancellationToken);
        return new PagedResult<ProductResponse>(items.Select(MapProduct).ToList(), page, pageSize, totalCount);
    }

    public async Task<Result<ProductResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var product = await products.GetByIdAsync(id, cancellationToken);
        return product is null ? Result<ProductResponse>.Fail("Product not found.", 404) : Result<ProductResponse>.Ok(MapProduct(product));
    }

    public async Task<Result<ProductResponse>> UpdateAsync(Guid id, ProductUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var product = await products.GetByIdAsync(id, cancellationToken);
        if (product is null)
        {
            return Result<ProductResponse>.Fail("Product not found.", 404);
        }

        if (await categories.GetByIdAsync(request.CategoryId, cancellationToken) is null)
        {
            return Result<ProductResponse>.Fail("Category not found.", 404);
        }

        if (await suppliers.GetByIdAsync(request.SupplierId, cancellationToken) is null)
        {
            return Result<ProductResponse>.Fail("Supplier not found.", 404);
        }

        product.Name = request.Name.Trim();
        product.Description = request.Description;
        product.CategoryId = request.CategoryId;
        product.SupplierId = request.SupplierId;
        product.MinimumStock = request.MinimumStock;
        product.UnitPrice = request.UnitPrice;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        product = await products.GetByIdAsync(id, cancellationToken) ?? product;
        return Result<ProductResponse>.Ok(MapProduct(product));
    }

    public async Task<Result> DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var product = await products.GetByIdAsync(id, cancellationToken);
        if (product is null)
        {
            return Result.Fail("Product not found.", 404);
        }

        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Ok();
    }

    internal static ProductResponse MapProduct(Product product) => new(
        product.Id,
        product.Name,
        product.Description,
        product.SKU,
        product.CategoryId,
        product.Category?.Name ?? string.Empty,
        product.SupplierId,
        product.Supplier?.Name ?? string.Empty,
        product.CurrentStock,
        product.MinimumStock,
        product.UnitPrice,
        product.IsActive,
        product.IsLowStock,
        product.CreatedAt,
        product.UpdatedAt);
}

public sealed class CategoryService(ICategoryRepository categories, IUnitOfWork unitOfWork) : ICategoryService
{
    public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken = default) =>
        (await categories.GetAllAsync(cancellationToken)).Select(MapCategory).ToList();

    public async Task<Result<CategoryResponse>> CreateAsync(CategoryRequest request, CancellationToken cancellationToken = default)
    {
        var category = new Category { Name = request.Name.Trim(), Description = request.Description };
        await categories.AddAsync(category, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<CategoryResponse>.Ok(MapCategory(category));
    }

    public async Task<Result<CategoryResponse>> UpdateAsync(Guid id, CategoryRequest request, CancellationToken cancellationToken = default)
    {
        var category = await categories.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return Result<CategoryResponse>.Fail("Category not found.", 404);
        }

        category.Name = request.Name.Trim();
        category.Description = request.Description;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<CategoryResponse>.Ok(MapCategory(category));
    }

    public async Task<Result> DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var category = await categories.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return Result.Fail("Category not found.", 404);
        }

        category.IsActive = false;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Ok();
    }

    private static CategoryResponse MapCategory(Category category) => new(category.Id, category.Name, category.Description, category.IsActive);
}

public sealed class SupplierService(ISupplierRepository suppliers, IUnitOfWork unitOfWork) : ISupplierService
{
    public async Task<IReadOnlyList<SupplierResponse>> GetAllAsync(CancellationToken cancellationToken = default) =>
        (await suppliers.GetAllAsync(cancellationToken)).Select(MapSupplier).ToList();

    public async Task<Result<SupplierResponse>> CreateAsync(SupplierRequest request, CancellationToken cancellationToken = default)
    {
        var supplier = new Supplier { Name = request.Name.Trim(), ContactName = request.ContactName, Email = request.Email, Phone = request.Phone, Address = request.Address };
        await suppliers.AddAsync(supplier, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<SupplierResponse>.Ok(MapSupplier(supplier));
    }

    public async Task<Result<SupplierResponse>> UpdateAsync(Guid id, SupplierRequest request, CancellationToken cancellationToken = default)
    {
        var supplier = await suppliers.GetByIdAsync(id, cancellationToken);
        if (supplier is null)
        {
            return Result<SupplierResponse>.Fail("Supplier not found.", 404);
        }

        supplier.Name = request.Name.Trim();
        supplier.ContactName = request.ContactName;
        supplier.Email = request.Email;
        supplier.Phone = request.Phone;
        supplier.Address = request.Address;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<SupplierResponse>.Ok(MapSupplier(supplier));
    }

    public async Task<Result> DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var supplier = await suppliers.GetByIdAsync(id, cancellationToken);
        if (supplier is null)
        {
            return Result.Fail("Supplier not found.", 404);
        }

        supplier.IsActive = false;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Ok();
    }

    private static SupplierResponse MapSupplier(Supplier supplier) => new(supplier.Id, supplier.Name, supplier.ContactName, supplier.Email, supplier.Phone, supplier.Address, supplier.IsActive);
}

public sealed class InventoryMovementService(IProductRepository products, IInventoryMovementRepository movements, IUnitOfWork unitOfWork) : IInventoryMovementService
{
    public async Task<Result<InventoryMovementResponse>> RegisterAsync(InventoryMovementRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var product = await products.GetByIdAsync(request.ProductId, cancellationToken);
        if (product is null || !product.IsActive)
        {
            return Result<InventoryMovementResponse>.Fail("Product not found or inactive.", 404);
        }

        try
        {
            var movement = InventoryMovement.Create(product, request.Type, request.Quantity, request.Reason.Trim(), userId);
            await movements.AddAsync(movement, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            movement = (await movements.GetLatestAsync(1, cancellationToken)).FirstOrDefault(x => x.Id == movement.Id) ?? movement;
            return Result<InventoryMovementResponse>.Ok(MapMovement(movement));
        }
        catch (InvalidOperationException ex)
        {
            return Result<InventoryMovementResponse>.Fail(ex.Message);
        }
    }

    public async Task<IReadOnlyList<InventoryMovementResponse>> GetByProductAsync(Guid productId, CancellationToken cancellationToken = default) =>
        (await movements.GetByProductAsync(productId, cancellationToken)).Select(MapMovement).ToList();

    public async Task<IReadOnlyList<InventoryMovementResponse>> GetLatestAsync(int take = 20, CancellationToken cancellationToken = default) =>
        (await movements.GetLatestAsync(Math.Clamp(take, 1, 100), cancellationToken)).Select(MapMovement).ToList();

    internal static InventoryMovementResponse MapMovement(InventoryMovement movement) => new(
        movement.Id,
        movement.ProductId,
        movement.Product?.Name ?? string.Empty,
        movement.Product?.SKU ?? string.Empty,
        movement.Type,
        movement.Quantity,
        movement.PreviousStock,
        movement.NewStock,
        movement.Reason,
        movement.CreatedByUserId,
        movement.CreatedByUser?.FullName ?? string.Empty,
        movement.CreatedAt);
}

public sealed class DashboardService(IProductRepository products, ISupplierRepository suppliers, IInventoryMovementRepository movements) : IDashboardService
{
    public async Task<DashboardResponse> GetAsync(CancellationToken cancellationToken = default) => new(
        await products.CountActiveAsync(cancellationToken),
        await products.CountLowStockAsync(cancellationToken),
        await suppliers.CountActiveAsync(cancellationToken),
        await products.EstimatedValueAsync(cancellationToken),
        (await movements.GetLatestAsync(5, cancellationToken)).Select(InventoryMovementService.MapMovement).ToList());
}
