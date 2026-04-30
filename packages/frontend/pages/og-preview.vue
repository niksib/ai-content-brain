<template>
  <div class="workspace">

    <!-- Toolbar -->
    <div class="toolbar">
      <span class="toolbar-label">OG Preview · 1200 × 630 px</span>
      <button class="dl-btn" :disabled="downloading" @click="download">
        <svg v-if="!downloading" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span v-else class="dl-spinner" />
        {{ downloading ? 'Generating…' : 'Download PNG' }}
      </button>
    </div>

    <!-- Scale wrapper -->
    <div class="scale-outer">
      <div class="scale-inner" :style="{ transform: `scale(${scale})`, transformOrigin: 'top left' }">

        <!-- ═══ OG FRAME 1200×630 ═══ -->
        <div ref="ogEl" class="og">

          <!-- Background blobs -->
          <div class="og-blob og-blob-1" />
          <div class="og-blob og-blob-2" />
          <div class="og-blob og-blob-3" />

          <!-- ── LEFT COLUMN ── -->
          <div class="og-left">

            <div class="og-brand">
              <div class="og-mark"><div class="og-mark-inner" /></div>
              <span class="og-brand-name">HeyPostrr</span>
            </div>

            <div class="og-eyebrow">
              <span class="og-dot" />
              <span class="og-eyebrow-text">AI for creators who think out loud</span>
            </div>

            <h1 class="og-headline">
              Voice your mess.<br>
              <em>Get your post.</em>
            </h1>

            <p class="og-sub">
              AI that turns your messy thoughts into posts<br>
              that actually sound like <em class="og-sub-em">you</em> - on Threads,<br>
              LinkedIn, Instagram, X.
            </p>

            <div class="og-flow">
              <div class="og-flow-step og-flow-step--speak">
                <span class="og-flow-icon og-flow-icon--speak">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                </span>
                <span class="og-flow-label">Speak</span>
              </div>
              <span class="og-flow-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
              </span>
              <div class="og-flow-step og-flow-step--approve">
                <span class="og-flow-icon og-flow-icon--approve">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span class="og-flow-label">Approve</span>
              </div>
              <span class="og-flow-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
              </span>
              <div class="og-flow-step og-flow-step--accent">
                <span class="og-flow-icon og-flow-icon--post">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </span>
                <span class="og-flow-label">Post</span>
              </div>
            </div>

          </div>

          <!-- ── RIGHT COLUMN: ORB only ── -->
          <div class="og-right">
            <div class="og-orb-wrap">
              <div class="og-orb">
                <div class="og-orb-sheen" />
                <div class="og-orb-ring" />
                <div class="og-orb-ring og-orb-ring-2" />
                <div class="og-orb-core">
                  <div class="og-eq">
                    <span v-for="(h, i) in [38, 72, 52, 88, 48, 76, 42]" :key="i" class="og-eq-bar" :style="{ height: h + '%' }" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Thought chips — absolute in full OG frame, scattered around orb -->
          <!-- Orb center ≈ x:970 y:315 in 1200×630 frame -->
          <div v-for="chip in chips" :key="chip.text" class="og-chip" :style="chip.style">
            <span class="og-chip-dot" />
            {{ chip.text }}
          </div>

        </div>
        <!-- /og -->

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' })

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500&family=Instrument+Serif:ital@0;1&family=Caveat:wght@400;600&display=swap',
    },
  ],
})

const ogEl = ref<HTMLElement | null>(null)
const downloading = ref(false)
const scale = ref(1)

const chips = [
  { text: 'hot take - most advice online is just someone\'s story in disguise', style: { top: '108px',   right: '168px',  '--tilt': '-2deg'   } },
  { text: 'I think my pricing page is totally wrong',                           style: { top: '148px',   right: '7px',   '--tilt': '-2.5deg' } },
  { text: 'nobody talks about the boring part between launch and getting users', style: { top: '200px',   left: '660px',   '--tilt': '1.5deg'  } },
  { text: 'everyone\'s talking about AI but nobody\'s talking about taste',     style: { top: '258px',   right: '8px',    '--tilt': '1.5deg'  } },
  { text: 'I was in the shower and realized we built the wrong feature',        style: { bottom: '268px',left: '635px',   '--tilt': '-3deg'   } },
  { text: 'writing is thinking slowed down enough to catch yourself',           style: { bottom: '226px',right: '6px',   '--tilt': '11deg'   } },
  { text: 'what if I just shared the whole messy process',                     style: { bottom: '175px',left: '698px',   '--tilt': '-1.5deg' } },
  { text: 'my best ideas always come mid-walk, why is that',                   style: { bottom: '123px',right: '33px',   '--tilt': '-8deg'    } },
]

onMounted(() => {
  const update = () => {
    const maxW = window.innerWidth - 48
    const maxH = window.innerHeight - 88
    scale.value = Math.min(maxW / 1200, maxH / 630, 1)
  }
  update()
  window.addEventListener('resize', update)
  onUnmounted(() => window.removeEventListener('resize', update))
})

