<template>
  <div class="creator-profile-page">

    <!-- Connected Platforms -->
    <section class="profile-section">
      <h2 class="section-title">Connected Platforms</h2>
      <p class="section-subtitle">Connect your social accounts to publish and schedule posts directly from the workspace.</p>
      <div class="platforms-list">
        <div
          v-for="platform in ALL_PLATFORMS"
          :key="platform"
          class="platform-row"
          :class="`platform-row--${platform}`"
        >
          <div class="platform-row__left">
            <div class="platform-row__icon-wrap" :class="`platform-row__icon-wrap--${platform}`">
              <PlatformIcon :platform="platform" />
            </div>
            <span class="platform-row__name">{{ PLATFORM_NAMES[platform] }}</span>
            <span v-if="isActivePlatform(platform)" class="platform-badge">Active</span>
          </div>
          <div class="platform-row__right">
            <ThreadsConnect v-if="platform === 'threads'" />
            <button v-else class="platform-card__connect-btn" type="button" disabled>Connect</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Creator Profile form -->
    <section class="profile-section">
      <h2 class="section-title">Creator Profile</h2>

      <div v-if="profileStore.isLoading" class="loading-state">Loading profile...</div>

      <div v-else-if="!profileStore.profile" class="empty-state">
        <p>No profile found. Complete onboarding first.</p>
        <NuxtLink to="/onboarding" class="btn btn--primary">Start Onboarding</NuxtLink>
      </div>

      <form v-else class="profile-form" @submit.prevent="handleSave">
        <div class="form-group">
          <label class="form-label">Platforms</label>
          <div class="chip-selector">
            <button
              v-for="platform in ALL_PLATFORMS"
              :key="platform"
              type="button"
              class="chip"
              :class="{ 'chip--active': form.platforms.includes(platform) }"
              @click="togglePlatform(platform)"
            >
              {{ PLATFORM_NAMES[platform] }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="niche">Niche</label>
          <input
            id="niche"
            v-model="form.niche"
            type="text"
            class="form-input"
            placeholder="e.g. Personal finance for millennials"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Topics</label>
          <div class="tag-input-wrapper">
            <div class="tags-list">
              <span v-for="(topic, index) in form.topics" :key="index" class="tag">
                {{ topic }}
                <button type="button" class="tag-remove" @click="removeTopic(index)">&times;</button>
              </span>
            </div>
            <input
              v-model="newTopic"
              type="text"
              class="form-input"
              placeholder="Add topic and press Enter"
              @keydown.enter.prevent="addTopic"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="audienceDescription">Audience Description</label>
          <textarea
            id="audienceDescription"
            v-model="form.audienceDescription"
            class="form-textarea"
            rows="3"
            placeholder="Describe your target audience"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="audiencePainPoints">Audience Pain Points</label>
          <textarea
            id="audiencePainPoints"
            v-model="form.audiencePainPoints"
            class="form-textarea"
            rows="2"
            placeholder="What problems does your audience face?"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="stage">Stage</label>
          <select id="stage" v-model="form.stage" class="form-select">
            <option value="starting">Starting</option>
            <option value="growing">Growing</option>
            <option value="established">Established</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Content Language</label>
          <div class="chip-selector">
            <button
              v-for="lang in LANGUAGES"
              :key="lang"
              type="button"
              class="chip"
              :class="{ 'chip--active': form.contentLanguage === lang }"
              @click="form.contentLanguage = lang"
            >
              {{ lang }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="toneOfVoice">Tone of Voice</label>
          <textarea
            id="toneOfVoice"
            v-model="form.toneOfVoice"
            class="form-textarea"
            rows="2"
            placeholder="Describe your writing tone"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Goals</label>
          <div class="tag-input-wrapper">
            <div class="tags-list">
              <span v-for="(goal, index) in form.goals" :key="index" class="tag">
                {{ goal }}
                <button type="button" class="tag-remove" @click="removeGoal(index)">&times;</button>
              </span>
            </div>
            <input
              v-model="newGoal"
              type="text"
              class="form-input"
              placeholder="Add goal and press Enter"
              @keydown.enter.prevent="addGoal"
            />
          </div>
        </div>

        <button type="submit" class="btn btn--primary" :disabled="profileStore.isSaving">
          {{ profileStore.isSaving ? 'Saving...' : 'Save Profile' }}
        </button>

        <p v-if="saveMessage" class="save-message" :class="{ 'save-message--error': saveError }">
          {{ saveMessage }}
        </p>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { useProfileStore, type ProfileUpdateData } from '~/stores/profile';
import PlatformIcon from '~/components/PlatformIcon.vue';
import ThreadsConnect from '~/components/threads/ThreadsConnect.vue';

definePageMeta({
  layout: 'default',
});

const profileStore = useProfileStore();

const ALL_PLATFORMS = ['threads', 'linkedin', 'tiktok', 'instagram'] as const;
type Platform = (typeof ALL_PLATFORMS)[number];

const PLATFORM_NAMES: Record<Platform, string> = {
  threads: 'Threads',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

function isActivePlatform(platform: Platform): boolean {
  return (form.platforms as string[]).includes(platform);
}

const LANGUAGES = ['Russian', 'English', 'Ukrainian', 'Spanish', 'German', 'French', 'Other'];

const form = reactive({
  platforms: [] as string[],
  niche: '',
  topics: [] as string[],
  audienceDescription: '',
  audiencePainPoints: '',
  stage: 'starting' as 'starting' | 'growing' | 'established',
  contentLanguage: '',
  toneOfVoice: '',
  goals: [] as string[],
});

const newTopic = ref('');
const newGoal = ref('');
const saveMessage = ref('');
const saveError = ref(false);

function populateForm() {
  const profile = profileStore.profile;
  if (!profile) return;

  form.platforms = profile.platforms.map((p) => p.toLowerCase());
  form.niche = profile.niche;
  form.topics = [...profile.topics];
  form.audienceDescription = profile.audienceDescription;
  form.audiencePainPoints = profile.audiencePainPoints || '';
  form.stage = profile.stage;
  form.contentLanguage = profile.contentLanguage || '';
  form.toneOfVoice = profile.toneOfVoice;
  form.goals = [...profile.goals];
}

watch(() => profileStore.profile, populateForm, { immediate: true });

function togglePlatform(platform: string) {
  const index = form.platforms.indexOf(platform);
  if (index >= 0) {
    form.platforms.splice(index, 1);
  } else {
    form.platforms.push(platform);
  }
}

function addTopic() {
  const trimmed = newTopic.value.trim();
  if (trimmed && !form.topics.includes(trimmed)) {
    form.topics.push(trimmed);
  }
  newTopic.value = '';
}

function removeTopic(index: number) {
  form.topics.splice(index, 1);
}

function addGoal() {
  const trimmed = newGoal.value.trim();
  if (trimmed && !form.goals.includes(trimmed)) {
    form.goals.push(trimmed);
  }
  newGoal.value = '';
}

function removeGoal(index: number) {
  form.goals.splice(index, 1);
}

async function handleSave() {
  saveMessage.value = '';
  saveError.value = false;

  const data: ProfileUpdateData = {
    platforms: form.platforms,
    niche: form.niche,
    topics: form.topics,
    audienceDescription: form.audienceDescription,
    audiencePainPoints: form.audiencePainPoints || null,
    stage: form.stage,
    contentLanguage: form.contentLanguage,
    toneOfVoice: form.toneOfVoice,
    goals: form.goals,
  };

  try {
    await profileStore.updateProfile(data);
    saveMessage.value = 'Profile saved successfully';
  } catch {
    saveError.value = true;
    saveMessage.value = 'Failed to save profile. Please try again.';
  }
}

onMounted(async () => {
  await profileStore.loadProfile();
  populateForm();
});
</script>

<style scoped>
.creator-profile-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.75rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.375rem;
}

.section-subtitle {
  font-size: 0.8125rem;
  color: #9ca3af;
  margin: 0 0 1.25rem;
}

.platforms-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.platform-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.platform-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.platform-row:first-child {
  padding-top: 0;
}

.platform-row__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.platform-row__icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.platform-row__icon-wrap--threads { background: #000; }
.platform-row__icon-wrap--linkedin { background: #0077b5; }
.platform-row__icon-wrap--tiktok { background: #000; }
.platform-row__icon-wrap--instagram {
  background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%);
}

.platform-row__icon-wrap :deep(.platform-icon) {
  width: 36px;
  height: 36px;
  border-radius: 0;
  background: transparent;
}

.platform-row__icon-wrap :deep(.platform-icon svg) {
  width: 18px;
  height: 18px;
}

.platform-row__name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
}

.platform-badge {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: #dcfce7;
  color: #16a34a;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
}

.platform-row__right {
  flex-shrink: 0;
}

.platform-card__connect-btn {
  padding: 0.375rem 1rem;
  border: none;
  border-radius: 8px;
  background: #000;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #fff;
  cursor: not-allowed;
  opacity: 0.4;
  transition: all 0.15s;
  white-space: nowrap;
}

/* Form */
.loading-state,
.empty-state {
  color: #6b7280;
  text-align: center;
  padding: 2rem 0;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea,
.form-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #fff;
  transition: border-color 0.15s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-textarea {
  resize: vertical;
}

.chip-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  background: #fff;
  font-size: 0.8125rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover {
  border-color: #6366f1;
}

.chip--active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

.tag-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: #374151;
}

.tag-remove {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}

.tag-remove:hover {
  color: #ef4444;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: #6366f1;
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: #4f46e5;
}

.save-message {
  font-size: 0.8125rem;
  color: #059669;
  margin: 0;
}

.save-message--error {
  color: #dc2626;
}
</style>
