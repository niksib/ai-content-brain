<template>
  <div class="threads-connect">
    <template v-if="account">
      <div class="threads-connect__account">
        <img
          v-if="account.profilePictureUrl"
          :src="account.profilePictureUrl"
          class="threads-connect__avatar"
          alt="Threads avatar"
        />
        <div v-else class="threads-connect__avatar-placeholder">
          <User :size="16" style="color:#fff;" />
        </div>
        <span class="threads-connect__username">@{{ account.username }}</span>
      </div>
      <button class="threads-connect__btn" @click="disconnect">Disconnect</button>
    </template>

    <template v-else>
      <a class="threads-connect__btn" :href="authUrl">Connect</a>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { User } from 'lucide-vue-next';

interface ThreadsAccount {
  id: string;
  threadsUserId: string;
  username: string;
  profilePictureUrl: string | null;
  tokenExpiresAt: string;
  scopes: string;
  isPrivateProfile: boolean;
  postsCount: number;
}

const account = ref<ThreadsAccount | null>(null);
const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;
const authUrl = `${apiBaseUrl}/api/threads/auth`;

onMounted(async () => {
  await loadAccount();
});

async function loadAccount(): Promise<void> {
  try {
    const response = await $fetch<{ account: ThreadsAccount | null }>(
      `${apiBaseUrl}/api/threads/account`,
      { credentials: 'include' }
    );
    account.value = response.account;
  } catch {
    account.value = null;
  }
}

async function disconnect(): Promise<void> {
  await $fetch(`${apiBaseUrl}/api/threads/account`, {
    method: 'DELETE',
    credentials: 'include',
  });
  account.value = null;
}
</script>

<style scoped>
.threads-connect {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.threads-connect__account {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.threads-connect__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.threads-connect__avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.threads-connect__username {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.threads-connect__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 1rem;
  background: #000;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.threads-connect__btn:hover {
  background: #1a1a1a;
}
</style>
