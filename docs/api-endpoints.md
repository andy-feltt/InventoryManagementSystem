# API Endpoints

| Method | Route | Description | Auth | Role |
|---|---|---|---|---|
| POST | `/api/auth/register-admin` | Register the initial admin user if no users exist | No | Public |
| POST | `/api/auth/login` | Login and receive a JWT | No | Public |
| GET | `/api/auth/me` | Get authenticated user profile | Yes | Admin, Employee |
| GET | `/api/dashboard` | Get dashboard metrics | Yes | Admin, Employee |
| GET | `/api/products` | Get paginated products with search and category filter | Yes | Admin, Employee |
| GET | `/api/products/{id}` | Get product details | Yes | Admin, Employee |
| POST | `/api/products` | Create product | Yes | Admin |
| PUT | `/api/products/{id}` | Update product | Yes | Admin |
| DELETE | `/api/products/{id}` | Deactivate product | Yes | Admin |
| GET | `/api/categories` | List categories | Yes | Admin, Employee |
| POST | `/api/categories` | Create category | Yes | Admin |
| PUT | `/api/categories/{id}` | Update category | Yes | Admin |
| DELETE | `/api/categories/{id}` | Deactivate category | Yes | Admin |
| GET | `/api/suppliers` | List suppliers | Yes | Admin, Employee |
| POST | `/api/suppliers` | Create supplier | Yes | Admin |
| PUT | `/api/suppliers/{id}` | Update supplier | Yes | Admin |
| DELETE | `/api/suppliers/{id}` | Deactivate supplier | Yes | Admin |
| GET | `/api/inventory-movements/latest` | Get latest inventory movements | Yes | Admin, Employee |
| GET | `/api/inventory-movements/product/{productId}` | Get movement history by product | Yes | Admin, Employee |
| POST | `/api/inventory-movements` | Register entry, exit or adjustment | Yes | Admin, Employee |
