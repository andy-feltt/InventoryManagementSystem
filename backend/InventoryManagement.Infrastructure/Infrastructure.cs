using InventoryManagement.Application;
using InventoryManagement.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InventoryManagement.Infrastructure;

public sealed class InventoryDbContext(DbContextOptions<InventoryDbContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.FullName).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(160).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(255).IsRequired();
            entity.Property(x => x.Role).HasConversion<string>().HasMaxLength(32);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.Property(x => x.Name).HasMaxLength(160).IsRequired();
            entity.Property(x => x.ContactName).HasMaxLength(160);
            entity.Property(x => x.Email).HasMaxLength(160);
            entity.Property(x => x.Phone).HasMaxLength(40);
            entity.Property(x => x.Address).HasMaxLength(300);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasIndex(x => x.SKU).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(500);
            entity.Property(x => x.SKU).HasMaxLength(64).IsRequired();
            entity.Property(x => x.UnitPrice).HasColumnType("numeric(18,2)");
            entity.HasOne(x => x.Category).WithMany(x => x.Products).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Supplier).WithMany(x => x.Products).HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InventoryMovement>(entity =>
        {
            entity.Property(x => x.Type).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Reason).HasMaxLength(240).IsRequired();
            entity.HasOne(x => x.Product).WithMany(x => x.Movements).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["ConnectionStrings__DefaultConnection"];

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("DefaultConnection is not configured. Set ConnectionStrings__DefaultConnection as an environment variable.");
        }

        services.AddDbContext<InventoryDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<InventoryDbContext>());
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ISupplierRepository, SupplierRepository>();
        services.AddScoped<IInventoryMovementRepository, InventoryMovementRepository>();
        services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<DatabaseSeeder>();
        return services;
    }
}

public sealed class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);
    public bool Verify(string password, string passwordHash) => BCrypt.Net.BCrypt.Verify(password, passwordHash);
}

public sealed class UserRepository(InventoryDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) => db.Users.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) => db.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
    public Task<bool> AnyAsync(CancellationToken cancellationToken = default) => db.Users.AnyAsync(cancellationToken);
    public async Task AddAsync(User user, CancellationToken cancellationToken = default) => await db.Users.AddAsync(user, cancellationToken);
}

public sealed class ProductRepository(InventoryDbContext db) : IProductRepository
{
    public async Task AddAsync(Product product, CancellationToken cancellationToken = default) => await db.Products.AddAsync(product, cancellationToken);

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.Products.Include(x => x.Category).Include(x => x.Supplier).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<Product?> GetBySkuAsync(string sku, CancellationToken cancellationToken = default) =>
        db.Products.FirstOrDefaultAsync(x => x.SKU == sku.ToUpperInvariant(), cancellationToken);

    public async Task<(IReadOnlyList<Product> Items, int TotalCount)> GetPagedAsync(int page, int pageSize, string? search, Guid? categoryId, bool? isActive, CancellationToken cancellationToken = default)
    {
        var query = db.Products.Include(x => x.Category).Include(x => x.Supplier).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            query = query.Where(x => x.Name.Contains(value) || x.SKU.Contains(value) || (x.Category != null && x.Category.Name.Contains(value)));
        }

        if (categoryId.HasValue)
        {
            query = query.Where(x => x.CategoryId == categoryId.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(x => x.IsActive == isActive.Value);
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(x => x.Name).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return (items, total);
    }

    public Task<int> CountActiveAsync(CancellationToken cancellationToken = default) => db.Products.CountAsync(x => x.IsActive, cancellationToken);
    public Task<int> CountLowStockAsync(CancellationToken cancellationToken = default) => db.Products.CountAsync(x => x.IsActive && x.CurrentStock <= x.MinimumStock, cancellationToken);
    public Task<decimal> EstimatedValueAsync(CancellationToken cancellationToken = default) => db.Products.Where(x => x.IsActive).SumAsync(x => x.UnitPrice * x.CurrentStock, cancellationToken);
    public Task<bool> HasMovementsAsync(Guid productId, CancellationToken cancellationToken = default) => db.InventoryMovements.AnyAsync(x => x.ProductId == productId, cancellationToken);
    public void Remove(Product product) => db.Products.Remove(product);
}

public sealed class CategoryRepository(InventoryDbContext db) : ICategoryRepository
{
    public async Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken = default) => await db.Categories.OrderBy(x => x.Name).ToListAsync(cancellationToken);
    public Task<Category?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) => db.Categories.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    public async Task AddAsync(Category category, CancellationToken cancellationToken = default) => await db.Categories.AddAsync(category, cancellationToken);
    public Task<bool> HasProductsAsync(Guid categoryId, CancellationToken cancellationToken = default) => db.Products.AnyAsync(x => x.CategoryId == categoryId, cancellationToken);
    public void Remove(Category category) => db.Categories.Remove(category);
}

