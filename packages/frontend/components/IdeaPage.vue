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
      <!-- Meta badges (platform + format + status + angle) sit above the title now -->
      <div class="idea-page__meta">
        <span class="idea-page__badge idea-page__badge--platform">
          <PlatformIcon :platform="idea.platform as 'threads' | 'linkedin' | 'tiktok' | 'instagram'" :size="14" />
          <span class="idea-page__platform-label">{{ platformLabel }}</span>
        </span>
        <span
          class="idea-page__badge"
          :style="{ background: formatVisual.bg, color: formatVisual.color }"
        >{{ formatVisual.label }}</span>
        <span
          class="idea-page__badge"
          :style="{ background: statusVisual.bg, color: statusVisual.color }"
        >{{ statusVisual.label }}</span>
        <span class="idea-page__badge idea-page__badge--angle">{{ angleLabel }}</span>
      </div>

      <!-- Title -->
      <h1 class="idea-page__title">{{ displayTitle }}</h1>

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

          <!-- Image recommendation -->
          <div v-if="imageSuggestion" class="idea-page__image-suggestion">
            <div class="idea-page__image-suggestion-label">
              <ImagePlus :size="14" />
              Image recommendation
              <span class="idea-page__image-suggestion-type">{{ IMAGE_TYPE_LABELS[imageSuggestion.type] ?? imageSuggestion.type }}</span>
            </div>
            <p class="idea-page__image-suggestion-brief">{{ imageSuggestion.brief }}</p>
          </div>

          <!-- THREADS POST CARD (single or multi-thread, laid out as a timeline) -->
          <template v-if="isThreadsTextPost && contentBody">
            <div class="edit-status-bar">
              <span class="edit-hint">Click on any post to edit</span>
              <span v-if="saveStatus === 'saving'" class="edit-saving">Saving...</span>
              <span v-else-if="saveStatus === 'saved'" class="edit-saved">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
                Saved
              </span>
            </div>

            <!-- Thread = single card; posts share a vertical connector line
                 running avatar-to-avatar on the left. -->
            <div class="thread-card">
              <div
                v-for="(postText, index) in editableThreadPosts"
                :key="`${index}-${postText.slice(0, 20)}`"
                class="thread-post"
                :class="{ 'thread-post--last': index === editableThreadPosts.length - 1 }"
              >
                <!-- Avatar column with connector line -->
                <div class="thread-post__gutter">
                  <div class="thread-post__avatar">
                    <img
                      v-if="threadsAccount?.profilePictureUrl"
                      :src="threadsAccount.profilePictureUrl"
                      class="thread-post__avatar-img"
                      alt="avatar"
                    />
                    <svg v-else viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                  <div
                    v-if="index < editableThreadPosts.length - 1"
                    class="thread-post__connector"
                  />
                </div>

                <!-- Post body column -->
                <div class="thread-post__content">
                  <div class="thread-post__meta">
                    <span class="thread-post__username">{{ threadsAccount?.username ? '@' + threadsAccount.username : 'you' }}</span>
                    <button
                      type="button"
                      class="thread-post__copy"
                      :title="copiedIndex === index ? 'Copied!' : 'Copy'"
                      @click="copyPost(postText, index)"
                    >
                      <svg v-if="copiedIndex === index" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="color: #059669">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                      </svg>
                    </button>
                  </div>

                  <div
                    :ref="(el) => { if (el) postBodyEls[index] = el as HTMLElement }"
                    class="thread-post__body"
                    contenteditable="true"
                    @input="onThreadPostInput(index, $event)"
                    @blur="flushThreadPostEdit(index, $event)"
                    @keydown.enter.exact.prevent="($event.target as HTMLElement).blur()"
                  />

                  <!-- Per-post media attachment (supports up to 20 files for carousel) -->
                  <div class="thread-post__media">
                    <!-- Existing files -->
                    <div v-if="postsMedia[index]?.length" class="thread-post__media-thumbs">
                      <div
                        v-for="(file, fileIdx) in postsMedia[index]"
                        :key="file.id"
                        class="thread-post__media-preview"
                      >
                        <img
                          v-if="file.mimeType.startsWith('image/')"
                          :src="file.url"
                          class="thread-post__media-thumb"
                          alt="attached media"
                        />
                        <div v-else class="thread-post__media-video">
                          <Video :size="16" />
                          <span>{{ file.mimeType.includes('mp4') ? 'MP4' : 'MOV' }}</span>
                        </div>
                        <button
                          type="button"
                          class="thread-post__media-remove"
                          title="Remove"
                          @click="removePostMedia(index, fileIdx)"
                        >
                          <X :size="14" />
                        </button>
                      </div>

                      <!-- Upload progress while adding more -->
                      <div v-if="postsMediaUploading[index]" class="thread-post__media-progress">
                        <div class="thread-post__media-bar">
                          <div class="thread-post__media-fill" :style="{ width: `${postsMediaProgress[index] ?? 0}%` }" />
                        </div>
                      </div>

                      <!-- Add more button (max 20) -->
                      <label
                        v-else-if="(postsMedia[index]?.length ?? 0) < 20"
                        class="thread-post__media-add-more"
                        title="Add another file"
                      >
                        <Plus :size="16" />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,video/mp4,video/quicktime"
                          multiple
                          style="display:none"
                          @change="onPostFileSelected(index, $event)"
                        />
                      </label>
                    </div>

                    <!-- Progress (first upload, no files yet) -->
                    <div v-else-if="postsMediaUploading[index]" class="thread-post__media-progress">
                      <div class="thread-post__media-bar">
                        <div class="thread-post__media-fill" :style="{ width: `${postsMediaProgress[index] ?? 0}%` }" />
                      </div>
                      <span class="thread-post__media-progress-label">{{ postsMediaProgress[index] ?? 0 }}%</span>
                    </div>

                    <!-- Initial attach button -->
                    <label v-else class="thread-post__media-attach">
                      <ImagePlus :size="15" />
                      Add media
                      <input
                        type="file"
                        accept="image/jpeg,image/png,video/mp4,video/quicktime"
                        multiple
                        style="display:none"
                        @change="onPostFileSelected(index, $event)"
                      />
                    </label>
                  </div>

                  <!-- Publish / schedule actions shown after the last post -->
                  <div v-if="index === editableThreadPosts.length - 1" class="thread-post__publish">
                    <ThreadsPublish
                      :text="threadsPublishText"
                      :posts="threadsPublishPosts"
                      :posts-media="threadsPublishPostsMedia"
                      :content-idea-id="idea.id"
                      :publish-status="idea.publishStatus"
                      :scheduled-at="scheduledAt"
                      @published="onPublished"
                      @scheduled="onScheduled"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>

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
import { ref, computed, onMounted, watch, nextTick, reactive } from 'vue';
import { ImagePlus, Video, X, Plus } from 'lucide-vue-next';
import PlatformIcon from '~/components/PlatformIcon.vue';
import ThreadsPublish from '~/components/threads/ThreadsPublish.vue';
import { useSessionStore, type SessionIdea, type ProducedContentBody, type ImageSuggestion } from '~/stores/session';
import { useApiClient } from '~/services/api';
import { useMediaUpload, type UploadedMediaFile } from '~/composables/useMediaUpload';
import { useStatusColors, useFormatColors, resolveStatusKey } from '~/composables/useStatusColors';

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
const scheduledAt = ref<string | null>(null);
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