async function download() {
  if (!ogEl.value || downloading.value) return
  downloading.value = true
  try {
    await document.fonts.ready
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(ogEl.value, {
      width: 1200,
      height: 630,
      pixelRatio: 2,
      backgroundColor: '#f7f5f0',
      cacheBust: true,
      style: { transform: 'none' },
    })
    const a = document.createElement('a')
    a.download = 'heypostrr-og.png'
    a.href = dataUrl
    a.click()
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
/* ─── Workspace shell ─────────────────────────────────────── */
.workspace {
  min-height: 100vh;
  background: #e8e5de;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, sans-serif;
}

.toolbar {
  height: 52px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1824;
  flex-shrink: 0;
}
.toolbar-label {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
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
  letter-spacing: 0.01em;
}
.dl-btn:hover:not(:disabled) { background: #4338ca; }
.dl-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.dl-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

.scale-outer {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  overflow: hidden;
}
.scale-inner { flex-shrink: 0; }

/* ─── OG Frame 1200 × 630 ─────────────────────────────────── */
.og {
  width: 1200px;
  height: 630px;
  background: #f7f5f0;
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 460px;
}

.og-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.og-blob-1 {
  width: 560px; height: 560px;
  right: -80px; top: -160px;
  background: radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 65%);
}
.og-blob-2 {
  width: 380px; height: 380px;
  right: 60px; bottom: -120px;
  background: radial-gradient(circle, rgba(79,70,229,0.16) 0%, transparent 65%);
}
.og-blob-3 {
  width: 260px; height: 260px;
  left: 480px; top: 160px;
  background: radial-gradient(circle, rgba(192,132,252,0.12) 0%, transparent 65%);
}

/* ─── Left column ─────────────────────────────────────────── */
.og-left {
  padding: 52px 32px 52px 68px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.og-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
}
.og-mark {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6, #c084fc);
  position: relative;
  box-shadow: 0 4px 14px rgba(79,70,229,0.35);
  flex-shrink: 0;
}
.og-mark-inner {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.65), transparent 55%);
}
.og-brand-name {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 20px;
  letter-spacing: -0.02em;
  color: #1a1824;
}

.og-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255,255,255,0.75);
  border: 1px solid rgba(26,24,36,0.1);
  margin-bottom: 28px;
  align-self: flex-start;
}
.og-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #3525cd;
  box-shadow: 0 0 0 3px rgba(53,37,205,0.2);
  flex-shrink: 0;
}
.og-eyebrow-text {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #1a1824;
}

/* "J" clipping fix: padding + negative margin wraps the italic descender */
.og-headline {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 90px;
  font-weight: 400;
  line-height: 0.97;
  letter-spacing: -0.018em;
  color: #1a1824;
  margin: 0 0 26px;
  padding: 0 20px 10px;
  margin-left: -20px;
  overflow: visible;
}
.og-headline em {
  font-style: italic;
  background: linear-gradient(135deg, #3525cd, #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  display: inline-block;
  padding: 0 18px 6px;
  margin: 0 -18px;
}

.og-sub {
  font-family: 'Inter', sans-serif;
  font-size: 19px;
  line-height: 1.55;
  color: rgba(26,24,36,0.72);
  margin: 0 0 36px;
}
.og-sub-em {
  font-style: italic;
  font-family: 'Instrument Serif', Georgia, serif;
  color: #1a1824;
}

.og-flow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.85);
  border: 1px solid rgba(26,24,36,0.08);
  box-shadow: 0 12px 30px rgba(26,24,36,0.10);
  align-self: flex-start;
  backdrop-filter: blur(6px);
}

.og-flow-step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #ffffff;
  color: #1a1824;
  border: 1px solid rgba(26,24,36,0.08);
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.005em;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(26,24,36,0.04);
}

.og-flow-step--speak {
  background: #f0eeff;
  border-color: rgba(79,70,229,0.18);
  color: #2d219a;
}

.og-flow-step--approve {
  background: #e6fbf3;
  border-color: rgba(0,128,96,0.18);
  color: #0a6a51;
}

.og-flow-step--accent {
  background: linear-gradient(135deg, #3525cd, #8b5cf6);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 8px 22px rgba(79,70,229,0.35);
}

.og-flow-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
}

.og-flow-icon--speak {
  background: #4f46e5;
  color: #fff;
}

.og-flow-icon--approve {
  background: #10b981;
  color: #fff;
}

.og-flow-icon--post {
  background: rgba(255,255,255,0.22);
  color: #fff;
}

.og-flow-label {
  line-height: 1;
}

.og-flow-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: rgba(26,24,36,0.35);
}

/* ─── Right column: Orb ───────────────────────────────────── */
.og-right {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  overflow: visible;
}

.og-orb-wrap {
  position: relative;
  width: 220px;
  height: 220px;
  flex-shrink: 0;
}

.og-orb {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(-45deg, #4f46e5, #8b5cf6, #c084fc, #e0e7ff);
  position: relative;
  box-shadow:
    0 0 0 18px rgba(139,92,246,0.12),
    0 0 0 46px rgba(79,70,229,0.07),
    0 20px 60px rgba(79,70,229,0.5);
}
.og-orb-sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.45), transparent 55%);
}
.og-orb-ring {
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.25);
}
.og-orb-ring-2 {
  inset: 32px;
  border-color: rgba(255,255,255,0.15);
}
.og-orb-core {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.og-eq {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 54px;
}
.og-eq-bar {
  width: 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.92);
  display: block;
}

/* ─── Thought chips (Caveat, tilted) ─────────────────────── */
.og-chip {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  border-radius: 999px;
  background: rgba(255,255,255,0.85);
  border: 1px solid rgba(26,24,36,0.12);
  box-shadow: 0 4px 14px rgba(26,24,36,0.08);
  font-family: 'Caveat', cursive;
  font-size: 18px;
  font-weight: 400;
  color: #1a1824;
  white-space: nowrap;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  transform: rotate(var(--tilt, 0deg));
}
.og-chip-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #3525cd;
  opacity: 0.6;
  flex-shrink: 0;
}
</style>
