<template>
  <div class="idea-page">
    <!-- Back button -->
    <button type="button" class="idea-page__back" @click="emit('back')">
      &larr; Back to ideas
    </button>

    <!-- Loading state -->
    <div v-if="isLoading" class="idea-page__loading">
      Loading...
    </div>

    <!-- Error state -->
    <div v-else-if="loadError" class="idea-page__error">
      {{ loadError }}
    </div>

    <!-- Idea content -->
    <div v-else-if="idea" class="idea-page__content">
      <!-- Title -->
      <h1 class="idea-page__title">{{ idea.angle }}</h1>

      <!-- Meta badges -->
      <div class="idea-page__meta">
        <span class="idea-page__badge idea-page__badge--platform">
          <PlatformIcon :platform="idea.platform as 'threads' | 'linkedin' | 'tiktok' | 'instagram'" :size="12" />
        </span>
        <span class="idea-page__badge idea-page__badge--format">
          {{ formatLabel }}
        </span>
      </div>

      <!-- Description -->
      <div v-if="idea.description" class="idea-page__section">
        <h2 class="idea-page__section-title">Description</h2>
        <p class="idea-page__description">{{ idea.description }}</p>
      </div>

      <!-- Actions -->
      <div v-if="idea.status === 'proposed'" class="idea-page__actions">
        <button
          type="button"
          class="idea-page__action idea-page__action--approve"
          @click="handleApprove"
        >
          Approve
        </button>
        <button
          type="button"
          class="idea-page__action idea-page__action--reject"
          @click="handleReject"
        >
          Reject
        </button>
      </div>

      <!-- Produced content -->
      <div class="idea-page__section">
        <h2 v-if="!isThreadsTextPost" class="idea-page__section-title">Produced Content</h2>

        <!-- Show produced content when completed -->
        <div v-if="idea.status === 'completed' && idea.producedContent" class="idea-page__produced">

          <!-- THREADS POST CARD (single or multi-thread) -->
          <template v-if="isThreadsTextPost && contentBody">
            <div class="edit-status-bar">
              <span class="edit-hint">Click on any post to edit</span>
              <span v-if="saveStatus === 'saving'" class="edit-saving">Saving...</span>
              <span v-else-if="saveStatus === 'saved'" class="edit-saved">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
                Saved
              </span>
            </div>
            <div class="threads-thread">
              <div
                v-for="(postText, index) in editableThreadPosts"
                :key="`${index}-${postText.slice(0, 20)}`"
                class="threads-thread__item"
              >
                <!-- Vertical connector line between posts -->
                <div v-if="index < editableThreadPosts.length - 1" class="threads-thread__connector-wrap">
                  <div class="threads-thread__line" />
                </div>

                <div class="threads-card">
                  <div class="threads-card__header">
                    <div class="threads-card__avatar">
                      <img
                        v-if="threadsAccount?.profilePictureUrl"
                        :src="threadsAccount.profilePictureUrl"
                        class="threads-card__avatar-img"
                        alt="avatar"
                      />
                      <svg v-else viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    </div>
                    <div class="threads-card__user">
                      <span class="threads-card__username">{{ threadsAccount?.username ? '@' + threadsAccount.username : 'you' }}</span>
                    </div>
                    <button
                      type="button"
                      class="threads-card__more"
                      :title="copiedIndex === index ? 'Copied!' : 'Copy'"
                      @click="copyPost(postText, index)"
                    >
                      <svg v-if="copiedIndex === index" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" style="color: #059669">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                      </svg>
                    </button>
                  </div>
                  <div
                    :ref="(el) => { if (el) postBodyEls[index] = el as HTMLElement }"
                    class="threads-card__body"
                    contenteditable="true"
                    @input="onThreadPostInput(index, $event)"
                    @blur="flushThreadPostEdit(index, $event)"
                    @keydown.enter.exact.prevent="($event.target as HTMLElement).blur()"
                  />
                  <div class="threads-card__actions">
                    <button type="button" class="threads-card__action">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="20" height="20">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                    <button type="button" class="threads-card__action">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="20" height="20">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                    <button type="button" class="threads-card__action">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="20" height="20">
                        <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>
                      </svg>
                    </button>
                    <button type="button" class="threads-card__action">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="20" height="20">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- THREADS PUBLISH ACTIONS -->
          <ThreadsPublish
            v-if="isThreadsTextPost && idea.producedContent"
            :text="threadsPublishText"
            :content-idea-id="idea.id"
            :publish-status="idea.publishStatus"
            @published="onPublished"
            @scheduled="onScheduled"
          />

          <!-- TEXT POST (LinkedIn, other platforms) -->
          <template v-else-if="idea.format === 'text_post' && contentBody">
            <div class="idea-page__text-post">
              <div class="edit-status-bar">
                <span class="edit-hint">Click to edit</span>
                <span v-if="saveStatus === 'saving'" class="edit-saving">Saving...</span>
                <span v-else-if="saveStatus === 'saved'" class="edit-saved">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
                  Saved
                </span>
              </div>
              <div
                ref="textBodyEl"
                class="idea-page__text-body"
                contenteditable="true"
                @input="onTextBodyInput($event)"
                @blur="flushTextBodyEdit($event)"
              />
              <div v-if="contentBody.hashtags?.length" class="idea-page__hashtags">
                <span
                  v-for="tag in contentBody.hashtags"
                  :key="tag"
                  class="idea-page__hashtag"
                >#{{ tag }}</span>
              </div>
              <button
                type="button"
                class="idea-page__copy-btn"
                @click="copyTextContent"
              >
                {{ copyLabel }}
              </button>
            </div>
          </template>

          <!-- VIDEO SCRIPT (TikTok, Reels) -->
          <template v-else-if="idea.format === 'video_script' && contentBody">
            <div class="idea-page__video-script">
              <!-- Script section -->
              <details class="idea-page__collapsible" open>
                <summary class="idea-page__collapsible-title">Script</summary>
                <div class="idea-page__script-lines">
                  <div
                    v-for="(line, index) in contentBody.script"
                    :key="index"
                    class="idea-page__script-line"
                  >
                    <span class="idea-page__timestamp">{{ line.timestamp }}</span>
                    <span class="idea-page__script-text">{{ line.text }}</span>
                  </div>
                </div>
              </details>

              <!-- Shooting brief -->
              <details v-if="contentBody.shootingBrief" class="idea-page__collapsible">
                <summary class="idea-page__collapsible-title">Shooting Brief</summary>
                <p class="idea-page__collapsible-body">{{ contentBody.shootingBrief }}</p>
              </details>

              <!-- Delivery notes -->
              <details v-if="contentBody.deliveryNotes" class="idea-page__collapsible">
                <summary class="idea-page__collapsible-title">Delivery Notes</summary>
                <p class="idea-page__collapsible-body">{{ contentBody.deliveryNotes }}</p>
              </details>

              <!-- Caption -->
              <details v-if="contentBody.caption" class="idea-page__collapsible">
                <summary class="idea-page__collapsible-title">Caption</summary>
                <p class="idea-page__collapsible-body">{{ contentBody.caption }}</p>
                <div v-if="contentBody.hashtags?.length" class="idea-page__hashtags">
                  <span
                    v-for="tag in contentBody.hashtags"
                    :key="tag"
                    class="idea-page__hashtag"
                  >#{{ tag }}</span>
                </div>
              </details>
            </div>
          </template>

          <!-- CAROUSEL (Instagram) -->
          <template v-else-if="idea.format === 'carousel' && contentBody">
            <div class="idea-page__carousel">
              <div
                v-for="slide in contentBody.slides"
                :key="slide.slideNumber"
                class="idea-page__slide"
              >
                <div class="idea-page__slide-header">Slide {{ slide.slideNumber }}</div>
                <p class="idea-page__slide-text">{{ slide.text }}</p>
                <p v-if="slide.designNotes" class="idea-page__slide-design">
                  {{ slide.designNotes }}
                </p>
              </div>

              <!-- Caption -->
              <div v-if="contentBody.caption" class="idea-page__carousel-caption">
                <h3 class="idea-page__subsection-title">Caption</h3>
                <p>{{ contentBody.caption }}</p>
              </div>

              <div v-if="contentBody.hashtags?.length" class="idea-page__hashtags">
                <span
                  v-for="tag in contentBody.hashtags"
                  :key="tag"
                  class="idea-page__hashtag"
                >#{{ tag }}</span>
              </div>
            </div>
          </template>

          <!-- STORIES (Instagram) -->
          <template v-else-if="idea.format === 'stories' && contentBody">
            <div class="idea-page__stories">
              <div
                v-for="story in contentBody.stories"
                :key="story.storyNumber"
                class="idea-page__story"
              >
                <div class="idea-page__story-header">Story {{ story.storyNumber }}</div>
                <p class="idea-page__story-text">{{ story.textOverlay }}</p>
                <p v-if="story.background" class="idea-page__story-bg">
                  Background: {{ story.background }}
                </p>
                <p v-if="story.interactiveElement" class="idea-page__story-interactive">
                  Interactive: {{ story.interactiveElement }}
                </p>
              </div>

              <div v-if="contentBody.notes" class="idea-page__stories-notes">
                <h3 class="idea-page__subsection-title">Notes</h3>
                <p>{{ contentBody.notes }}</p>
              </div>
            </div>
          </template>

          <!-- Fallback for unknown formats -->
          <template v-else>
            <pre class="idea-page__produced-content">{{ idea.producedContent.body }}</pre>
          </template>
        </div>

        <!-- Completed but empty content (generation failed silently) -->
        <div v-else-if="idea.status === 'completed' && hasEmptyContent" class="idea-page__placeholder">
          <p class="idea-page__placeholder-text">Generation failed — content was empty.</p>
          <button class="idea-page__regenerate-btn" type="button" @click="emit('approve', idea.id)">
            Regenerate
          </button>
        </div>

        <!-- Producing state -->
        <div v-else-if="idea.status === 'producing'" class="idea-page__placeholder">
          <p class="idea-page__placeholder-text idea-page__placeholder-text--producing">
            Content is being generated...
          </p>
        </div>

        <!-- Placeholder for other states -->
        <div v-else class="idea-page__placeholder">
          <p class="idea-page__placeholder-text">
            Content will appear here after approval
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import PlatformIcon from '~/components/PlatformIcon.vue';
import ThreadsPublish from '~/components/threads/ThreadsPublish.vue';
import { useSessionStore, type SessionIdea, type ProducedContentBody } from '~/stores/session';
import { useApiClient } from '~/services/api';

