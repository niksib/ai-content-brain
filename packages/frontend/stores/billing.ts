import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApiClient } from '~/services/api';

export type PlanId = 'free' | 'creator' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number;
  monthlyCredits: number;
  purchasable: boolean;
}

export interface SubscriptionState {
  plan: PlanId;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  monthlyCredits: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  balance: number;
}

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
  const plans = ref<Plan[]>([]);
  const subscription = ref<SubscriptionState | null>(null);
  const transactions = ref<CreditTransaction[]>([]);
  const transactionsTotal = ref(0);
  const isLoading = ref(false);
  const isPricingModalOpen = ref(false);

  function openPricingModal(): void {
    isPricingModalOpen.value = true;
    if (plans.value.length === 0) {
      void loadPlans();
    }
    void loadSubscription();
  }

  function closePricingModal(): void {
    isPricingModalOpen.value = false;
  }

  async function loadBalance(): Promise<void> {
    try {
      const response = await apiClient.get<{ balance: number }>('/api/billing/balance');
      balance.value = response.balance;
    } catch {
      balance.value = 0;
    }
  }

  async function loadPlans(): Promise<void> {
    try {
      const response = await apiClient.get<{ plans: Plan[] }>('/api/billing/plans');
      plans.value = response.plans;
    } catch {
      plans.value = [];
    }
  }

  async function loadSubscription(): Promise<void> {
    try {
      const response = await apiClient.get<SubscriptionState>('/api/billing/subscription');
      subscription.value = response;
      balance.value = response.balance;
    } catch {
      subscription.value = null;
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

  async function startCheckout(planId: PlanId): Promise<void> {
    const response = await apiClient.post<{ url: string }>('/api/billing/checkout', { planId });
    if (response.url) {
      window.location.assign(response.url);
    }
  }

  async function openPortal(): Promise<void> {
    const response = await apiClient.post<{ url: string }>('/api/billing/portal', {});
    if (response.url) {
      window.location.assign(response.url);
    }
  }

  return {
    balance,
    plans,
    subscription,
    transactions,
    transactionsTotal,
    isLoading,
    isPricingModalOpen,
    loadBalance,
    loadPlans,
    loadSubscription,
    loadTransactions,
    startCheckout,
    openPortal,
    openPricingModal,
    closePricingModal,
  };
});
