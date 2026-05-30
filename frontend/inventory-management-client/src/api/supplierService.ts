import { apiClient } from './client';
import { notifyDataChanged } from '../state/dataEvents';
import type { Supplier } from '../types';

export const supplierService = {
  async list() {
    const { data } = await apiClient.get<Supplier[]>('/suppliers');
    return data;
  },
  async create(payload: Omit<Supplier, 'id' | 'isActive'>) {
    const { data } = await apiClient.post<Supplier>('/suppliers', payload);
    notifyDataChanged();
    return data;
  },
  async update(id: string, payload: Omit<Supplier, 'id' | 'isActive'>) {
    const { data } = await apiClient.put<Supplier>(`/suppliers/${id}`, payload);
    notifyDataChanged();
    return data;
  },
  async deactivate(id: string) {
    await apiClient.delete(`/suppliers/${id}`);
    notifyDataChanged();
  },
  async activate(id: string, password: string) {
    await apiClient.patch(`/suppliers/${id}/activate`, { password });
    notifyDataChanged();
  },
};
