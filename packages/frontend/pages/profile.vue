<template>
  <div class="profile-page">

    <!-- ── Row 1: Connected Platforms + Subscription ── -->
    <div class="profile-row profile-row--top">

      <!-- Connected Platforms -->
      <section class="profile-section profile-section--platforms">
        <h2 class="section-title">Connected Platforms</h2>
        <p class="section-subtitle">Platforms you create content for and social accounts you've connected.</p>
        <div class="platforms-grid">
          <div
            v-for="platform in ALL_PLATFORMS"
            :key="platform"
            class="platform-card"
            :class="[`platform-card--${platform}`, { 'platform-card--active': isActivePlatform(platform) }]"
          >
            <div class="platform-card__top">
              <div class="platform-card__icon-wrap" :class="`platform-card__icon-wrap--${platform}`">
                <PlatformIcon :platform="platform" />
              </div>
              <span v-if="isActivePlatform(platform)" class="platform-badge">Active</span>
            </div>
            <p class="platform-card__name">{{ PLATFORM_NAMES[platform] }}</p>
            <div class="platform-card__social">
              <span class="platform-card__not-connected">Not connected</span>
            </div>
            <button class="platform-card__connect-btn" type="button" disabled>
              Connect
            </button>
          </div>
        </div>
      </section>

      <!-- Subscription -->
      <section class="profile-section profile-section--subscription">
        <h2 class="section-title">Subscription</h2>
        <div class="info-row">
          <span class="info-label">Plan</span>
          <span class="info-value">Free (Beta)</span>
        </div>
        <div class="credits-progress-wrap">
          <div class="credits-progress__header">
            <span class="info-label">Credits Used</span>
            <span class="credits-progress__stat">{{ creditsUsedPercent }}%</span>
          </div>
          <div class="credits-progress__bar">
            <div
              class="credits-progress__fill"
              :style="{ width: creditsUsedPercent + '%' }"
            ></div>
          </div>
        </div>
        <div class="placeholder-actions">
          <button type="button" class="btn btn--primary" @click="handleBuyCredits">
            Buy Credits
          </button>
        </div>
        <p v-if="billingStatus === 'success'" class="save-message">Payment successful! Credits have been added.</p>
        <p v-if="billingStatus === 'cancel'" class="save-message save-message--error">Payment was cancelled.</p>
      </section>

    </div>

    <!-- ── Row 2: Creator Profile ── -->
    <section class="profile-section">
      <h2 class="section-title">Creator Profile</h2>

      <div v-if="profileStore.isLoading" class="loading-state">Loading profile...</div>

      <div v-else-if="!profileStore.profile" class="empty-state">
        <p>No profile found. Complete onboarding first.</p>
        <NuxtLink to="/onboarding" class="btn btn--primary">Start Onboarding</NuxtLink>
      </div>

      <form v-else class="profile-form" @submit.prevent="handleSave">
        <!-- Platforms -->
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

        <!-- Niche -->
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

        <!-- Topics -->
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

        <!-- Audience Description -->
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

        <!-- Audience Pain Points -->
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

        <!-- Stage -->
        <div class="form-group">
          <label class="form-label" for="stage">Stage</label>
          <select id="stage" v-model="form.stage" class="form-select">
            <option value="starting">Starting</option>
            <option value="growing">Growing</option>
            <option value="established">Established</option>
          </select>
        </div>

        <!-- Content Language -->
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

        <!-- Tone of Voice -->
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

        <!-- Goals -->
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

    <!-- ── Row 3: Account ── -->
    <section class="profile-section">
      <h2 class="section-title">Account</h2>

      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">{{ profileStore.userEmail || '---' }}</span>
      </div>

      <!-- Change Password -->
      <div class="account-action">
        <div class="account-action__header">
          <div>
            <p class="account-action__title">Password</p>
            <p class="account-action__desc">Update your account password</p>
          </div>
          <button
            type="button"
            class="btn btn--secondary"
            @click="showPasswordForm = !showPasswordForm"
          >
            {{ showPasswordForm ? 'Cancel' : 'Change Password' }}
          </button>
        </div>

        <form v-if="showPasswordForm" class="account-subform" @submit.prevent="handleChangePassword">
          <div class="form-group">
            <label class="form-label" for="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              v-model="passwordForm.current"
              type="password"
              class="form-input"
              autocomplete="current-password"
              placeholder="Enter current password"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="newPassword">New Password</label>
            <input
              id="newPassword"
              v-model="passwordForm.next"
              type="password"
              class="form-input"
              autocomplete="new-password"
              placeholder="At least 8 characters"
              minlength="8"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              v-model="passwordForm.confirm"
              type="password"
              class="form-input"
              autocomplete="new-password"
              placeholder="Repeat new password"
              required
            />
          </div>
          <p v-if="passwordError" class="save-message save-message--error">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="save-message">{{ passwordSuccess }}</p>
          <button
            type="submit"
            class="btn btn--primary"
            :disabled="isChangingPassword"
          >
            {{ isChangingPassword ? 'Saving...' : 'Save New Password' }}
          </button>
        </form>
      </div>

      <!-- Delete Account -->
      <div class="account-action account-action--danger">
        <div class="account-action__header">
          <div>
            <p class="account-action__title account-action__title--danger">Delete Account</p>
            <p class="account-action__desc">Permanently delete your account and all data</p>
          </div>
          <button
            type="button"
            class="btn btn--danger"
            :disabled="isDeletingAccount"
            @click="handleDeleteAccount"
          >
            {{ isDeletingAccount ? 'Deleting...' : 'Delete Account' }}
          </button>
        </div>
        <p v-if="deleteError" class="save-message save-message--error">{{ deleteError }}</p>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue';
