<template>
  <div class="page">
    <div class="card">
      <div class="brand">
        <div class="brand-mark"><div class="brand-mark-inner" /></div>
        <span class="brand-name">HeyPostrr</span>
      </div>

      <h1>Data deletion request</h1>

      <div v-if="loading" class="state">Loading…</div>

      <template v-else-if="status">
        <div class="status-row">
          <span class="status-label">Status</span>
          <span class="badge" :class="`badge-${status.status}`">{{ statusLabel }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Requested</span>
          <span>{{ formatDate(status.requestedAt) }}</span>
        </div>
        <div v-if="status.completedAt" class="meta-row">
          <span class="meta-label">Completed</span>
          <span>{{ formatDate(status.completedAt) }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Confirmation code</span>
          <code>{{ code }}</code>
        </div>
        <p v-if="status.status === 'completed'" class="note">
          Your HeyPostrr data has been removed. You can close this page.
        </p>
        <p v-else-if="status.status === 'failed'" class="note error">
          Deletion failed. Contact support@heypostrr.com with the confirmation code above and we'll finish the job manually.
        </p>
        <p v-else class="note">
          Deletion is in progress. Refresh this page in a minute to check again.
        </p>
      </template>

      <div v-else class="state error">
        No deletion request matches this confirmation code.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()
const config = useRuntimeConfig()
const code = computed(() => String(route.params.code))

interface DeletionStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  requestedAt: string
  completedAt: string | null
}

const status = ref<DeletionStatus | null>(null)
const loading = ref(true)

const statusLabel = computed(() => {
  if (!status.value) return ''
  const labels: Record<DeletionStatus['status'], string> = {
    pending: 'Pending',
    in_progress: 'In progress',
    completed: 'Completed',
    failed: 'Failed',
  }
  return labels[status.value.status] ?? status.value.status
})

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

onMounted(async () => {
  try {
    status.value = await $fetch<DeletionStatus>(
      `${config.public.apiBaseUrl}/api/threads/data-deletion-status/${code.value}`,
    )
  } catch {
    status.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f5f0;
  padding: 32px 16px;
  font-family: 'Inter', system-ui, sans-serif;
}

.card {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 24px;
  border: 1px solid rgba(26, 24, 36, 0.08);
  box-shadow: 0 20px 60px rgba(26, 24, 36, 0.08);
  padding: 36px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}
.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6, #c084fc);
  position: relative;
  flex-shrink: 0;
}
.brand-mark-inner {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.65), transparent 55%);
}
.brand-name {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: #1a1824;
  letter-spacing: -0.01em;
}

h1 {
  font-family: 'Manrope', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #1a1824;
  margin: 0 0 24px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid rgba(26, 24, 36, 0.08);
}
.status-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(26, 24, 36, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}
.badge-pending,
.badge-in_progress {
  background: rgba(79, 70, 229, 0.1);
  color: #4f46e5;
}
.badge-completed {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}
.badge-failed {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  font-size: 14px;
  color: #1a1824;
  border-bottom: 1px solid rgba(26, 24, 36, 0.06);
}
.meta-row:last-of-type {
  border-bottom: none;
}
.meta-label {
  color: rgba(26, 24, 36, 0.6);
  font-size: 13px;
}
code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  background: rgba(26, 24, 36, 0.06);
  padding: 4px 8px;
  border-radius: 6px;
  color: #1a1824;
}

.note {
  margin: 20px 0 0;
  padding: 14px 16px;
  background: rgba(79, 70, 229, 0.06);
  border-radius: 12px;
  font-size: 14px;
  color: rgba(26, 24, 36, 0.78);
  line-height: 1.5;
}
.note.error {
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
}

.state {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: rgba(26, 24, 36, 0.6);
}
.state.error {
  color: #b91c1c;
}
</style>