const props = defineProps<{
  ideaId: string;
}>();

const emit = defineEmits<{
  back: [];
  approve: [ideaId: string];
  reject: [ideaId: string];
}>();

const store = useSessionStore();
const apiClient = useApiClient();
const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

interface ThreadsAccount { username: string; profilePictureUrl: string | null }
const threadsAccount = ref<ThreadsAccount | null>(null);

const idea = ref<SessionIdea | null>(null);
const isLoading = ref(false);
const loadError = ref<string | null>(null);
const copyLabel = ref('Copy');
const copiedIndex = ref<number | null>(null);
const editableThreadPosts = ref<string[]>([]);
const editableTextBody = ref('');
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
const saveTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const savedTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const showSavingTimer = ref<ReturnType<typeof setTimeout> | null>(null);

// Template refs for contenteditable elements — content is set imperatively,
// never via reactive binding, to avoid cursor-reset on re-render.
const postBodyEls = ref<HTMLElement[]>([]);
const textBodyEl = ref<HTMLElement | null>(null);

// Plain (non-reactive) drafts written during typing.
// Reactive state is only updated at save time (blur / debounce fire).
const draftPosts: Record<number, string> = {};
let draftTextBody = '';

const FORMAT_LABELS: Record<string, string> = {
  text_post: 'Post',
  text_with_image: 'Post + Image',
  image_series: 'Image Series',
  video_script: 'Video Script',
  carousel: 'Carousel',
  stories: 'Stories',
};

