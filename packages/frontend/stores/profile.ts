import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useApiClient } from '~/services/api';

export interface MemoryBlock {
  key: string;
  title: string;
  description: string;
  content: string;
}

export interface CanonicalKey {
  key: string;
  title: string;
  description: string;
}

interface ProfileResponse {
  email: string;
  name: string;
  isAdmin: boolean;
}

interface MemoryResponse {
  blocks: MemoryBlock[];
  canonicalKeys: CanonicalKey[];
}

export const useProfileStore = defineStore('profile', () => {
  const apiClient = useApiClient();

  const userEmail = ref('');
  const userName = ref('');
  const isAdmin = ref(false);
  const memoryBlocks = ref<MemoryBlock[]>([]);
  const canonicalKeys = ref<CanonicalKey[]>([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isLoaded = ref(false);

  const isOnboarded = computed(() => memoryBlocks.value.length > 0);

  async function loadProfile(): Promise<void> {
    isLoading.value = true;
    try {
      const [profile, memory] = await Promise.all([
        apiClient.get<ProfileResponse>('/api/profile'),
        apiClient.get<MemoryResponse>('/api/memory').catch(() => ({ blocks: [], canonicalKeys: [] })),
      ]);
      userEmail.value = profile.email || '';
      userName.value = profile.name || '';
      isAdmin.value = profile.isAdmin ?? false;
      memoryBlocks.value = memory.blocks;
      canonicalKeys.value = memory.canonicalKeys;
      isLoaded.value = true;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadMemory(): Promise<void> {
    const memory = await apiClient.get<MemoryResponse>('/api/memory');
    memoryBlocks.value = memory.blocks;
    canonicalKeys.value = memory.canonicalKeys;
  }

  async function upsertBlock(block: MemoryBlock): Promise<void> {
    isSaving.value = true;
    try {
      await apiClient.patch(`/api/memory/${encodeURIComponent(block.key)}`, {
        title: block.title,
        description: block.description,
        content: block.content,
      });
      await loadMemory();
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteBlock(key: string): Promise<void> {
    await apiClient.del(`/api/memory/${encodeURIComponent(key)}`);
    await loadMemory();
  }

  return {
    userEmail,
    userName,
    isAdmin,
    memoryBlocks,
    canonicalKeys,
    isLoading,
    isLoaded,
    isSaving,
    isOnboarded,
    loadProfile,
    loadMemory,
    upsertBlock,
    deleteBlock,
  };
});
