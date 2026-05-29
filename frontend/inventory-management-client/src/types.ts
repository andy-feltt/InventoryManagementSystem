export type UserRole = 'Admin' | 'Employee';
export type MovementType = 'Entry' | 'Exit' | 'Adjustment';

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserResponse;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
  currentStock: number;
  minimumStock: number;
  unitPrice: number;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
}

export interface Dashboard {
  totalActiveProducts: number;
  lowStockProducts: number;
  totalActiveSuppliers: number;
  estimatedInventoryValue: number;
  latestMovements: InventoryMovement[];
}