import { useProfileStore, type ProfileUpdateData } from '~/stores/profile';
import { useBillingStore } from '~/stores/billing';
import PlatformIcon from '~/components/PlatformIcon.vue';

const config = useRuntimeConfig();
const router = useRouter();

definePageMeta({
  layout: 'default',
});

const profileStore = useProfileStore();
const billingStore = useBillingStore();

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

const PLAN_MAX_CREDITS = 500;
const creditsUsedPercent = computed(() => {
  const used = PLAN_MAX_CREDITS - billingStore.balance;
  return Math.max(0, Math.min(100, Math.round((used / PLAN_MAX_CREDITS) * 100)));
});

const route = useRoute();
const billingStatus = computed(() => route.query.billing as string | undefined);

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

// ── Change Password ──
const showPasswordForm = ref(false);
const isChangingPassword = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');
const passwordForm = reactive({ current: '', next: '', confirm: '' });

// ── Delete Account ──
const isDeletingAccount = ref(false);
const deleteError = ref('');

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

function handleBuyCredits() {
  billingStore.createCheckout('price_credits_500', 'payment');
}

async function handleChangePassword() {
  passwordError.value = '';
  passwordSuccess.value = '';

  if (passwordForm.next !== passwordForm.confirm) {
    passwordError.value = 'New passwords do not match.';
    return;
  }
  if (passwordForm.next.length < 8) {
    passwordError.value = 'New password must be at least 8 characters.';
    return;
  }

  isChangingPassword.value = true;
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/auth/change-password`, {
      method: 'POST',
      credentials: 'include',
      body: {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      },
    });
    passwordSuccess.value = 'Password updated successfully.';
    passwordForm.current = '';
    passwordForm.next = '';
    passwordForm.confirm = '';
    setTimeout(() => {
      showPasswordForm.value = false;
      passwordSuccess.value = '';
    }, 2000);
  } catch (error: unknown) {
    const apiError = error as { data?: { message?: string } };
    passwordError.value = apiError?.data?.message ?? 'Failed to change password. Check your current password and try again.';
  } finally {
    isChangingPassword.value = false;
  }
}

async function handleDeleteAccount() {
  const confirmed = confirm(
    'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.'
  );
  if (!confirmed) return;

  deleteError.value = '';
  isDeletingAccount.value = true;
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/auth/delete-user`, {
      method: 'POST',
      credentials: 'include',
    });
    const isAuthenticated = useState<boolean | null>('auth:authenticated');
    isAuthenticated.value = false;
    router.replace('/');
  } catch (error: unknown) {
    const apiError = error as { data?: { message?: string } };
    deleteError.value = apiError?.data?.message ?? 'Failed to delete account. Please try again.';
  } finally {
    isDeletingAccount.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    profileStore.loadProfile(),
    billingStore.loadBalance(),
  ]);
  populateForm();
});
</script>

<style scoped>
.profile-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Row 1: Platforms + Subscription ── */
.profile-row--top {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 900px) {
  .profile-row--top {
    grid-template-columns: 1fr;
  }
}

/* ── Section base ── */
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

/* ── Connected Platforms ── */
.platforms-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.875rem;
}

@media (max-width: 700px) {
  .platforms-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.platform-card {
  border: 1.5px solid #e5e7eb;
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.platform-card--active {
  border-color: #c7d2fe;
  background: #fafbff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.06);
}

.platform-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.platform-card__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.platform-card__icon-wrap--threads { background: #000; }
.platform-card__icon-wrap--linkedin { background: #0077b5; }
.platform-card__icon-wrap--tiktok { background: #000; }
.platform-card__icon-wrap--instagram {
  background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%);
}

.platform-card__icon-wrap :deep(.platform-icon) {
  width: 40px;
  height: 40px;
  border-radius: 0;
  background: transparent;
}

.platform-card__icon-wrap :deep(.platform-icon svg) {
  width: 20px;
  height: 20px;
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

.platform-card__name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.platform-card__social {
  flex: 1;
}

.platform-card__not-connected {
  font-size: 0.75rem;
  color: #9ca3af;
  margin: 0;
}

.platform-card__connect-btn {
  width: 100%;
  padding: 0.4rem 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  cursor: not-allowed;
  opacity: 0.6;
  transition: all 0.15s;
}

/* ── Subscription ── */
.profile-section--subscription {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
}

.info-row + .info-row {
  border-top: 1px solid #f3f4f6;
}

.info-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
}

.credits-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.credits-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.credits-progress__stat {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #6366f1;
}

.credits-progress__bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.credits-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  border-radius: 9999px;
  transition: width 0.4s ease;
}

/* ── Creator Profile form ── */
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

/* ── Buttons ── */
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

.btn--secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn--danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.placeholder-actions {
  display: flex;
  gap: 0.75rem;
}

.save-message {
  font-size: 0.8125rem;
  color: #059669;
  margin: 0;
}

.save-message--error {
  color: #dc2626;
}

/* ── Account actions ── */
.account-action {
  border-top: 1px solid #f3f4f6;
  padding-top: 1.25rem;
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.account-action--danger {
  border-top-color: #fee2e2;
}

.account-action__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.account-action__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.125rem;
}

.account-action__title--danger {
  color: #dc2626;
}

.account-action__desc {
  font-size: 0.8125rem;
  color: #9ca3af;
}

.account-subform {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}
</style>
