import { apiClient } from './client';
import { notifyDataChanged } from '../state/dataEvents';
import type { PagedResult, Product } from '../types';

export type ProductPayload = Omit<Product, 'id' | 'categoryName' | 'supplierName' | 'isLowStock' | 'createdAt' | 'updatedAt' | 'isActive'> & { isActive?: boolean };

export const productService = {
  async list(search = '', categoryId = '', isActive: boolean | null = true) {
    const { data } = await apiClient.get<PagedResult<Product>>('/products', { params: { page: 1, pageSize: 50, search, categoryId: categoryId || undefined, isActive: isActive ?? undefined } });
    return data;
  },
  async create(payload: ProductPayload) {
    const { data } = await apiClient.post<Product>('/products', payload);
    notifyDataChanged();
    return data;
  },
  async update(id: string, payload: Omit<ProductPayload, 'sku' | 'currentStock'> & { isActive: boolean }) {
    const { data } = await apiClient.put<Product>(`/products/${id}`, payload);
    notifyDataChanged();
    return data;
  },
  async deactivate(id: string) {
    await apiClient.delete(`/products/${id}`);
    notifyDataChanged();
  },
  async activate(id: string, password: string) {
    await apiClient.patch(`/products/${id}/activate`, { password });
    notifyDataChanged();
  },
};
