import { api } from '@/api/axios';
import type { LoginResponse, User } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<{ data: LoginResponse }>('/auth/login', { email, password });
    return data.data!;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  async refresh(refreshToken: string) {
    const { data } = await api.post<{ data: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh',
      { refreshToken }
    );
    return data.data!;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string, confirmPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password, confirmPassword });
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<{ data: User }>('/auth/me');
    return data.data!;
  },
};
