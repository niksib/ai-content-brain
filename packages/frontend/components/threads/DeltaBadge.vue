<template>
  <span class="delta-badge" :class="toneClass" :aria-label="ariaLabel">
    <span aria-hidden="true">{{ arrowSymbol }}</span>
    <span>{{ formattedValue }}{{ unit ? ` ${unit}` : '' }}</span>
    <span v-if="!hidePercent && percentLabel" class="delta-badge__percent">{{ percentLabel }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  value: number;
  percent?: number | null;
  unit?: string;
  decimals?: number;
  hidePercent?: boolean;
}>(), {
  percent: null,
  unit: '',
  decimals: 0,
  hidePercent: false,
});

const isPositive = computed(() => props.value > 0);
const isNegative = computed(() => props.value < 0);

const toneClass = computed(() => {
  if (isPositive.value) return 'delta-badge--positive';
  if (isNegative.value) return 'delta-badge--negative';
  return 'delta-badge--neutral';
});

const arrowSymbol = computed(() => {
  if (isPositive.value) return '↑';
  if (isNegative.value) return '↓';
  return '–';
});

const formattedValue = computed(() => {
  const absValue = Math.abs(props.value);
  const formatted = props.decimals > 0
    ? absValue.toFixed(props.decimals)
    : Math.round(absValue).toLocaleString('en-US');
  if (props.value === 0) return '0';
  const sign = isPositive.value ? '+' : '−';
  return `${sign}${formatted}`;
});

const percentLabel = computed(() => {
  if (props.percent === null || props.percent === undefined) return '';
  const absolute = Math.abs(props.percent);
  if (!Number.isFinite(absolute)) return '';
  return `(${absolute.toFixed(1)}%)`;
});

const ariaLabel = computed(() => {
  if (props.value === 0) return 'no change';
  const direction = isPositive.value ? 'up' : 'down';
  return `${direction} ${formattedValue.value}`;
});
</script>

<style scoped>
.delta-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  width: fit-content;
}

.delta-badge--positive {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.delta-badge--negative {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

.delta-badge--neutral {
  background: #f3f4f6;
  color: #6b7280;
}

.delta-badge__percent {
  font-weight: 600;
  opacity: 0.8;
}
</style>
