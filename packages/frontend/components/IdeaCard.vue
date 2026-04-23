<template>
  <div
    class="idea-card"
    :class="[`idea-card--${idea.status}`, { 'idea-card--updating': isUpdating, 'idea-card--updated': isUpdated && !isUpdating }]"
    @click="emit('select', idea.id)"
    @mouseenter="isUpdated && emit('seen', idea.id)"
  >
    <div class="idea-card__header">
      <span class="idea-card__platform">{{ platformEmoji }}</span>
      <span class="idea-card__format">{{ idea.format }}</span>
      <div class="idea-card__header-right">
        <!-- Connected account (shown on the right, opposite the platform/format) -->
        <div v-if="idea.platform === 'threads' && threadsAccount" class="idea-card__account-inline">
          <img
            v-if="threadsAccount.profilePictureUrl"
            :src="threadsAccount.profilePictureUrl"
            class="idea-card__account-avatar"
            alt="Threads avatar"
          />
          <div v-else class="idea-card__account-avatar-placeholder"></div>
          <span class="idea-card__account-username">@{{ threadsAccount.username }}</span>
        </div>
        <!-- Status / AI badge -->
        <span v-if="isUpdating" class="idea-card__ai-badge idea-card__ai-badge--working">
          <span class="idea-card__ai-dot"></span>
          AI working
        </span>
        <span v-else-if="isUpdated" class="idea-card__ai-badge idea-card__ai-badge--updated">
          Updated
        </span>
        <span v-else-if="idea.publishStatus === 'posted'" class="idea-card__status idea-card__status--posted">
          Posted
        </span>
        <span v-else-if="idea.publishStatus === 'scheduled'" class="idea-card__status idea-card__status--scheduled">
          Scheduled
        </span>
        <span v-else class="idea-card__status" :class="`idea-card__status--${idea.status}`">
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <p class="idea-card__angle">{{ idea.angle }}</p>

    <div v-if="idea.status === 'proposed'" class="idea-card__actions">
      <button
        type="button"
        class="idea-card__action idea-card__action--approve"
        title="Approve"
        @click.stop="emit('approve', idea.id)"
      >
        &#10003;
      </button>
      <button
        type="button"
        class="idea-card__action idea-card__action--reject"
        title="Reject"
        @click.stop="emit('reject', idea.id)"
      >
        &#10005;
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SessionIdea } from '~/stores/session';

interface ThreadsAccount {
  username: string;
  profilePictureUrl: string | null;
}

const props = defineProps<{
  idea: SessionIdea;
  isUpdating?: boolean;
  isUpdated?: boolean;
  threadsAccount?: ThreadsAccount | null;
}>();

const emit = defineEmits<{
  select: [ideaId: string];
  approve: [ideaId: string];
  reject: [ideaId: string];
  seen: [ideaId: string];
}>();

const platformEmojiMap: Record<string, string> = {
  threads: '\uD83E\uDDF5',
  linkedin: '\uD83D\uDCBC',
  tiktok: '\uD83C\uDFAC',
  instagram: '\uD83D\uDCF8',
  twitter: '\uD83D\uDC26',
  youtube: '\u25B6\uFE0F',
};

const platformEmoji = computed(() => {
  const key = props.idea.platform.toLowerCase();
  return platformEmojiMap[key] ?? '\uD83D\uDCA1';
});

const statusLabels: Record<string, string> = {
  proposed: 'Proposed',
  approved: 'Approved',
  rejected: 'Rejected',
  producing: 'Producing',
  completed: 'Completed',
};

const statusLabel = computed(() => {
  return statusLabels[props.idea.status] ?? props.idea.status;
});
</script>

<style scoped>
.idea-card {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.idea-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
}

.idea-card.idea-card--updating,
.idea-card.idea-card--updating:hover {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  animation: card-updating-pulse 2s ease-in-out infinite;
}

@keyframes card-updating-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12); }
  50% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); }
}

.idea-card.idea-card--updated,
.idea-card.idea-card--updated:hover {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.idea-card__header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.idea-card__account-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  max-width: 100px;
}

.idea-card__ai-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.idea-card__ai-badge--working {
  color: #4f46e5;
  background: #eef2ff;
}

.idea-card__ai-badge--updated {
  color: #4f46e5;
  background: #eef2ff;
}

.idea-card__ai-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6366f1;
  animation: dot-blink 1s ease-in-out infinite;
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.idea-card__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.idea-card__platform {
  font-size: 1.125rem;
}

.idea-card__format {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  text-transform: capitalize;
}

.idea-card__status {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.idea-card__status--proposed {
  background: #fef3c7;
  color: #92400e;
}

.idea-card__status--approved {
  background: #d1fae5;
  color: #065f46;
}

.idea-card__status--rejected {
  background: #f3f4f6;
  color: #6b7280;
}

.idea-card__status--producing {
  background: #dbeafe;
  color: #1e40af;
  animation: status-pulse 1.5s ease-in-out infinite;
}

.idea-card__status--completed {
  background: #d1fae5;
  color: #065f46;
}

.idea-card__status--posted {
  background: #d1fae5;
  color: #065f46;
}

.idea-card__status--scheduled {
  background: #eef2ff;
  color: #4338ca;
}

@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.idea-card__angle {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: #1f2937;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.idea-card__account-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.idea-card__account-avatar-placeholder {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e5e7eb;
  flex-shrink: 0;
}

.idea-card__account-username {
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.idea-card__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #f3f4f6;
}

.idea-card__action {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: all 0.15s ease;
}

.idea-card__action--approve:hover {
  background: #d1fae5;
  border-color: #6ee7b7;
  color: #065f46;
}

.idea-card__action--reject:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #991b1b;
}
</style>
