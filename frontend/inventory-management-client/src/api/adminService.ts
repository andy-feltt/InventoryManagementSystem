import { apiClient } from './client';
import { notifyDataChanged } from '../state/dataEvents';

async function deleteWithPassword(url: string, password: string) {
  await apiClient.delete(url, { data: { password } });
  notifyDataChanged();
}

export const adminService = {
  deleteProduct(id: string, password: string) {
    return deleteWithPassword(`/admin/products/${id}`, password);
  },
  deleteCategory(id: string, password: string) {
    return deleteWithPassword(`/admin/categories/${id}`, password);
  },
  deleteSupplier(id: string, password: string) {
    return deleteWithPassword(`/admin/suppliers/${id}`, password);
  },
  deleteInventoryMovement(id: string, password: string) {
    return deleteWithPassword(`/admin/inventory-movements/${id}`, password);
  },
};
