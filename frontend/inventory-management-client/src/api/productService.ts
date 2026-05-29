import { apiClient } from './client';
import type { PagedResult, Product } from '../types';

export type ProductPayload = Omit<Product, 'id' | 'categoryName' | 'supplierName' | 'isLowStock' | 'createdAt' | 'updatedAt' | 'isActive'> & { isActive?: boolean };

export const productService = {
  async list(search = '', categoryId = '') {
    const { data } = await apiClient.get<PagedResult<Product>>('/products', { params: { page: 1, pageSize: 50, search, categoryId: categoryId || undefined } });
    return data;
  },
  async create(payload: ProductPayload) {
    const { data } = await apiClient.post<Product>('/products', payload);
    return data;
  },
  async update(id: string, payload: Omit<ProductPayload, 'sku' | 'currentStock'> & { isActive: boolean }) {
    const { data } = await apiClient.put<Product>(`/products/${id}`, payload);
    return data;
  },
  async deactivate(id: string) {
    await apiClient.delete(`/products/${id}`);
  },
};
