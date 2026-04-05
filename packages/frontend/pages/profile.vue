<template>
  <div class="profile-page">
    <!-- Section 1: Creator Profile -->
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
              v-for="platform in availablePlatforms"
              :key="platform"
              type="button"
              class="chip"
              :class="{ 'chip--active': form.platforms.includes(platform) }"
              @click="togglePlatform(platform)"
            >
              {{ platform }}
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

        <!-- Save -->
        <button type="submit" class="btn btn--primary" :disabled="profileStore.isSaving">
          {{ profileStore.isSaving ? 'Saving...' : 'Save Profile' }}
        </button>

        <p v-if="saveMessage" class="save-message" :class="{ 'save-message--error': saveError }">
          {{ saveMessage }}
        </p>
      </form>
    </section>

    <!-- Section 2: Subscription & Credits -->
    <section class="profile-section">
      <h2 class="section-title">Subscription</h2>
      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value">Free (Beta)</span>
      </div>
      <div class="info-row">
        <span class="info-label">Credit Balance</span>
        <span class="info-value info-value--credits">{{ billingStore.balance }}</span>
      </div>
      <div class="placeholder-actions">
        <button
          type="button"
          class="btn btn--primary"
          @click="handleBuyCredits"
        >
          Buy Credits
        </button>
      </div>

      <!-- Billing status messages -->
      <p v-if="billingStatus === 'success'" class="save-message">Payment successful! Credits have been added.</p>
      <p v-if="billingStatus === 'cancel'" class="save-message save-message--error">Payment was cancelled.</p>

      <!-- Transaction History -->
      <div v-if="billingStore.transactions.length > 0" class="transactions-section">
        <h3 class="subsection-title">Transaction History</h3>
        <table class="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="transaction in billingStore.transactions" :key="transaction.id">
              <td>{{ formatDate(transaction.createdAt) }}</td>
              <td>{{ formatType(transaction.type) }}</td>
              <td :class="transaction.amount > 0 ? 'amount-positive' : 'amount-negative'">
                {{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}
              </td>
              <td class="reference-cell">{{ transaction.reference || '---' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 3: Account -->
    <section class="profile-section">
      <h2 class="section-title">Account</h2>
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">{{ userEmail || '---' }}</span>
      </div>
      <div class="placeholder-actions">
        <button type="button" class="btn btn--secondary" disabled>Change Password</button>
        <button type="button" class="btn btn--danger" disabled>Delete Account</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue';
import { useProfileStore, type ProfileUpdateData } from '~/stores/profile';
import { useBillingStore } from '~/stores/billing';
import { useApiClient } from '~/services/api';

definePageMeta({
  layout: 'default',
});

const profileStore = useProfileStore();
const billingStore = useBillingStore();

const route = useRoute();
const billingStatus = computed(() => route.query.billing as string | undefined);

const availablePlatforms = ['threads', 'linkedin', 'tiktok', 'instagram'] as const;

const form = reactive({
  platforms: [] as string[],
  niche: '',
  topics: [] as string[],
  audienceDescription: '',
  audiencePainPoints: '',
  stage: 'starting' as 'starting' | 'growing' | 'established',
  toneOfVoice: '',
  goals: [] as string[],
});

const newTopic = ref('');
const newGoal = ref('');
const userEmail = ref('');
const saveMessage = ref('');
const saveError = ref(false);

function populateForm() {
  const profile = profileStore.profile;
  if (!profile) return;

  form.platforms = [...profile.platforms];
  form.niche = profile.niche;
  form.topics = [...profile.topics];
  form.audienceDescription = profile.audienceDescription;
  form.audiencePainPoints = profile.audiencePainPoints || '';
  form.stage = profile.stage;
  form.toneOfVoice = profile.toneOfVoice;
  form.goals = [...profile.goals];
}

watch(() => profileStore.profile, populateForm);

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
  // Use a placeholder price ID — will be replaced with real Stripe price
  billingStore.createCheckout('price_credits_500', 'payment');
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatType(type: string): string {
  const typeLabels: Record<string, string> = {
    subscription_grant: 'Subscription',
    topup_purchase: 'Top-up',
    voice_processing: 'Voice',
    content_plan: 'Content Plan',
    content_production: 'Production',
  };
  return typeLabels[type] || type;
}

onMounted(async () => {
  await Promise.all([
    profileStore.loadProfile(),
    billingStore.loadBalance(),
    billingStore.loadTransactions(),
  ]);
  populateForm();

  // Extract email from the API response (stored alongside profile)
  // The GET /api/profile endpoint returns { profile, email }
  try {
    const apiClient = useApiClient();
    const response = await apiClient.get<{ profile: unknown; email: string }>('/api/profile');
    userEmail.value = response.email || '';
  } catch {
    // Profile may not exist yet; email will show as placeholder
  }
});
</script>

<style scoped>
.profile-page {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.profile-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1.25rem;
}

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

/* Chip selector */
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

/* Tag input */
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

/* Buttons */
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

/* Info rows */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
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

.placeholder-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.save-message {
  font-size: 0.8125rem;
  color: #059669;
  margin: 0;
}

.save-message--error {
  color: #dc2626;
}

/* Credits highlight */
.info-value--credits {
  font-size: 1.125rem;
  font-weight: 700;
  color: #6366f1;
}

/* Transactions */
.transactions-section {
  margin-top: 1.5rem;
}

.subsection-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.transactions-table th {
  text-align: left;
  padding: 0.5rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
  font-weight: 500;
}

.transactions-table td {
  padding: 0.5rem 0.5rem;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
}

.amount-positive {
  color: #059669;
  font-weight: 500;
}

.amount-negative {
  color: #dc2626;
  font-weight: 500;
}

.reference-cell {
  color: #9ca3af;
  font-size: 0.75rem;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
