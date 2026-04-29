<template>
  <div class="workspace">

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="toolbar-label">Brand · App Icon</span>
        <div class="size-tabs">
          <button
            v-for="s in sizes"
            :key="s"
            class="size-tab"
            :class="{ 'size-tab--active': activeSize === s }"
            @click="activeSize = s"
          >{{ s }}×{{ s }}</button>
        </div>
      </div>
      <button class="dl-btn" :disabled="downloading" @click="download">
        <svg v-if="!downloading" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span v-else class="dl-spinner" />
        {{ downloading ? 'Generating…' : `Download ${activeSize}×${activeSize} PNG` }}
      </button>
    </div>

    <!-- Scale wrapper -->
    <div class="scale-outer">
      <div class="scale-inner" :style="{ transform: `scale(${scale})`, transformOrigin: 'top center' }">

        <!-- ═══ ICON FRAME 1024×1024 ═══ -->
        <div
          ref="iconEl"
          class="icon"
          :style="{ width: activeSize + 'px', height: activeSize + 'px' }"
        >
          <!-- Background blobs -->
          <div class="icon-blob icon-blob-1" />
          <div class="icon-blob icon-blob-2" />

          <!-- Orb -->
          <div class="icon-orb-wrap">
            <div class="icon-orb">
              <div class="icon-orb-sheen" />
              <div class="icon-orb-ring" />
              <div class="icon-orb-ring icon-orb-ring-2" />
              <div class="icon-orb-core">
                <div class="icon-eq">
                  <span v-for="(h, i) in [38, 72, 52, 88, 48, 76, 42]" :key="i" class="icon-eq-bar" :style="{ height: h + '%' }" />
                </div>
              </div>
            </div>
          </div>

          <!-- Wordmark -->
          <div class="icon-wordmark" :style="{ fontSize: activeSize * 0.075 + 'px' }">HeyPostrr</div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' })

useHead({
  title: 'Brand — HeyPostrr',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&display=swap',
    },
  ],
})

const sizes = [1024, 512, 256] as const
type Size = typeof sizes[number]

const activeSize = ref<Size>(1024)
const iconEl = ref<HTMLElement | null>(null)
const downloading = ref(false)
const scale = ref(1)

onMounted(() => {
  const update = () => {
    const maxW = window.innerWidth - 64
    const maxH = window.innerHeight - 120
    scale.value = Math.min(maxW / activeSize.value, maxH / activeSize.value, 1)
  }
  update()
  window.addEventListener('resize', update)
  watch(activeSize, update)
  onUnmounted(() => window.removeEventListener('resize', update))
})

async function download() {
  if (!iconEl.value || downloading.value) return
  downloading.value = true
  try {
    await document.fonts.ready
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(iconEl.value, {
      width: activeSize.value,
      height: activeSize.value,
      pixelRatio: 1,
      cacheBust: true,
      style: { transform: 'none' },
    })
    const a = document.createElement('a')
    a.download = `heypostrr-icon-${activeSize.value}.png`
    a.href = dataUrl
    a.click()
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.workspace {
  min-height: 100vh;
  background: #e8e5de;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ─── Toolbar ─── */
.toolbar {
  height: 52px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #1a1824;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.toolbar-label {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
}

.size-tabs {
  display: flex;
  gap: 4px;
}

.size-tab {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.size-tab:hover { color: rgba(255, 255, 255, 0.7); }

.size-tab--active {
  background: rgba(79, 70, 229, 0.35);
  border-color: rgba(79, 70, 229, 0.6);
  color: #fff;
}

.dl-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 999px;
  background: #4f46e5;
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  white-space: nowrap;
}
.dl-btn:hover:not(:disabled) { background: #4338ca; }
.dl-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.dl-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Scale wrapper ─── */
.scale-outer {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 32px 24px;
  overflow: hidden;
}
.scale-inner { flex-shrink: 0; }

/* ─── Icon frame ─── */
.icon {
  background: #f7f5f0;
  border-radius: 22.5%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
}

/* Background blobs */
.icon-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.icon-blob-1 {
  width: 80%; height: 80%;
  top: -20%; right: -20%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 65%);
}
.icon-blob-2 {
  width: 60%; height: 60%;
  bottom: -15%; left: -10%;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.14) 0%, transparent 65%);
}

/* Orb */
.icon-orb-wrap {
  position: relative;
  z-index: 2;
  width: 44%;
  height: 44%;
  flex-shrink: 0;
  margin-bottom: 6%;
}

.icon-orb {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(-45deg, #4f46e5, #8b5cf6, #c084fc, #e0e7ff);
  position: relative;
  box-shadow:
    0 0 0 4% rgba(139, 92, 246, 0.14),
    0 0 0 8% rgba(79, 70, 229, 0.08),
    0 8% 20% rgba(79, 70, 229, 0.45);
}

.icon-orb-sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.45), transparent 55%);
}

.icon-orb-ring {
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  border: 0.7% solid rgba(255, 255, 255, 0.25);
}
.icon-orb-ring-2 {
  inset: 20%;
  border-color: rgba(255, 255, 255, 0.15);
}

.icon-orb-core {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-eq {
  display: flex;
  align-items: center;
  gap: 6%;
  width: 44%;
  height: 30%;
}

.icon-eq-bar {
  flex: 1;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  display: block;
}

/* Wordmark */
.icon-wordmark {
  position: relative;
  z-index: 2;
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #1a1824;
  line-height: 1;
}
</style>
