# Database Diagram

```mermaid
erDiagram
    USERS ||--o{ INVENTORY_MOVEMENTS : creates
    CATEGORIES ||--o{ PRODUCTS : groups
    SUPPLIERS ||--o{ PRODUCTS : provides
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : tracks

    USERS {
        uuid Id PK
        varchar FullName
        varchar Email UK
        varchar PasswordHash
        varchar Role
        timestamp CreatedAt
        boolean IsActive
    }

    CATEGORIES {
        uuid Id PK
        varchar Name
        varchar Description
        boolean IsActive
    }

    SUPPLIERS {
        uuid Id PK
        varchar Name
        varchar ContactName
        varchar Email
        varchar Phone
        varchar Address
        boolean IsActive
    }

    PRODUCTS {
        uuid Id PK
        varchar Name
        varchar Description
        varchar SKU UK
        uuid CategoryId FK
        uuid SupplierId FK
        int CurrentStock
        int MinimumStock
        numeric UnitPrice
        boolean IsActive
        timestamp CreatedAt
        timestamp UpdatedAt
    }

    INVENTORY_MOVEMENTS {
        uuid Id PK
        uuid ProductId FK
        varchar Type
        int Quantity
        int PreviousStock
        int NewStock
        varchar Reason
        uuid CreatedByUserId FK
        timestamp CreatedAt
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
