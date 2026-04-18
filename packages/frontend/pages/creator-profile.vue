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
          </div>
          <div class="platform-row__right">
            <ThreadsConnect v-if="platform === 'threads'" />
            <button v-else class="platform-card__connect-btn" type="button" disabled>Connect</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Memory blocks -->
    <section class="profile-section">
      <h2 class="section-title">Creator Memory</h2>
      <p class="section-subtitle">Edit any block to refine how Postrr understands your voice, audience, goals, and content focus.</p>

      <div v-if="profileStore.isLoading" class="loading-state">Loading memory blocks…</div>

      <div v-else-if="profileStore.memoryBlocks.length === 0 && profileStore.canonicalKeys.length === 0" class="empty-state">
        <p>No memory yet. Complete onboarding first.</p>
        <NuxtLink to="/onboarding" class="btn btn--primary">Start Onboarding</NuxtLink>
      </div>

      <div v-else class="blocks-list">
        <article
          v-for="entry in displayBlocks"
          :key="entry.key"
          class="block-card"
        >
          <header class="block-card__header">
            <div>
              <h3 class="block-card__title">{{ entry.title }}</h3>
              <p class="block-card__description">{{ entry.description }}</p>
            </div>
            <button
              v-if="!isCanonical(entry.key) && hasContent(entry.key)"
              type="button"
              class="block-card__delete"
              @click="onDelete(entry.key)"
            >
              Remove
            </button>
          </header>

          <textarea
            v-model="drafts[entry.key]"
            class="form-textarea"
            rows="4"
            :placeholder="entry.description"
          />

          <div class="block-card__footer">
            <span class="block-card__key">{{ entry.key }}</span>
            <button
              type="button"
              class="btn btn--primary block-card__save"
              :disabled="!isDirty(entry.key) || profileStore.isSaving"
              @click="onSave(entry.key)"
            >
              Save
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { useProfileStore, type MemoryBlock, type CanonicalKey } from '~/stores/profile';
import PlatformIcon from '~/components/PlatformIcon.vue';
import ThreadsConnect from '~/components/threads/ThreadsConnect.vue';

definePageMeta({ layout: 'default' });

const profileStore = useProfileStore();

const ALL_PLATFORMS = ['threads', 'linkedin', 'tiktok', 'instagram'] as const;
type Platform = (typeof ALL_PLATFORMS)[number];

const PLATFORM_NAMES: Record<Platform, string> = {
  threads: 'Threads',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

interface DisplayBlock {
  key: string;
  title: string;
  description: string;
  content: string;
}

const drafts = reactive<Record<string, string>>({});
const baseline = ref<Record<string, string>>({});

const blockMap = computed<Record<string, MemoryBlock>>(() => {
  const map: Record<string, MemoryBlock> = {};
  for (const block of profileStore.memoryBlocks) {
    map[block.key] = block;
  }
  return map;
});

const canonicalMap = computed<Record<string, CanonicalKey>>(() => {
  const map: Record<string, CanonicalKey> = {};
  for (const entry of profileStore.canonicalKeys) {
    map[entry.key] = entry;
  }
  return map;
});

const displayBlocks = computed<DisplayBlock[]>(() => {
  const seen = new Set<string>();
  const result: DisplayBlock[] = [];

  for (const canonical of profileStore.canonicalKeys) {
    const block = blockMap.value[canonical.key];
    result.push({
      key: canonical.key,
      title: canonical.title,
      description: canonical.description,
      content: block?.content ?? '',
    });
    seen.add(canonical.key);
  }

  for (const block of profileStore.memoryBlocks) {
    if (seen.has(block.key)) continue;
    result.push({
      key: block.key,
      title: block.title,
      description: block.description,
      content: block.content,
    });
  }

  return result;
});

function isCanonical(key: string): boolean {
  return Boolean(canonicalMap.value[key]);
}

function hasContent(key: string): boolean {
  return Boolean(blockMap.value[key]);
}

function isDirty(key: string): boolean {
  return (drafts[key] ?? '') !== (baseline.value[key] ?? '');
}

function syncDrafts(): void {
  const next: Record<string, string> = {};
  for (const entry of displayBlocks.value) {
    next[entry.key] = entry.content;
  }
  baseline.value = next;
  for (const key of Object.keys(drafts)) delete drafts[key];
  for (const [key, value] of Object.entries(next)) drafts[key] = value;
}

watch(
  () => [profileStore.memoryBlocks, profileStore.canonicalKeys],
  syncDrafts,
  { immediate: true, deep: true },
);

async function onSave(key: string): Promise<void> {
  const content = drafts[key]?.trim();
  if (!content) return;
  const canonical = canonicalMap.value[key];
  const existing = blockMap.value[key];
  await profileStore.upsertBlock({
    key,
    title: existing?.title ?? canonical?.title ?? key,
    description: existing?.description ?? canonical?.description ?? '',
    content,
  });
}

async function onDelete(key: string): Promise<void> {
  if (isCanonical(key)) return;
  await profileStore.deleteBlock(key);
}

onMounted(async () => {
  await profileStore.loadProfile();
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
  white-space: nowrap;
}

/* Blocks */
.loading-state,
.empty-state {
  color: #6b7280;
  text-align: center;
  padding: 2rem 0;
}

.blocks-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.block-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.block-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.block-card__title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem;
}

.block-card__description {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.block-card__delete {
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  color: #ef4444;
  cursor: pointer;
}

.block-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.block-card__key {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  color: #9ca3af;
}

.form-textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #fff;
  resize: vertical;
  width: 100%;
}

.form-textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
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
</style>