const PLATFORM_LABELS: Record<string, string> = {
  threads: 'Threads',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

const ANGLE_LABELS: Record<string, string> = {
  hot_take: 'Hot Take',
  reframe: 'Reframe',
  specific_story: 'Specific Story',
  list_of_specifics: 'List of Specifics',
  numbers: 'Numbers',
  observation: 'Observation',
  curiosity_gap: 'Curiosity Gap',
  identity_snapshot: 'Identity Snapshot',
  comparison_frame: 'Comparison Frame',
  question_to_audience: 'Question to Audience',
};

const angleLabel = computed(() => {
  if (!idea.value) return '';
  return ANGLE_LABELS[idea.value.angle] ?? idea.value.angle;
});

const displayTitle = computed(() => {
  if (!idea.value) return '';
  const t = (idea.value.title ?? '').trim();
  if (t) return t;
  return angleLabel.value;
});

const { visual: statusColor } = useStatusColors();
const { visual: formatColor } = useFormatColors();

const platformLabel = computed(() => {
  if (!idea.value) return '';
  return PLATFORM_LABELS[idea.value.platform] ?? idea.value.platform;
});

const formatVisual = computed(() => {
  if (!idea.value) return formatColor('text_post');
  return formatColor(idea.value.format);
});

const statusVisual = computed(() => {
  if (!idea.value) return statusColor('proposed');
  return statusColor(resolveStatusKey(idea.value.status, idea.value.publishStatus));
});

const isThreadsTextPost = computed(
  () => idea.value?.platform === 'threads' && idea.value?.format === 'text_post',
);

const threadsPublishPosts = computed((): string[] | null => {
  if (!idea.value?.producedContent) return null;
  const body = idea.value.producedContent.body as Record<string, unknown>;
  if (Array.isArray(body.posts) && body.posts.length > 1) return body.posts as string[];
  return null;
});

const threadsPublishText = computed((): string => {
  if (!idea.value?.producedContent) return '';
  const body = idea.value.producedContent.body as Record<string, unknown>;
  if (Array.isArray(body.posts)) return (body.posts as string[])[0] ?? '';
  if (typeof body.text === 'string') return body.text;
  return '';
});

// ─── Per-post media (multi-thread attachments, up to 20 per post for carousel) ───
const postsMedia = ref<Array<UploadedMediaFile[] | null>>([]);
const postsMediaUploading = reactive<Record<number, boolean>>({});
const postsMediaProgress = reactive<Record<number, number>>({});

function ensureMediaSlots(count: number): void {
  while (postsMedia.value.length < count) postsMedia.value.push(null);
  if (postsMedia.value.length > count) postsMedia.value.splice(count);
}

async function onPostFileSelected(index: number, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length === 0) return;
  input.value = '';

  const existing = postsMedia.value[index] ?? [];
  const slots = Math.min(files.length, 20 - existing.length);
  if (slots <= 0) return;

  postsMediaUploading[index] = true;
  postsMediaProgress[index] = 0;

  try {
    for (let i = 0; i < slots; i++) {
      const uploader = useMediaUpload();
      const stopWatch = watch(uploader.progress, (value) => {
        postsMediaProgress[index] = Math.round(((i + value / 100) / slots) * 100);
      });
      const result = await uploader.upload(files[i]);
      stopWatch();
      if (result) {
        ensureMediaSlots(editableThreadPosts.value.length);
        postsMedia.value[index] = [...(postsMedia.value[index] ?? []), result];
      }
    }
  } finally {
    postsMediaUploading[index] = false;
    postsMediaProgress[index] = 0;
  }
}

