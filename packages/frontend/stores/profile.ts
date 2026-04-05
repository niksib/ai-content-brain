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
  const isLoading = ref(false);
  const isSaving = ref(false);

  async function loadProfile(): Promise<void> {
    isLoading.value = true;
    try {
      const response = await apiClient.get<{ profile: CreatorProfile }>('/api/profile');
      profile.value = response.profile;
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
    isLoading,
    isSaving,
    loadProfile,
    updateProfile,
  };
});
