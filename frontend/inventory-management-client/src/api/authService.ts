import { apiClient } from './client';
import type { AuthResponse, UserResponse } from '../types';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },
  async me() {
    const { data } = await apiClient.get<UserResponse>('/auth/me');
    return data;
  },
};
