import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApiClient } from '~/services/api';

export interface CreatorProfile {
  id: string;
  userId: string;
  platforms: string[];
  niche: string;
  topics: string[];
  audienceDescription: string;
  audiencePainPoints: string | null;
  stage: 'starting' | 'growing' | 'established';
  toneOfVoice: string;
  toneExamples: string[];
  goals: string[];
  rawNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type ProfileUpdateData = Partial<
  Pick<
    CreatorProfile,
    | 'platforms'
    | 'niche'
    | 'topics'
    | 'audienceDescription'
    | 'audiencePainPoints'
    | 'stage'
    | 'toneOfVoice'
    | 'toneExamples'
    | 'goals'
  >
>;

export const useProfileStore = defineStore('profile', () => {
  const apiClient = useApiClient();

  const profile = ref<CreatorProfile | null>(null);
  const userEmail = ref('');
  const isAdmin = ref(false);
  const isLoading = ref(false);
  const isSaving = ref(false);

  async function loadProfile(): Promise<void> {
    isLoading.value = true;
    try {
      const response = await apiClient.get<{ profile: CreatorProfile; email: string; isAdmin: boolean }>('/api/profile');
      profile.value = response.profile;
      userEmail.value = response.email || '';
      isAdmin.value = response.isAdmin ?? false;
    } catch {
      profile.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateProfile(data: ProfileUpdateData): Promise<void> {
    isSaving.value = true;
    try {
      const response = await apiClient.patch<{ profile: CreatorProfile }>('/api/profile', data);
      profile.value = response.profile;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    profile,
    userEmail,
    isAdmin,
    isLoading,
    isSaving,
    loadProfile,
    updateProfile,
  };
});
