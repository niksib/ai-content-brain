<template>
  <div class="content-card" @click="emit('select', item.id)">
    <div class="content-card__header">
      <span class="content-card__platform">{{ platformEmoji }}</span>
      <span class="content-card__format">{{ formatLabel }}</span>
      <span class="content-card__date">{{ formattedDate }}</span>
    </div>

    <p class="content-card__angle">{{ item.contentIdea.angle }}</p>

    <p v-if="preview" class="content-card__preview">{{ preview }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LibraryItem } from '~/stores/library';

const props = defineProps<{
  item: LibraryItem;
}>();

const emit = defineEmits<{
  select: [contentId: string];
}>();

const platformEmojiMap: Record<string, string> = {
  threads: '\uD83E\uDDF5',
  linkedin: '\uD83D\uDCBC',
  tiktok: '\uD83C\uDFAC',
  instagram: '\uD83D\uDCF8',
  twitter: '\uD83D\uDC26',
  youtube: '\u25B6\uFE0F',
};

const formatLabels: Record<string, string> = {
  text_post: 'Text Post',
  video_script: 'Video Script',
  carousel: 'Carousel',
  stories: 'Stories',
};

const platformEmoji = computed(() => {
  const key = props.item.platform.toLowerCase();
  return platformEmojiMap[key] ?? '\uD83D\uDCA1';
});

const formatLabel = computed(() => {
  return formatLabels[props.item.format] ?? props.item.format;
});

const formattedDate = computed(() => {
  const date = new Date(props.item.createdAt);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
});

const preview = computed(() => {
  const body = props.item.body;
  let text = '';

  if (typeof body === 'object' && body !== null) {
    if (typeof body.text === 'string') {
      text = body.text;
    } else if (typeof body.caption === 'string') {
      text = body.caption;
    } else if (Array.isArray(body.slides) && body.slides.length > 0) {
      const firstSlide = body.slides[0] as Record<string, unknown>;
      text = (firstSlide?.text as string) ?? '';
    } else if (Array.isArray(body.script) && body.script.length > 0) {
      const firstLine = body.script[0] as Record<string, unknown>;
      text = (firstLine?.text as string) ?? '';
    }
  }

  if (!text) return '';
  return text.length > 80 ? text.slice(0, 80) + '...' : text;
});
</script>

<style scoped>
.content-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.content-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
}

.content-card__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.content-card__platform {
  font-size: 1.125rem;
}

.content-card__format {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.content-card__date {
  margin-left: auto;
  font-size: 0.75rem;
  color: #9ca3af;
}

.content-card__angle {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2937;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.content-card__preview {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #6b7280;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