public sealed class SupplierRepository(InventoryDbContext db) : ISupplierRepository
{
    public async Task<IReadOnlyList<Supplier>> GetAllAsync(CancellationToken cancellationToken = default) => await db.Suppliers.OrderBy(x => x.Name).ToListAsync(cancellationToken);
    public Task<Supplier?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) => db.Suppliers.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    public Task<int> CountActiveAsync(CancellationToken cancellationToken = default) => db.Suppliers.CountAsync(x => x.IsActive, cancellationToken);
    public async Task AddAsync(Supplier supplier, CancellationToken cancellationToken = default) => await db.Suppliers.AddAsync(supplier, cancellationToken);
    public Task<bool> HasProductsAsync(Guid supplierId, CancellationToken cancellationToken = default) => db.Products.AnyAsync(x => x.SupplierId == supplierId, cancellationToken);
    public void Remove(Supplier supplier) => db.Suppliers.Remove(supplier);
}

public sealed class InventoryMovementRepository(InventoryDbContext db) : IInventoryMovementRepository
{
    public async Task AddAsync(InventoryMovement movement, CancellationToken cancellationToken = default) => await db.InventoryMovements.AddAsync(movement, cancellationToken);

    public Task<InventoryMovement?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.InventoryMovements.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<InventoryMovement>> GetByProductAsync(Guid productId, CancellationToken cancellationToken = default) =>
        await Query().Where(x => x.ProductId == productId).OrderByDescending(x => x.CreatedAt).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<InventoryMovement>> GetLatestAsync(int take, CancellationToken cancellationToken = default) =>
        await Query().OrderByDescending(x => x.CreatedAt).Take(take).ToListAsync(cancellationToken);

    private IQueryable<InventoryMovement> Query() => db.InventoryMovements.Include(x => x.Product).Include(x => x.CreatedByUser);
    public void Remove(InventoryMovement movement) => db.InventoryMovements.Remove(movement);
}

public sealed class DatabaseSeeder(InventoryDbContext db, IPasswordHasher passwordHasher, IConfiguration configuration)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await db.Database.MigrateAsync(cancellationToken);

        if (await db.Users.AnyAsync(cancellationToken))
        {
            return;
        }

        var adminPassword = configuration["SEED_ADMIN_PASSWORD"] ?? configuration["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException("Seed admin password is not configured. Set SEED_ADMIN_PASSWORD as an environment variable.");
        }

        var admin = new User
        {
            FullName = configuration["SEED_ADMIN_FULL_NAME"] ?? "Inventory Admin",
            Email = configuration["SEED_ADMIN_EMAIL"] ?? "admin@inventory.local",
            PasswordHash = passwordHasher.Hash(adminPassword),
            Role = UserRole.Admin
        };

        var categories = new[]
        {
            new Category { Name = "Electronics", Description = "Devices and accessories" },
            new Category { Name = "Office Supplies", Description = "Daily office consumables" },
            new Category { Name = "Warehouse", Description = "Operational warehouse materials" }
        };

        var suppliers = new[]
        {
            new Supplier { Name = "Northwind Distribution", ContactName = "Laura Perez", Email = "sales@northwind.local", Phone = "+1 555 0100", Address = "100 Market St" },
            new Supplier { Name = "Contoso Supplies", ContactName = "Mark Lee", Email = "orders@contoso.local", Phone = "+1 555 0101", Address = "42 Industrial Ave" }
        };

        var products = new[]
        {
            new Product { Name = "Barcode Scanner", SKU = "ELEC-BC-001", Description = "USB barcode scanner", Category = categories[0], Supplier = suppliers[0], CurrentStock = 0, MinimumStock = 5, UnitPrice = 89.99m },
            new Product { Name = "Packing Tape", SKU = "WARE-TP-001", Description = "Heavy duty tape roll", Category = categories[2], Supplier = suppliers[1], CurrentStock = 0, MinimumStock = 10, UnitPrice = 3.50m },
            new Product { Name = "A4 Paper Box", SKU = "OFF-PAPER-001", Description = "Box of printer paper", Category = categories[1], Supplier = suppliers[1], CurrentStock = 0, MinimumStock = 8, UnitPrice = 24.00m }
        };

        await db.Users.AddAsync(admin, cancellationToken);
        await db.Categories.AddRangeAsync(categories, cancellationToken);
        await db.Suppliers.AddRangeAsync(suppliers, cancellationToken);
        await db.Products.AddRangeAsync(products, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        await db.InventoryMovements.AddRangeAsync(new[]
        {
            InventoryMovement.Create(products[0], MovementType.Entry, 18, "Initial stock", admin.Id),
            InventoryMovement.Create(products[1], MovementType.Entry, 7, "Initial stock", admin.Id),
            InventoryMovement.Create(products[2], MovementType.Entry, 25, "Initial stock", admin.Id)
        }, cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
    }
}
