<template>
  <div class="ob-fallback">
    <div class="ob-threads-preview">
      <div class="ob-threads-preview__avatar">
        <span class="material-symbols-outlined">person</span>
      </div>
      <div class="ob-threads-preview__body">
        <div class="ob-threads-preview__title">@you · 0 posts</div>
        <div class="ob-threads-preview__sub">Connected, but nothing to learn from yet</div>
      </div>
    </div>

    <PrimaryCta icon="play_arrow" @click="$emit('start')">
      Start with 4 questions
    </PrimaryCta>
  </div>
</template>

<script setup lang="ts">
import PrimaryCta from '../PrimaryCta.vue';

defineEmits<{ start: [] }>();
</script>

<style scoped>
.ob-fallback {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ob-threads-preview {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(199, 196, 216, 0.5);
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #464555;
}

.ob-threads-preview__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c7c4d8, #a09faf);
  flex-shrink: 0;
  color: #fff;
  display: grid;
  place-items: center;
}

.ob-threads-preview__avatar .material-symbols-outlined { font-size: 20px; }

.ob-threads-preview__body { line-height: 1.35; flex: 1; }

.ob-threads-preview__title {
  color: #191c1e;
  font-weight: 600;
  font-size: 13.5px;
}

.ob-threads-preview__sub { font-size: 12px; color: #777587; }
</style>