const formatLabel = computed(() => {
  if (!idea.value) return '';
  return FORMAT_LABELS[idea.value.format] ?? idea.value.format;
});

const isThreadsTextPost = computed(
  () => idea.value?.platform === 'threads' && idea.value?.format === 'text_post',
);

const threadsPublishText = computed((): string => {
  if (!idea.value?.producedContent) return '';
  const body = idea.value.producedContent.body as Record<string, unknown>;
  if (Array.isArray(body.posts)) {
    return (body.posts as string[]).join('\n\n');
  }
  if (typeof body.text === 'string') {
    return body.text;
  }
  return '';
});

const contentBody = computed<ProducedContentBody | null>(() => {
  if (!idea.value?.producedContent?.body) return null;
  const body = idea.value.producedContent.body;
  // Body may be a string (JSON) or already parsed object
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as ProducedContentBody;
    } catch {
      return null;
    }
  }
  return body as ProducedContentBody;
});

// Unified array: either multi-post thread or single post wrapped in array
// Declared after contentBody to avoid temporal dependency warning
const threadPosts = computed<string[]>(() => {
  if (!contentBody.value) return [];
  if (contentBody.value.posts?.length) return contentBody.value.posts;
  if (contentBody.value.text) return [contentBody.value.text];
  return [];
});

