<template>
  <div class="threads-connect">
    <div v-if="account" class="threads-connect__connected">
      <div class="threads-connect__status">
        <span class="threads-connect__indicator threads-connect__indicator--ok"></span>
        <span class="threads-connect__label">Threads connected</span>
      </div>
      <div class="threads-connect__meta">
        <span class="threads-connect__expires">
          Token expires {{ formattedExpiry }}
        </span>
        <span v-if="account.isPrivateProfile" class="threads-connect__private-badge">
          Private profile — manual reconnect required before expiry
        </span>
      </div>
      <button class="threads-connect__disconnect" @click="disconnect">
        Disconnect
      </button>
    </div>

    <div v-else class="threads-connect__disconnected">
      <a class="threads-connect__button" :href="authUrl">
        Connect
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface ThreadsAccount {
  id: string;
  threadsUserId: string;
  tokenExpiresAt: string;
  scopes: string;
  isPrivateProfile: boolean;
  postsCount: number;
}

const account = ref<ThreadsAccount | null>(null);
const authUrl = '/api/threads/auth';

const formattedExpiry = computed(() => {
  if (!account.value) return '';
  const date = new Date(account.value.tokenExpiresAt);
  return date.toLocaleDateString();
});

onMounted(async () => {
  await loadAccount();
});

async function loadAccount(): Promise<void> {
  try {
    const config = useRuntimeConfig();
    const response = await $fetch<{ account: ThreadsAccount | null }>(
      `${config.public.apiBaseUrl}/api/threads/account`
    );
    account.value = response.account;
  } catch {
    account.value = null;
  }
}

async function disconnect(): Promise<void> {
  const config = useRuntimeConfig();
  await $fetch(`${config.public.apiBaseUrl}/api/threads/account`, { method: 'DELETE' });
  account.value = null;
}
</script>

<style scoped>
.threads-connect {
  width: 100%;
}

.threads-connect__connected {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.threads-connect__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.threads-connect__indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.threads-connect__indicator--ok {
  background: #10b981;
}

.threads-connect__label {
  font-weight: 500;
  font-size: 0.875rem;
}

.threads-connect__meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.threads-connect__expires {
  font-size: 0.75rem;
  color: #6b7280;
}

.threads-connect__private-badge {
  font-size: 0.75rem;
  color: #f59e0b;
}

.threads-connect__disconnect {
  width: 100%;
  padding: 0.4rem 0;
  border: none;
  border-radius: 8px;
  background: #000;
  font-size: 0.8125rem;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
}

.threads-connect__disconnect:hover {
  background: #1a1a1a;
}

.threads-connect__disconnected {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.threads-connect__description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.threads-connect__button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.4rem 0;
  background: #000;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s;
}

.threads-connect__button:hover {
  background: #1a1a1a;
}
</style>
