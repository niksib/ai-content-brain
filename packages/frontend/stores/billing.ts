import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApiClient } from '~/services/api';

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  reference: string | null;
  createdAt: string;
}

interface TransactionsResponse {
  items: CreditTransaction[];
  total: number;
  page: number;
  limit: number;
}

export const useBillingStore = defineStore('billing', () => {
  const apiClient = useApiClient();

  const balance = ref(0);
  const transactions = ref<CreditTransaction[]>([]);
  const transactionsTotal = ref(0);
  const isLoading = ref(false);

  async function loadBalance(): Promise<void> {
    try {
      const response = await apiClient.get<{ balance: number }>('/api/billing/balance');
      balance.value = response.balance;
    } catch {
      balance.value = 0;
    }
  }

  async function loadTransactions(page = 1, limit = 20): Promise<void> {
    isLoading.value = true;
    try {
      const response = await apiClient.get<TransactionsResponse>(
        `/api/billing/transactions?page=${page}&limit=${limit}`
      );
      transactions.value = response.items;
      transactionsTotal.value = response.total;
    } catch {
      transactions.value = [];
      transactionsTotal.value = 0;
    } finally {
      isLoading.value = false;
    }
  }

  async function createCheckout(priceId: string, mode: 'subscription' | 'payment'): Promise<void> {
    const response = await apiClient.post<{ url: string }>('/api/billing/checkout', {
      priceId,
      mode,
    });
    if (response.url) {
      window.location.href = response.url;
    }
  }

  return {
    balance,
    transactions,
    transactionsTotal,
    isLoading,
    loadBalance,
    loadTransactions,
    createCheckout,
  };
});
