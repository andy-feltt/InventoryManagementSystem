# Database Diagram

```mermaid
erDiagram
    USERS ||--o{ INVENTORY_MOVEMENTS : creates
    CATEGORIES ||--o{ PRODUCTS : groups
    SUPPLIERS ||--o{ PRODUCTS : provides
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : tracks

    USERS {
        uniqueidentifier Id PK
        nvarchar FullName
        nvarchar Email UK
        nvarchar PasswordHash
        nvarchar Role
        datetime CreatedAt
        bit IsActive
    }

    CATEGORIES {
        uniqueidentifier Id PK
        nvarchar Name
        nvarchar Description
        bit IsActive
    }

    SUPPLIERS {
        uniqueidentifier Id PK
        nvarchar Name
        nvarchar ContactName
        nvarchar Email
        nvarchar Phone
        nvarchar Address
        bit IsActive
    }

    PRODUCTS {
        uniqueidentifier Id PK
        nvarchar Name
        nvarchar Description
        nvarchar SKU UK
        uniqueidentifier CategoryId FK
        uniqueidentifier SupplierId FK
        int CurrentStock
        int MinimumStock
        decimal UnitPrice
        bit IsActive
        datetime CreatedAt
        datetime UpdatedAt
    }

    INVENTORY_MOVEMENTS {
        uniqueidentifier Id PK
        uniqueidentifier ProductId FK
        nvarchar Type
        int Quantity
        int PreviousStock
        int NewStock
        nvarchar Reason
        uniqueidentifier CreatedByUserId FK
        datetime CreatedAt
    }
```

## Entities

- **User** stores authenticated system users. Roles are `Admin` and `Employee`.
- **Category** groups products and supports logical deactivation.
- **Supplier** stores vendor contact data and supports logical deactivation.
- **Product** stores SKU, pricing, stock and relationships to category and supplier.
- **InventoryMovement** stores immutable stock history with previous and new stock.

## Relationships

- One category has many products.
- One supplier has many products.
- One product has many inventory movements.
- One user creates many inventory movements.