// True when idea is marked completed but the agent saved empty content
const hasEmptyContent = computed(() => {
  if (!idea.value?.producedContent) return true;
  const body = contentBody.value;
  if (!body) return true;
  if (body.posts?.length) return false;
  if (body.text) return false;
  if (body.caption) return false;
  if (body.slides?.length) return false;
  if (body.script?.length) return false;
  if (body.stories?.length) return false;
  return true;
});

// Initialise editable copies on first load.
// After setting the ref values, push text into DOM imperatively so Vue never
// re-renders contenteditable elements and the cursor is never reset.
watch(threadPosts, (posts) => {
  if (editableThreadPosts.value.length === 0) {
    editableThreadPosts.value = [...posts];
    nextTick(() => {
      posts.forEach((text, i) => {
        const el = postBodyEls.value[i];
        if (el) el.innerText = text;
      });
    });
  }
}, { immediate: true });

watch(contentBody, (body) => {
  if (body?.text && !editableTextBody.value) {
    editableTextBody.value = body.text;
    nextTick(() => {
      if (textBodyEl.value) textBodyEl.value.innerText = body.text!;
    });
  }
}, { immediate: true });

// --- Auto-save helpers ---

function scheduleAutoSave(persistFn: () => Promise<void>): void {
  // User is typing — clear everything and hide indicators
  if (showSavingTimer.value !== null) { clearTimeout(showSavingTimer.value); showSavingTimer.value = null; }
  if (saveTimer.value !== null) { clearTimeout(saveTimer.value); saveTimer.value = null; }
  if (savedTimer.value !== null) { clearTimeout(savedTimer.value); savedTimer.value = null; }
  saveStatus.value = 'idle';

  // After 500ms of inactivity: show "Saving..."
  showSavingTimer.value = setTimeout(() => {
    saveStatus.value = 'saving';
    showSavingTimer.value = null;
  }, 500);

  // After 5s of inactivity: persist to backend
  saveTimer.value = setTimeout(() => {
    persistFn();
    saveStatus.value = 'saved';
    saveTimer.value = null;
    savedTimer.value = setTimeout(() => { saveStatus.value = 'idle'; }, 2000);
  }, 5000);
}

function flushSave(persistFn: () => Promise<void>): void {
  if (showSavingTimer.value !== null) { clearTimeout(showSavingTimer.value); showSavingTimer.value = null; }
  if (saveTimer.value !== null) { clearTimeout(saveTimer.value); saveTimer.value = null; }
  if (savedTimer.value !== null) { clearTimeout(savedTimer.value); savedTimer.value = null; }
  persistFn();
  saveStatus.value = 'saved';
  savedTimer.value = setTimeout(() => { saveStatus.value = 'idle'; }, 2000);
}