function removePostMedia(postIndex: number, fileIndex: number): void {
  const files = postsMedia.value[postIndex];
  if (!files) return;
  const updated = files.filter((_, i) => i !== fileIndex);
  postsMedia.value[postIndex] = updated.length > 0 ? updated : null;
}

const threadsPublishPostsMedia = computed(() => {
  const count = editableThreadPosts.value.length;
  if (count === 0) return null;
  const result = Array.from({ length: count }, (_, index) => {
    const files = postsMedia.value[index];
    if (!files || files.length === 0) return null;
    if (files.length === 1) {
      return {
        mediaType: files[0].mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        mediaUrl: files[0].url,
      } as { mediaType: 'IMAGE' | 'VIDEO'; mediaUrl: string };
    }
    return {
      carouselItems: files.map(f => ({
        mediaType: (f.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO',
        mediaUrl: f.url,
      })),
    };
  });
  if (result.every(item => item === null)) return null;
  return result;
});

const IMAGE_TYPE_LABELS: Record<string, string> = {
  real_photo: 'Real photo',
  screenshot: 'Screenshot',
  illustration: 'Illustration',
  collage: 'Collage',
};

const imageSuggestion = computed<ImageSuggestion | null>(() => {
  const s = idea.value?.producedContent?.imageSuggestion;
  if (!s || typeof s !== 'object') return null;
  return s as ImageSuggestion;
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
    ensureMediaSlots(posts.length);
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
  // Build posts from current editableThreadPosts merged with any in-progress drafts.
  // Do NOT mutate editableThreadPosts.value — that would change v-for keys and
  // cause Vue to destroy/recreate the contenteditable elements (wiping their innerText).
  const posts = editableThreadPosts.value.map((existing, i) =>
    draftPosts[i] !== undefined ? draftPosts[i] : existing,
  );
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

function onScheduled(isoDate: string): void {
  scheduledAt.value = isoDate;
  if (idea.value) {
    idea.value.publishStatus = 'scheduled';
  }
  const idx = store.ideas.findIndex((i) => i.id === props.ideaId);
  if (idx !== -1) {
    store.ideas[idx] = { ...store.ideas[idx], publishStatus: 'scheduled' };
  }
}

// Sync with store when idea status or content changes (e.g. producing → completed, agent edit)
// Note: store.ideas is populated from the list endpoint which does not include producedContent.
// Preserve the locally-loaded producedContent so the content view doesn't disappear after
// a publish/schedule action updates the store.
watch(
  () => store.ideas.find((item) => item.id === props.ideaId),
  (storeIdea) => {
    if (storeIdea && idea.value) {
      const merged = {
        ...storeIdea,
        producedContent: storeIdea.producedContent ?? idea.value.producedContent,
      };
      const bodyChanged = JSON.stringify(merged.producedContent?.body) !==
                          JSON.stringify(idea.value.producedContent?.body);
      idea.value = merged;
      if (bodyChanged && merged.producedContent) {
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
  margin: 0 0 1.5rem;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #111827;
  font-family: 'Manrope', sans-serif;
}

.idea-page__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.625rem;
}

.idea-page__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.3rem 0.625rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.idea-page__badge--platform {
  background: #f3f4f6;
  color: #4b5563;
}

.idea-page__badge--angle {
  background: #eef0ff;
  color: #3525cd;
}

.idea-page__platform-label {
  font-size: 0.6875rem;
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

.idea-page__produced:has(.thread-card) {
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

/* ─── Unified thread card (Threads-style) ─── */
.thread-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
}

.thread-post {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 0.875rem;
  padding-top: 0.75rem;
}

.thread-post:first-child {
  padding-top: 0;
}

/* Avatar column hosts the connector line */
.thread-post__gutter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.thread-post__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  overflow: hidden;
  flex-shrink: 0;
}

.thread-post__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.thread-post__connector {
  flex: 1;
  width: 2px;
  background: #e5e7eb;
  border-radius: 1px;
  min-height: 12px;
}

.thread-post__content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-bottom: 0.75rem;
}

.thread-post--last .thread-post__content {
  padding-bottom: 0;
}

.thread-post__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 24px;
}

.thread-post__username {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
}

.thread-post__copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.thread-post__copy:hover {
  background: #f3f4f6;
  color: #374151;
}

.thread-post__body {
  font-size: 0.9375rem;
  line-height: 1.55;
  color: #1f2937;
  outline: none;
  white-space: pre-wrap;
  padding: 0.125rem 0;
}

.thread-post__body:focus {
  background: rgba(99, 102, 241, 0.04);
  border-radius: 6px;
}

/* Per-post media row */
.thread-post__media {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.thread-post__media-attach {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.75rem;
  border: 1.5px dashed #c7c4d8;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #777587;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.thread-post__media-attach:hover {
  border-color: #3525cd;
  color: #3525cd;
}

.thread-post__media-preview {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.thread-post__media-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e0e3e5;
}

.thread-post__media-video {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: #191c1e;
  color: #fff;
  border-radius: 8px;
  font-size: 0.6875rem;
  font-weight: 700;
}

.thread-post__media-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #464555;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thread-post__media-remove:hover {
  background: #ba1a1a;
}

.thread-post__media-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.thread-post__media-bar {
  flex: 1;
  height: 4px;
  background: #e0e3e5;
  border-radius: 9999px;
  overflow: hidden;
}

.thread-post__media-fill {
  height: 100%;
  background: #3525cd;
  border-radius: 9999px;
  transition: width 0.2s;
}

.thread-post__media-progress-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #464555;
  white-space: nowrap;
}

.thread-post__media-thumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.thread-post__media-add-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1.5px dashed #c7c4d8;
  border-radius: 8px;
  color: #777587;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.thread-post__media-add-more:hover {
  border-color: #3525cd;
  color: #3525cd;
}

.thread-post__publish {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
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

/* ─── Image recommendation ─── */
.idea-page__image-suggestion {
  margin-top: 1rem;
  margin-bottom: 1.5rem;
  padding: 0.875rem 1rem;
  background: rgba(79, 70, 229, 0.04);
  border: 1px solid rgba(79, 70, 229, 0.14);
  border-radius: 10px;
}

.idea-page__image-suggestion-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #4f46e5;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.5rem;
}

.idea-page__image-suggestion-type {
  margin-left: auto;
  font-size: 0.5625rem;
  font-weight: 800;
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.1);
  padding: 0.125rem 0.4rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.idea-page__image-suggestion-brief {
  font-size: 0.875rem;
  color: #464555;
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 1024px) {
  .idea-page {
    padding: 0;
  }
}
</style>
