import { apiClient } from './client';
import { notifyDataChanged } from '../state/dataEvents';
import type { InventoryMovement, MovementType } from '../types';

export const inventoryMovementService = {
  async latest(take = 20) {
    const { data } = await apiClient.get<InventoryMovement[]>('/inventory-movements/latest', { params: { take } });
    return data;
  },
  async byProduct(productId: string) {
    const { data } = await apiClient.get<InventoryMovement[]>(`/inventory-movements/product/${productId}`);
    return data;
  },
  async register(payload: { productId: string; type: MovementType; quantity: number; reason: string }) {
    const { data } = await apiClient.post<InventoryMovement>('/inventory-movements', payload);
    notifyDataChanged();
    return data;
  },
};