async function persistThreadEdits(): Promise<void> {
  if (!idea.value?.producedContent) return;
  Object.entries(draftPosts).forEach(([i, text]) => {
    editableThreadPosts.value[Number(i)] = text;
  });
  const posts = editableThreadPosts.value;
  const updatedBody: ProducedContentBody = {
    ...contentBody.value,
    posts: posts.length > 1 ? [...posts] : undefined,
    text: posts.length === 1 ? posts[0] : undefined,
  };
  idea.value.producedContent.body = updatedBody;
  store.markContentUpdatedByUser(updatedBody);
  await apiClient.patch(`/api/ideas/${props.ideaId}/content`, updatedBody).catch(() => {});
}

async function persistTextBodyEdit(): Promise<void> {
  if (!idea.value?.producedContent) return;
  if (draftTextBody) editableTextBody.value = draftTextBody;
  const updatedBody: ProducedContentBody = { ...contentBody.value, text: editableTextBody.value };
  idea.value.producedContent.body = updatedBody;
  store.markContentUpdatedByUser(updatedBody);
  await apiClient.patch(`/api/ideas/${props.ideaId}/content`, updatedBody).catch(() => {});
}

// Called on every keystroke — reads from DOM but does NOT write to reactive
// state (that would trigger re-render and reset the cursor).
// The actual reactive update happens only in persistThreadEdits / flushSave.
function onThreadPostInput(index: number, event: Event): void {
  draftPosts[index] = (event.target as HTMLElement).innerText;
  scheduleAutoSave(persistThreadEdits);
}

function onTextBodyInput(event: Event): void {
  draftTextBody = (event.target as HTMLElement).innerText;
  scheduleAutoSave(persistTextBodyEdit);
}

// Called on blur — focus is already gone, safe to update reactive state
function flushThreadPostEdit(index: number, event: Event): void {
  draftPosts[index] = (event.target as HTMLElement).innerText;
  flushSave(persistThreadEdits);
}

function flushTextBodyEdit(event: Event): void {
  draftTextBody = (event.target as HTMLElement).innerText;
  flushSave(persistTextBodyEdit);
}

async function copyTextContent() {
  if (!contentBody.value?.text) return;

  const hashtagString = contentBody.value.hashtags?.length
    ? '\n\n' + contentBody.value.hashtags.map((tag) => `#${tag}`).join(' ')
    : '';

  try {
    await navigator.clipboard.writeText(contentBody.value.text + hashtagString);
    copyLabel.value = 'Copied!';
    setTimeout(() => { copyLabel.value = 'Copy'; }, 2000);
  } catch {
    copyLabel.value = 'Failed';
    setTimeout(() => { copyLabel.value = 'Copy'; }, 2000);
  }
}

async function copyPost(text: string, index: number) {
  try {
    await navigator.clipboard.writeText(text);
    copiedIndex.value = index;
    setTimeout(() => { copiedIndex.value = null; }, 2000);
  } catch {
    // silently fail
  }
}

function handleApprove() {
  emit('approve', props.ideaId);
  if (idea.value) {
    idea.value.status = 'producing';
  }
}

function handleReject() {
  emit('reject', props.ideaId);
  if (idea.value) {
    idea.value.status = 'rejected';
  }
}

function onPublished(threadsPostId: string): void {
  if (idea.value) {
    idea.value.publishStatus = 'posted';
    idea.value.threadsPostId = threadsPostId;
  }
  // Sync to store
  const idx = store.ideas.findIndex((i) => i.id === props.ideaId);
  if (idx !== -1) {
    store.ideas[idx] = { ...store.ideas[idx], publishStatus: 'posted', threadsPostId };
  }
}

function onScheduled(): void {
  if (idea.value) {
    idea.value.publishStatus = 'scheduled';
  }
  const idx = store.ideas.findIndex((i) => i.id === props.ideaId);
  if (idx !== -1) {
    store.ideas[idx] = { ...store.ideas[idx], publishStatus: 'scheduled' };
  }
}

