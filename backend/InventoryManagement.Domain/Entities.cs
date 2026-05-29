namespace InventoryManagement.Domain;

public enum UserRole
{
    Admin = 1,
    Employee = 2
}

public enum MovementType
{
    Entry = 1,
    Exit = 2,
    Adjustment = 3
}

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Employee;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}

public sealed class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<Product> Products { get; set; } = [];
}

public sealed class Supplier
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<Product> Products { get; set; } = [];
}

public sealed class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string SKU { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }
    public Guid SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    public int CurrentStock { get; set; }
    public int MinimumStock { get; set; }
    public decimal UnitPrice { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<InventoryMovement> Movements { get; set; } = [];

    public bool IsLowStock => IsActive && CurrentStock <= MinimumStock;
}

public sealed class InventoryMovement
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }
    public MovementType Type { get; set; }
    public int Quantity { get; set; }
    public int PreviousStock { get; set; }
    public int NewStock { get; set; }
    public string Reason { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public static InventoryMovement Create(Product product, MovementType type, int quantity, string reason, Guid userId)
    {
        if (quantity < 0 || (type is MovementType.Entry or MovementType.Exit && quantity == 0))
        {
            throw new InvalidOperationException("Quantity must be greater than zero for entries and exits, and zero or greater for adjustments.");
        }

        var previousStock = product.CurrentStock;
        var newStock = type switch
        {
            MovementType.Entry => previousStock + quantity,
            MovementType.Exit => previousStock - quantity,
            MovementType.Adjustment => quantity,
            _ => previousStock
        };

        // Critical inventory rule: exits may never leave the product with negative stock.
        if (newStock < 0)
        {
            throw new InvalidOperationException("Insufficient stock for this inventory exit.");
        }

        product.CurrentStock = newStock;
        product.UpdatedAt = DateTime.UtcNow;

        return new InventoryMovement
        {
            ProductId = product.Id,
            Type = type,
            Quantity = quantity,
            PreviousStock = previousStock,
            NewStock = newStock,
            Reason = reason,
            CreatedByUserId = userId
        };
    }
}
