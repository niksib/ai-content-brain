<template>
  <section class="threads-form">
    <div class="threads-form__header">
      <label class="threads-form__label">Posts</label>
      <button
        v-if="posts.length < MAX_POSTS"
        type="button"
        class="threads-form__add"
        @click="addPost"
      >
        + Add reply
      </button>
    </div>

    <article
      v-for="(post, index) in posts"
      :key="index"
      class="threads-form__post"
    >
      <header class="threads-form__post-header">
        <span class="threads-form__post-index">Post {{ index + 1 }}</span>
        <button
          v-if="posts.length > 1"
          type="button"
          class="threads-form__post-remove"
          @click="removePost(index)"
        >
          Remove
        </button>
      </header>

      <textarea
        :value="post.text"
        class="threads-form__textarea"
        rows="3"
        maxlength="500"
        placeholder="What do you want to say?"
        @input="updateText(index, ($event.target as HTMLTextAreaElement).value)"
      />

      <div class="threads-form__meta">
        <span
          class="threads-form__count"
          :class="{ 'threads-form__count--warn': post.text.length > 470 }"
        >
          {{ post.text.length }} / 500
        </span>

        <label v-if="!post.media" class="threads-form__attach">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            class="threads-form__attach-input"
            :disabled="uploadingIndex === index"
            @change="onFileSelected(index, $event)"
          />
          <span>{{ uploadingIndex === index ? 'Uploading…' : 'Attach media' }}</span>
        </label>

        <div v-else class="threads-form__attachment">
          <span class="threads-form__attachment-type">{{ post.media.mediaType }}</span>
          <button type="button" class="threads-form__attachment-remove" @click="detachMedia(index)">
            Remove
          </button>
        </div>
      </div>

      <p v-if="errors[index]" class="threads-form__error">{{ errors[index] }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

export interface ThreadsSchedulePost {
  text: string;
  media: { mediaType: 'IMAGE' | 'VIDEO'; mediaUrl: string } | null;
}

const MAX_POSTS = 10;

const props = defineProps<{
  posts: ThreadsSchedulePost[];
}>();

const emit = defineEmits<{
  'update:posts': [value: ThreadsSchedulePost[]];
}>();

const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl as string;

const uploadingIndex = ref<number | null>(null);
const errors = reactive<Record<number, string>>({});

function emitUpdate(next: ThreadsSchedulePost[]): void {
  emit('update:posts', next);
}

function addPost(): void {
  if (props.posts.length >= MAX_POSTS) return;
  emitUpdate([...props.posts, { text: '', media: null }]);
}

function removePost(index: number): void {
  const next = props.posts.slice();
  next.splice(index, 1);
  delete errors[index];
  emitUpdate(next);
}

function updateText(index: number, text: string): void {
  const next = props.posts.slice();
  next[index] = { ...next[index], text };
  emitUpdate(next);
}

function detachMedia(index: number): void {
  const next = props.posts.slice();
  next[index] = { ...next[index], media: null };
  emitUpdate(next);
}

async function onFileSelected(index: number, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  input.value = '';
  if (!file) return;

  errors[index] = '';
  uploadingIndex.value = index;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await $fetch<{ url: string; mimeType: string }>(
      `${apiBaseUrl}/api/media/upload`,
      { method: 'POST', body: formData, credentials: 'include' }
    );

    const mediaType: 'IMAGE' | 'VIDEO' = response.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE';
    const next = props.posts.slice();
    next[index] = { ...next[index], media: { mediaType, mediaUrl: response.url } };
    emitUpdate(next);
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errors[index] = apiError ?? 'Upload failed. Please try again.';
  } finally {
    uploadingIndex.value = null;
  }
}
</script>

<style scoped>
.threads-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.threads-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.threads-form__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #6b7280;
}

.threads-form__add {
  border: 1px dashed #d1d5db;
  background: transparent;
  color: #4f46e5;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
}

.threads-form__add:hover {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.05);
}

.threads-form__post {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #fafafa;
}

.threads-form__post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.threads-form__post-index {
  font-size: 0.75rem;
  font-weight: 700;
  color: #4338ca;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.threads-form__post-remove {
  border: none;
  background: none;
  color: #ef4444;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
}

.threads-form__textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #fff;
  resize: vertical;
  min-height: 72px;
}

.threads-form__textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.threads-form__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.threads-form__count {
  font-size: 0.75rem;
  color: #9ca3af;
  font-variant-numeric: tabular-nums;
}

.threads-form__count--warn { color: #f59e0b; }

.threads-form__attach {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #4f46e5;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.threads-form__attach:hover { background: rgba(99, 102, 241, 0.08); }

.threads-form__attach-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.threads-form__attachment {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  font-size: 0.75rem;
}

.threads-form__attachment-type {
  color: #4338ca;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.threads-form__attachment-remove {
  border: none;
  background: none;
  color: #6366f1;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
}

.threads-form__error {
  margin: 0;
  font-size: 0.75rem;
  color: #dc2626;
}
</style>