// Sync with store when idea status or content changes (e.g. producing → completed, agent edit)
watch(
  () => store.ideas.find((item) => item.id === props.ideaId),
  (storeIdea) => {
    if (storeIdea && idea.value) {
      const bodyChanged = JSON.stringify(storeIdea.producedContent?.body) !==
                          JSON.stringify(idea.value.producedContent?.body);
      idea.value = { ...storeIdea };
      if (bodyChanged && storeIdea.producedContent) {
        // Reset editable state so the threadPosts/contentBody watchers re-initialize with new content
        editableThreadPosts.value = [];
        editableTextBody.value = '';
      }
    }
  },
  { deep: true },
);

onMounted(async () => {
  isLoading.value = true;
  // Load Threads account in parallel (for avatar/username in post card)
  $fetch<{ account: ThreadsAccount | null }>(`${apiBaseUrl}/api/threads/account`, { credentials: 'include' })
    .then((r) => { threadsAccount.value = r.account; })
    .catch(() => {});
  try {
    const freshIdea = await store.loadIdea(props.ideaId);
    if (freshIdea) {
      idea.value = freshIdea;
    }
  } catch (error) {
    loadError.value = 'Failed to load idea details';
    console.error('Failed to load idea:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.idea-page {
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
}

.idea-page__back {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0;
  border: none;
  background: none;
  color: #6366f1;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: color 0.15s ease;
}

.idea-page__back:hover {
  color: #4f46e5;
}

.idea-page__loading {
  color: #9ca3af;
  font-size: 0.9375rem;
  font-style: italic;
}

.idea-page__error {
  color: #ef4444;
  font-size: 0.875rem;
  padding: 0.75rem;
  background: #fef2f2;
  border-radius: 8px;
}

.idea-page__title {
  margin: 0 0 1rem;
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1.3;
  color: #1f2937;
}

.idea-page__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.idea-page__badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  text-transform: capitalize;
}

.idea-page__badge--platform {
  background: transparent;
  padding: 0;
}

.idea-page__badge--format {
  background: #f3f4f6;
  color: #4b5563;
}

.idea-page__badge--proposed {
  background: #fef3c7;
  color: #92400e;
}

.idea-page__badge--approved {
  background: #d1fae5;
  color: #065f46;
}

.idea-page__badge--rejected {
  background: #f3f4f6;
  color: #6b7280;
}

.idea-page__badge--producing {
  background: #dbeafe;
  color: #1e40af;
}

.idea-page__badge--completed {
  background: #d1fae5;
  color: #065f46;
}

.idea-page__section {
  margin-bottom: 2rem;
}

.idea-page__section-title {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

.idea-page__description {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
}

.idea-page__actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.idea-page__action {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.idea-page__action--approve {
  background: #6366f1;
  color: white;
}

.idea-page__action--approve:hover {
  background: #4f46e5;
}

.idea-page__action--reject {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #d1d5db;
}

.idea-page__action--reject:hover {
  background: #e5e7eb;
}

.idea-page__placeholder {
  padding: 2rem;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  text-align: center;
}

.idea-page__placeholder-text {
  margin: 0;
  font-size: 0.875rem;
  color: #9ca3af;
  font-style: italic;
}

.idea-page__placeholder-text--producing {
  color: #3b82f6;
  animation: producing-pulse 1.5s ease-in-out infinite;
}

.idea-page__regenerate-btn {
  margin-top: 0.75rem;
  padding: 0.4rem 1rem;
  background: #111827;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.idea-page__regenerate-btn:hover {
  background: #374151;
}

@keyframes producing-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.idea-page__produced {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
  overflow: hidden;
}

.idea-page__produced:has(.threads-card) {
  border: none;
  background: transparent;
  border-radius: 0;
}

.idea-page__produced-content {
  margin: 0;
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
}

/* Text post */
.idea-page__text-post {
  padding: 1.25rem;
}

.idea-page__text-body {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: #1f2937;
  white-space: pre-wrap;
  margin-bottom: 1rem;
}

.idea-page__hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.idea-page__hashtag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  background: #eef2ff;
  color: #4338ca;
}

.idea-page__copy-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s ease;
}

.idea-page__copy-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* Video script */
.idea-page__video-script {
  padding: 0.5rem;
}

.idea-page__collapsible {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.idea-page__collapsible-title {
  padding: 0.75rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  background: white;
  user-select: none;
}

.idea-page__collapsible-title:hover {
  background: #f9fafb;
}

.idea-page__collapsible-body {
  margin: 0;
  padding: 0.75rem 1rem 1rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #4b5563;
  white-space: pre-wrap;
}

.idea-page__script-lines {
  padding: 0.5rem 1rem 1rem;
}

.idea-page__script-line {
  display: flex;
  gap: 0.75rem;
  padding: 0.375rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.idea-page__script-line:last-child {
  border-bottom: none;
}

.idea-page__timestamp {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6366f1;
  font-family: monospace;
  min-width: 4rem;
  padding-top: 0.125rem;
}

.idea-page__script-text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: #374151;
}

/* Carousel */
.idea-page__carousel {
  padding: 1rem;
}

.idea-page__slide {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: white;
}

.idea-page__slide-header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6366f1;
  margin-bottom: 0.5rem;
}

.idea-page__slide-text {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #1f2937;
  white-space: pre-wrap;
}

.idea-page__slide-design {
  margin: 0;
  font-size: 0.8125rem;
  color: #6b7280;
  font-style: italic;
}

.idea-page__carousel-caption {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.idea-page__carousel-caption p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #374151;
}

.idea-page__subsection-title {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b7280;
}

/* Stories */
.idea-page__stories {
  padding: 1rem;
}

.idea-page__story {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: white;
}

.idea-page__story-header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8b5cf6;
  margin-bottom: 0.5rem;
}

.idea-page__story-text {
  margin: 0 0 0.375rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #1f2937;
}

.idea-page__story-bg {
  margin: 0 0 0.25rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.idea-page__story-interactive {
  margin: 0;
  font-size: 0.8125rem;
  color: #059669;
  font-weight: 500;
}

.idea-page__stories-notes {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.idea-page__stories-notes p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #4b5563;
  white-space: pre-wrap;
}

/* Threads thread wrapper */
.threads-thread {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.threads-thread__item {
  position: relative;
  margin-bottom: 0;
}

.threads-thread__item + .threads-thread__item {
  margin-top: 0;
}

.threads-thread__connector-wrap {
  display: flex;
  justify-content: center;
  padding: 0 0 0 18px; /* align with avatar center */
  height: 16px;
}

.threads-thread__line {
  width: 2px;
  height: 100%;
  background: #e5e7eb;
  border-radius: 1px;
}

/* Threads post card */
.threads-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.threads-card__header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem 0.5rem;
}

.threads-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  flex-shrink: 0;
  overflow: hidden;
}

.threads-card__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.threads-card__user {
  flex: 1;
  min-width: 0;
}

.threads-card__username {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
}

.threads-card__more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 6px;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.threads-card__more:hover {
  background: #f3f4f6;
  color: #374151;
}

.threads-card__body {
  padding: 0.25rem 1rem 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.65;
  color: #111827;
  white-space: pre-wrap;
}

.threads-card__actions {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem 0.875rem;
  border-top: 1px solid #f3f4f6;
}

.threads-card__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: #6b7280;
  cursor: default;
  border-radius: 8px;
  transition: color 0.15s;
}

.threads-card__action:hover {
  color: #111827;
}

/* Inline editing */
.threads-card__body {
  cursor: text;
  outline: none;
  border-radius: 4px;
  transition: background 0.15s;
}

.threads-card__body:focus {
  background: #f5f3ff;
  outline: 2px solid #6366f1;
  outline-offset: -2px;
}

.idea-page__text-body {
  cursor: text;
  outline: none;
  border-radius: 4px;
  transition: background 0.15s;
}

.idea-page__text-body:focus {
  background: #f5f3ff;
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

/* Edit status bar */
.edit-status-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0 0.5rem;
}

.edit-hint {
  font-size: 0.6875rem;
  color: #9ca3af;
  flex: 1;
}

.edit-saving {
  font-size: 0.6875rem;
  color: #9ca3af;
}

.edit-saved {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: #059669;
  font-weight: 500;
}
</style>
