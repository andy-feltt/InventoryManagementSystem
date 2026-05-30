import { apiClient } from './client';
import { notifyDataChanged } from '../state/dataEvents';
import type { Category } from '../types';

export const categoryService = {
  async list() {
    const { data } = await apiClient.get<Category[]>('/categories');
    return data;
  },
  async create(payload: Pick<Category, 'name' | 'description'>) {
    const { data } = await apiClient.post<Category>('/categories', payload);
    notifyDataChanged();
    return data;
  },
  async update(id: string, payload: Pick<Category, 'name' | 'description'>) {
    const { data } = await apiClient.put<Category>(`/categories/${id}`, payload);
    notifyDataChanged();
    return data;
  },
  async deactivate(id: string) {
    await apiClient.delete(`/categories/${id}`);
    notifyDataChanged();
  },
};
