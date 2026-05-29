import { apiClient } from './client';
import type { Dashboard } from '../types';

export const dashboardService = {
  async get() {
    const { data } = await apiClient.get<Dashboard>('/dashboard');
    return data;
  },
};
