import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApiClient } from '~/services/api';

export type AdminPlanId = 'free' | 'creator' | 'pro';
export type AdminSocialPlatform = 'threads' | 'instagram' | 'linkedin' | 'tiktok';

export interface AdminUserSocialAccount {
  platform: AdminSocialPlatform;
  handle: string;
  profileUrl: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  handle: string | null;
  isAdmin: boolean;
  createdAt: string;
  plan: AdminPlanId;
  planName: string;
  monthlyCredits: number;
  balance: number;
  creditsUsed: number;
  creditsUsedPercent: number;
  socialAccounts: AdminUserSocialAccount[];
}

export const useAdminStore = defineStore('admin', () => {
  const apiClient = useApiClient();

  const users = ref<AdminUser[]>([]);
  const isLoading = ref(false);
  const loadError = ref('');

  async function loadUsers(): Promise<void> {
    isLoading.value = true;
    loadError.value = '';
    try {
      const response = await apiClient.get<{ users: AdminUser[] }>('/api/admin/users');
      users.value = response.users;
    } catch (error: unknown) {
      const apiError = error as { data?: { error?: string } };
      loadError.value = apiError?.data?.error ?? 'Failed to load users';
      users.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function grantCredits(userId: string, amount: number): Promise<number> {
    const response = await apiClient.post<{ balance: number }>(
      `/api/admin/users/${encodeURIComponent(userId)}/credits`,
      { amount },
    );
    const target = users.value.find((user) => user.id === userId);
    if (target) {
      target.balance = response.balance;
      target.creditsUsed = Math.max(0, target.monthlyCredits - target.balance);
      target.creditsUsedPercent = target.monthlyCredits > 0
        ? Math.min(100, Math.round((target.creditsUsed / target.monthlyCredits) * 100))
        : 0;
    }
    return response.balance;
  }

  return {
    users,
    isLoading,
    loadError,
    loadUsers,
    grantCredits,
  };
});
