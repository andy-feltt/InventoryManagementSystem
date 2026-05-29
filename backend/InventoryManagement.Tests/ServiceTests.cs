using FluentAssertions;
using InventoryManagement.Application;
using InventoryManagement.Domain;
using Moq;

namespace InventoryManagement.Tests;

public sealed class AuthServiceTests
{
    [Fact]
    public async Task LoginAsync_WithInvalidCredentials_ReturnsUnauthorized()
    {
        var users = new Mock<IUserRepository>();
        var passwordHasher = new Mock<IPasswordHasher>();
        var tokenService = new Mock<ITokenService>();
        var unitOfWork = new Mock<IUnitOfWork>();
        users.Setup(x => x.GetByEmailAsync("admin@inventory.local", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Email = "admin@inventory.local", IsActive = true, PasswordHash = "hash" });
        passwordHasher.Setup(x => x.Verify("wrong", "hash")).Returns(false);

        var service = new AuthService(users.Object, passwordHasher.Object, tokenService.Object, unitOfWork.Object);

        var result = await service.LoginAsync(new LoginRequest("admin@inventory.local", "wrong"));

        result.Success.Should().BeFalse();
        result.StatusCode.Should().Be(401);
    }
}

public sealed class ProductServiceTests
{
    [Fact]
    public async Task CreateAsync_WithValidProduct_PersistsProduct()
    {
        var products = new Mock<IProductRepository>();
        var categories = new Mock<ICategoryRepository>();
        var suppliers = new Mock<ISupplierRepository>();
        var unitOfWork = new Mock<IUnitOfWork>();
        var categoryId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();

        categories.Setup(x => x.GetByIdAsync(categoryId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Category { Id = categoryId, Name = "Electronics" });
        suppliers.Setup(x => x.GetByIdAsync(supplierId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Supplier { Id = supplierId, Name = "Northwind" });
        products.Setup(x => x.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid id, CancellationToken _) => new Product
            {
                Id = id,
                Name = "Scanner",
                SKU = "SCN-001",
                CategoryId = categoryId,
                Category = new Category { Id = categoryId, Name = "Electronics" },
                SupplierId = supplierId,
                Supplier = new Supplier { Id = supplierId, Name = "Northwind" },
                CurrentStock = 5,
                MinimumStock = 1,
                UnitPrice = 50
            });

        var service = new ProductService(products.Object, categories.Object, suppliers.Object, unitOfWork.Object);

        var result = await service.CreateAsync(new ProductCreateRequest("Scanner", null, "SCN-001", categoryId, supplierId, 5, 1, 50));

        result.Success.Should().BeTrue();
        products.Verify(x => x.AddAsync(It.Is<Product>(p => p.SKU == "SCN-001"), It.IsAny<CancellationToken>()), Times.Once);
        unitOfWork.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WithDuplicateSku_ReturnsConflict()
    {
        var products = new Mock<IProductRepository>();
        products.Setup(x => x.GetBySkuAsync("DUP-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Product { SKU = "DUP-001" });

        var service = new ProductService(products.Object, Mock.Of<ICategoryRepository>(), Mock.Of<ISupplierRepository>(), Mock.Of<IUnitOfWork>());

        var result = await service.CreateAsync(new ProductCreateRequest("Duplicated", null, "DUP-001", Guid.NewGuid(), Guid.NewGuid(), 1, 0, 10));

        result.Success.Should().BeFalse();
        result.StatusCode.Should().Be(409);
    }
}

public sealed class InventoryMovementServiceTests
{
    [Fact]
    public async Task RegisterAsync_ExitWithInsufficientStock_ReturnsFailure()
    {
        var product = new Product { Id = Guid.NewGuid(), Name = "Tape", SKU = "TP-1", CurrentStock = 2, MinimumStock = 1, IsActive = true };
        var products = new Mock<IProductRepository>();
        products.Setup(x => x.GetByIdAsync(product.Id, It.IsAny<CancellationToken>())).ReturnsAsync(product);
        var service = new InventoryMovementService(products.Object, Mock.Of<IInventoryMovementRepository>(), Mock.Of<IUnitOfWork>());

        var result = await service.RegisterAsync(new InventoryMovementRequest(product.Id, MovementType.Exit, 3, "Shipment"), Guid.NewGuid());

        result.Success.Should().BeFalse();
        product.CurrentStock.Should().Be(2);
    }

    [Fact]
    public async Task RegisterAsync_EntryUpdatesStock()
    {
        var userId = Guid.NewGuid();
        var product = new Product { Id = Guid.NewGuid(), Name = "Paper", SKU = "PPR-1", CurrentStock = 4, MinimumStock = 1, IsActive = true };
        var products = new Mock<IProductRepository>();
        var movements = new Mock<IInventoryMovementRepository>();
        products.Setup(x => x.GetByIdAsync(product.Id, It.IsAny<CancellationToken>())).ReturnsAsync(product);
        movements.Setup(x => x.GetLatestAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InventoryMovement>());

        var service = new InventoryMovementService(products.Object, movements.Object, Mock.Of<IUnitOfWork>());

        var result = await service.RegisterAsync(new InventoryMovementRequest(product.Id, MovementType.Entry, 6, "Restock"), userId);

        result.Success.Should().BeTrue();
        product.CurrentStock.Should().Be(10);
        movements.Verify(x => x.AddAsync(It.Is<InventoryMovement>(m => m.PreviousStock == 4 && m.NewStock == 10), It.IsAny<CancellationToken>()), Times.Once);
    }
}
