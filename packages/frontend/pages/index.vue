<template>
  <div>
    <!-- ═══════════════════ LANDING PAGE ═══════════════════ -->
      <div class="page">

        <!-- NAV -->
        <nav class="nav">
          <div class="nav-inner">
            <div class="brand">
              <div class="brand-mark"><div class="brand-mark-inner" /></div>
              <span class="brand-name">HeyPostrr</span>
            </div>
            <div class="nav-links">
              <a href="#how">How it works</a>
              <a href="#voice">Your voice</a>
              <a href="#platforms">Platforms</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div class="nav-cta">
              <template v-if="isLoggedIn">
                <NuxtLink to="/dashboard" class="btn-primary">Go to dashboard</NuxtLink>
              </template>
              <template v-else>
                <button class="btn-ghost" @click="goToAuth('login')">Sign in</button>
                <button class="btn-primary" @click="goToAuth('register')">
                  Start free
                  <ArrowRight :size="16" />
                </button>
              </template>
            </div>
          </div>
        </nav>

        <!-- HERO -->
        <section class="hero">
          <!-- Copy - left column -->
          <div class="hero-copy">
            <div class="eyebrow">
              <span class="eyebrow-dot" />
              <span class="mono-label">AI for creators who think out loud</span>
            </div>
            <h1 class="display hero-title">
              Don't write.<br>
              <em>Just think.</em>
            </h1>
            <p class="hero-sub">
              HeyPostrr turns your thoughts into posts that sound exactly like <span class="underline-scribble">you</span>, on Threads, LinkedIn, Instagram, X.
            </p>
            <div class="hero-ctas">
              <div class="hero-cta-col">
                <button class="btn-primary btn-primary--big" @click="goToAuth('register')">
                  <Mic :size="18" />
                  Start talking
                </button>
                <span class="no-card-text">No credit card required</span>
              </div>
            </div>
          </div>

          <!-- Animated stage - right column -->
          <div class="stage">
            <div class="stage-inner">
              <!-- Central orb -->
              <div class="orb-wrap">
                <div class="orb-halo" />
                <div class="orb-halo orb-halo--2" />
                <div class="orb">
                  <div class="orb-sheen" />
                  <div class="orb-ring" />
                  <div class="orb-ring orb-ring--2" />
                  <div class="orb-core">
                    <div class="eq">
                      <span v-for="i in 7" :key="i" class="eq-bar" :style="{ animationDelay: `${(i-1)*0.11}s` }" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Orbiting thought chips -->
              <div
                v-for="chip in thoughtChips"
                :key="chip.index"
                class="chip-orbit"
                :style="chip.style"
              >
                <div class="chip-inner">
                  <div class="chip">
                    <span class="chip-dot" />
                    <span class="chip-text">{{ chip.text }}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </section>

        <!-- Tape - scrolling voice note ribbon -->
        <div class="tape">
          <div class="tape-inner">
            <template v-for="(fragment, tapeIndex) in tapeFragments" :key="`tape-${tapeIndex}`">
              <span>{{ fragment }}</span>
              <span class="tape-dot">•</span>
            </template>
            <template v-for="(fragment, tapeIndex) in tapeFragments" :key="`tape-dup-${tapeIndex}`">
              <span>{{ fragment }}</span>
              <span class="tape-dot">•</span>
            </template>
          </div>
        </div>

        <!-- THE LOOP - how it works -->
        <section class="loop" id="how">
          <div class="section-head">
            <span class="mono-label" style="color: var(--mute)">§ 01 - The loop</span>
            <h2 class="display section-title">
              Today's ramble,<br>
              <em>today's posts.</em>
            </h2>
          </div>
          <div class="loop-grid">
            <div v-for="(step, i) in loopSteps" :key="i" class="loop-cell">
              <div class="loop-num mono-label">{{ step.n }}</div>
              <div class="loop-icon">
                <component :is="step.icon" :size="28" />
              </div>
              <div class="loop-title display">{{ step.title }}</div>
              <div class="loop-sub">{{ step.sub }}</div>
            </div>
          </div>
        </section>

        <!-- VOICE - sounds like you -->
        <section class="voice" id="voice">
          <div class="voice-grid">
            <div class="voice-copy">
              <span class="mono-label" style="color: var(--mute)">§ 02 - Your voice</span>
              <h2 class="display section-title">
                It sounds like you.<br>
                <em>Not like AI.</em>
              </h2>
              <p class="voice-lead">
                Everyone writes differently. The words you use. How long your sentences are.
                The little quirks. HeyPostrr learns yours in 4 minutes and keeps it forever.
              </p>
              <ul class="voice-bullets">
                <li>
                  <Sparkles :size="20" />
                  <div>
                    <b>Your words</b>
                    <span>Uses the words you actually say. No "unlock", "leverage", or "game-changer".</span>
                  </div>
                </li>
                <li>
                  <Activity :size="20" />
                  <div>
                    <b>Your rhythm</b>
                    <span>Matches how long your sentences are. Short stays short.</span>
                  </div>
                </li>
                <li>
                  <Fingerprint :size="20" />
                  <div>
                    <b>Your style</b>
                    <span>Keeps the one-word lines, the dashes, the half-jokes.</span>
                  </div>
                </li>
              </ul>
            </div>
            <div class="voice-compare">
              <div class="compare-card compare-card--bad">
                <div class="compare-head">
                  <span class="mono-label" style="color: var(--warn)">Generic AI output</span>
                  <AlertCircle :size="16" style="color:var(--warn)" />
                </div>
                <p>
                  Here are 5 game-changing ways to optimize your workflow and unlock peak productivity in today's fast-paced world.
                </p>
              </div>
              <div class="compare-arrow">
                <span class="hand">becomes</span>
                <svg viewBox="0 0 80 40" width="80" height="40">
                  <path d="M5 20 Q 40 5, 75 20" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" />
                  <path d="M68 14 L75 20 L68 26" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="compare-card compare-card--good">
                <div class="compare-head">
                  <span class="mono-label" style="color: var(--primary)">With HeyPostrr</span>
                  <CheckCircle :size="16" style="color:var(--primary)" />
                </div>
                <p>
                  I deleted 5 productivity apps this month.<br><br>
                  Got more done than ever.<br><br>
                  Turns out the best system is the one you actually use. Mine is a notebook.
                </p>
                <div class="compare-tags">
                  <span class="tag">your words</span>
                  <span class="tag">your rhythm</span>
                  <span class="tag">your voice</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- PLATFORMS - interactive tab strip -->
        <section class="platforms" id="platforms">
          <div class="section-head section-head--center">
            <span class="mono-label" style="color: var(--mute)">§ 03 - Platform-native</span>
            <h2 class="display section-title">
              One voice note.<br>
              <em>Four native drafts.</em>
            </h2>
            <p class="section-lede">
              Not the same post copy-pasted everywhere. One voice note becomes four different posts -
              each one written the way that platform actually works.
            </p>
          </div>

          <div class="platform-tabs">
            <button
              v-for="tab in platformTabs"
              :key="tab.id"
              :class="[
                'platform-tab',
                tab.id === 'threads' && activePlatform === tab.id ? 'platform-tab--active' : '',
                tab.id !== 'threads' ? 'platform-tab--soon' : '',
              ]"
              type="button"
              :disabled="tab.id !== 'threads'"
              @click="tab.id === 'threads' && (activePlatform = tab.id)"
            >
              <!-- Threads logo -->
              <svg v-if="tab.id === 'threads'" class="platform-tab-logo" viewBox="0 0 24 24" width="18" height="18">
                <path :fill="activePlatform === 'threads' ? '#fff' : 'currentColor'" d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z" />
              </svg>
              <!-- LinkedIn logo -->
              <svg v-else-if="tab.id === 'linkedin'" class="platform-tab-logo" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <!-- Instagram logo -->
              <svg v-else-if="tab.id === 'instagram'" class="platform-tab-logo" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
              </svg>
              <!-- X logo -->
              <svg v-else-if="tab.id === 'x'" class="platform-tab-logo" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M18.244 2H21l-6.53 7.464L22 22h-6.29l-4.933-6.44L5.06 22H2.303l6.98-7.977L2 2h6.412l4.462 5.9L18.244 2zm-1.103 18.25h1.71L7.04 3.62H5.2l11.94 16.63z" />
              </svg>
              {{ tab.label }}
              <span v-if="tab.id !== 'threads'" class="platform-tab__soon">Soon</span>
            </button>
          </div>

          <div class="platform-stage">
            <div class="platform-source">
              <div class="mono-label" style="color: rgba(255,255,255,0.55); margin-bottom: 8px">Today's voice note · 0:38</div>
              <div class="platform-waveform">
                <span v-for="(bar, i) in waveformBars" :key="i" :style="{ height: bar }" />
              </div>
              <div class="platform-transcript">
                "okay so I had three clients this week, all burned out. and every single one of them has this perfect morning routine. 5am, journal, cold shower, meditate. and I'm sitting there thinking - what if the routine is actually the thing exhausting them? like we've turned recovery into another thing to optimize..."
              </div>
            </div>
            <div class="platform-arrow">
              <svg viewBox="0 0 100 24" width="100" height="24">
                <path d="M4 12 L 92 12" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="3 4" stroke-linecap="round" />
                <path d="M85 6 L 92 12 L 85 18" fill="none" stroke="var(--line)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div :key="activePlatform" class="platform-output">

              <!-- THREADS mock -->
              <div v-if="activePlatform === 'threads'" class="mock mock--threads">
                <div class="mock-head">
                  <div class="mock-avatar" style="background:#000;display:flex;align-items:center;justify-content:center">
                    <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/></svg>
                  </div>
                  <div style="flex:1; min-width:0">
                    <div class="mock-name">
                      sara.wellness
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#999" stroke-width="2" style="margin-left:2px"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>
                      <span class="mock-time">2h</span>
                    </div>
                  </div>
                  <svg class="mock-more" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#999" stroke-width="2.2"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>
                </div>
                <div class="mock-body">
                  hot take: morning routines are making people more burned out, not less.<br><br>
                  every burned-out client I worked with this month had a "perfect" 5am ritual.<br><br>
                  more optimization isn't the answer. less noise is.
                </div>
                <div class="mock-actions mock-actions--threads">
                  <span class="mock-action-count"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#333" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> 847</span>
                  <span class="mock-action-count"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#333" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> 92</span>
                  <span class="mock-action-count"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#333" stroke-width="1.8"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> 318</span>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#333" stroke-width="1.8"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </div>
              </div>

              <!-- LINKEDIN mock -->
              <div v-else-if="activePlatform === 'linkedin'" class="mock mock--linkedin">
                <div class="mock-head">
                  <div class="mock-avatar" style="background: linear-gradient(135deg,#0A66C2,#4A90E2);display:flex;align-items:center;justify-content:center">
                    <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M7.5 9.5h-3v10h3v-10zm-1.5-4.5a1.75 1.75 0 100 3.5 1.75 1.75 0 000-3.5zm13.5 7.7c0-2.5-1.3-3.8-3-3.8-1.4 0-2 .75-2.4 1.3v-1.2h-3v10h3v-5.5c0-1 .15-2.3 1.55-2.3 1.4 0 1.55 1.3 1.55 2.3v5.5h3v-6z"/></svg>
                  </div>
                  <div>
                    <div class="mock-name">Sara | Wellness Coach</div>
                    <div class="mock-sub">Burnout Recovery · 1:1 Coaching</div>
                    <div class="mock-time">1h · <span style="font-size:10px">🌐</span></div>
                  </div>
                </div>
                <div class="mock-body mock-body--long">
                  Every client I've worked with this year showed up burned out.<br><br>
                  Every single one had a perfect morning routine.<br><br>
                  5am wake-up. Cold plunge. Journaling. Meditation. Workout.<br><br>
                  And they were exhausted.<br><br>
                  We've turned recovery into another performance metric. Your rest isn't a cheat day. It's the whole point.
                </div>
                <div class="mock-reactions">
                  <span class="mock-reactions-icons">
                    <em class="react-i" style="background:#378fe9">👍</em>
                    <em class="react-i" style="background:#df704d">❤</em>
                    <em class="react-i" style="background:#6dae4f">💡</em>
                  </span>
                  <span>318 · 41 comments</span>
                </div>
                <div class="mock-actions mock-actions--li">
                  <span class="mock-action">👍 Like</span>
                  <span class="mock-action">💬 Comment</span>
                  <span class="mock-action">↻ Repost</span>
                  <span class="mock-action">➤ Send</span>
                </div>
              </div>

              <!-- INSTAGRAM Reel mock -->
              <div v-else-if="activePlatform === 'instagram'" class="mock mock--instagram">
                <div class="mock-reel-bg" />
                <div class="mock-reel-content">
                  <div class="mock-reel-top">
                    <span>Instagram</span>
                  </div>
                  <div class="mock-reel-side">
                    <div class="mock-reel-side-item">
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      12.4k
                    </div>
                    <div class="mock-reel-side-item">
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                      432
                    </div>
                    <div class="mock-reel-side-item">
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                      1.2k
                    </div>
                  </div>
                  <div class="mock-reel-script">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:6px">on screen text</div>
                    <div style="font-size:22px;font-weight:900;line-height:1.2;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.6)">your routine<br>might be why<br>you're burnt out 😮‍💨</div>
                  </div>
                  <div class="mock-reel-caption">pov: you have a "perfect" morning routine and you're more exhausted than ever<br><br>your rest needs rest too. save this if you've been adding habits instead of removing pressure 👇<br><span style="opacity:0.65;font-size:0.65em">#burnout #wellnesscoach #morningroutine #selfcare</span></div>
                  <div class="mock-reel-meta">
                    <span class="dot" />
                    <span>sara.wellness · Original audio</span>
                  </div>
                </div>
              </div>

              <!-- X mock -->
              <div v-else-if="activePlatform === 'x'" class="mock mock--x">
                <div class="mock-head">
                  <div class="mock-avatar" style="background:#000;display:flex;align-items:center;justify-content:center">
                    <svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M18.244 2H21l-6.53 7.464L22 22h-6.29l-4.933-6.44L5.06 22H2.303l6.98-7.977L2 2h6.412l4.462 5.9L18.244 2zm-1.103 18.25h1.71L7.04 3.62H5.2l11.94 16.63z"/></svg>
                  </div>
                  <div style="flex:1; min-width:0">
                    <div class="mock-name">
                      Sara | Wellness Coach
                      <span class="mock-handle">@sara.wellness</span>
                      <span class="mock-dot">·</span>
                      <span class="mock-handle">Apr 18</span>
                    </div>
                  </div>
                </div>
                <div class="mock-body mock-body--x">
                  3 burned out clients this week.<br><br>
                  all 3 had a perfect morning routine.<br><br>
                  we've turned recovery into a performance metric and are surprised when rest doesn't feel restful anymore.<br><br>
                  the fix isn't another habit. it's one less.
                </div>
                <div class="mock-actions mock-actions--x">
                  <span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> 38</span>
                  <span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> 214</span>
                  <span style="color:#f91880"><svg viewBox="0 0 24 24" width="18" height="18" fill="#f91880"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> 1,247</span>
                  <span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span>
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- PRICING -->
        <section class="pricing" id="pricing">
          <div class="section-head section-head--center">
            <span class="mono-label" style="color: var(--mute)">§ 04 - Pricing</span>
            <h2 class="display section-title">
              Pays for itself.<br>
              <em>Somewhere around post #3.</em>
            </h2>
          </div>
          <div class="pricing-grid">
            <div v-for="(plan, i) in pricingPlans" :key="i" :class="['plan', plan.feature ? 'plan--feature' : '']">
              <div v-if="plan.feature" class="plan-flag mono-label">★ Recommended</div>
              <div class="mono-label plan-tag">{{ plan.tag }}</div>
              <div class="plan-name display">{{ plan.name }}</div>
              <div class="plan-price">
                <span class="plan-price-num display">{{ plan.price }}</span>
                <span class="plan-per">{{ plan.per }}</span>
              </div>
              <ul class="plan-list">
                <li v-for="(item, j) in plan.highlights" :key="j">
                  <CheckCircle :size="16" style="color:var(--primary)" />
                  {{ item }}
                </li>
              </ul>
              <button
                :class="plan.feature ? 'btn-primary plan-cta' : 'btn-outline plan-cta'"
                @click="goToAuth('register')"
              >
                {{ plan.cta }}
                <ArrowRight :size="14" />
              </button>
            </div>
          </div>
        </section>

        <!-- FINAL CTA -->
        <section class="final-cta">
          <!-- Decorative floating thought chips + geometric accents (dark-mode variant) -->
          <div class="final-decor" aria-hidden="true">
            <div class="final-chip final-chip--l1">
              <span class="chip-dot" />
              <span class="chip-text">spent 30 min overthinking that tweet</span>
            </div>
            <div class="final-chip final-chip--l2">
              <span class="chip-dot" />
              <span class="chip-text">notes app is 80% half-posts</span>
            </div>
            <div class="final-chip final-chip--l3">
              <span class="chip-dot" />
              <span class="chip-text">why is writing so hard when I know what I mean</span>
            </div>
            <div class="final-chip final-chip--r1">
              <span class="chip-dot" />
              <span class="chip-text">had an idea in the shower, forgot by noon</span>
            </div>
            <div class="final-chip final-chip--r2">
              <span class="chip-dot" />
              <span class="chip-text">should have just hit post</span>
            </div>
            <div class="final-chip final-chip--r3">
              <span class="chip-dot" />
              <span class="chip-text">draft #14 never shipped</span>
            </div>

            <!-- Geometric accents -->
            <svg class="final-ring final-ring--a" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-dasharray="2 6" />
            </svg>
            <svg class="final-ring final-ring--b" viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(192,132,252,0.35)" stroke-width="1" stroke-dasharray="1 4" />
            </svg>
            <span class="final-dot final-dot--a" />
            <span class="final-dot final-dot--b" />
            <span class="final-dot final-dot--c" />
            <svg class="final-squiggle" viewBox="0 0 120 20" aria-hidden="true">
              <path d="M2 10 Q 20 2, 40 10 T 80 10 T 118 10" fill="none" stroke="rgba(224,231,255,0.28)" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <svg class="final-plus" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1 L8 15 M1 8 L15 8" stroke="rgba(192,132,252,0.5)" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          </div>

          <div class="final-inner">
            <h2 class="display final-title">
              Your next post is<br>
              <em>already in your head.</em>
            </h2>
            <p class="final-sub">
              Talk for 60 seconds. We'll turn it into posts that sound just like you.
            </p>
            <!-- Arrow pointing DOWN from subtitle to button -->
            <div class="final-hand">
              <svg viewBox="0 0 40 64" width="28" height="48" aria-hidden="true">
                <path d="M20 4 L 20 52" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 4" />
                <path d="M12 42 L 20 54 L 28 42" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div class="final-cta-col">
              <button class="btn-primary btn-primary--big" @click="goToAuth('register')">
                <Mic :size="18" />
                Start talking
              </button>
              <span class="no-card-text no-card-text--dark">No credit card required</span>
            </div>
          </div>
        </section>

        <!-- FOOTER -->
        <footer class="footer">
          <div class="footer-base">
            <span class="mono-label">© 2026 HeyPostrr</span>
            <span class="footer-sep">·</span>
            <a href="#">Privacy</a>
            <span class="footer-sep">·</span>
            <a href="#">Terms</a>
          </div>
        </footer>
      </div>

      <!-- AUTH MODAL OVERLAY -->
      <div v-if="showAuth" class="auth-overlay" @click="closeAuth">
        <div class="auth-card" @click.stop>
          <button class="auth-close" @click="closeAuth">
            <X :size="20" />
          </button>
          <div class="auth-brand">
            <div class="brand-mark brand-mark--big"><div class="brand-mark-inner" /></div>
            <div class="display auth-title">{{ authMode === 'register' ? 'Start free.' : 'Welcome back.' }}</div>
            <div class="auth-subtitle">{{ authMode === 'register' ? 'Your next post is already in your head.' : 'Ready to talk?' }}</div>
          </div>
          <div class="auth-tabs">
            <button :class="['auth-tab', authMode === 'login' ? 'auth-tab--active' : '']" @click="goToAuth('login')">Sign in</button>
            <button :class="['auth-tab', authMode === 'register' ? 'auth-tab--active' : '']" @click="goToAuth('register')">Create account</button>
          </div>

          <button type="button" class="auth-threads-btn" @click="signInWithThreads">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/>
            </svg>
            Continue with Threads
          </button>

          <div class="auth-divider"><span>or</span></div>

          <p v-if="threadsLoginError" class="auth-error-msg">{{ threadsLoginError }}</p>

          <form class="auth-form" @submit.prevent="handleAuthSubmit">
            <label v-if="authMode === 'register'" class="auth-field">
              <span>Name</span>
              <input v-model="authName" type="text" placeholder="Your name" required />
            </label>
            <label class="auth-field">
              <span>Email</span>
              <input v-model="authEmail" type="email" placeholder="you@example.com" required />
            </label>
            <label class="auth-field">
              <span>Password</span>
              <input v-model="authPassword" type="password" placeholder="••••••••" required minlength="8" />
            </label>
            <p v-if="authError" class="auth-error-msg">{{ authError }}</p>
            <button type="submit" class="btn-primary auth-submit" :disabled="authLoading">
              <span v-if="authLoading" class="auth-card__spinner" />
              {{ authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account' }}
              <ArrowRight v-if="!authLoading" :size="16" />
            </button>
          </form>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { ArrowRight, Mic, Filter, SlidersHorizontal, Rocket, Sparkles, Activity, Fingerprint, AlertCircle, CheckCircle, X } from 'lucide-vue-next';

definePageMeta({ layout: false });

useHead({
  title: 'HeyPostrr - Your thoughts, posted.',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&family=Caveat:wght@400;600&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block',
    },
  ],
});

const router = useRouter();
const route = useRoute();
const config = useRuntimeConfig();
const baseURL = config.public.apiBaseUrl as string;

const activePlatform = ref('threads');

const authState = useState<boolean | null>('auth:authenticated', () => null);

const { data: authResult } = await useAsyncData('home-auth', async () => {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : {};
  try {
    await $fetch(`${baseURL}/api/onboarding/session`, { credentials: 'include', headers });
    return true;
  } catch {
    return false;
  }
});

authState.value = authResult.value ?? false;

const isLoggedIn = computed(() => authState.value === true);

const showAuth = computed(() =>
  !isLoggedIn.value && (route.query.mode === 'register' || route.query.mode === 'login'),
);
const authMode = computed<'login' | 'register'>(() =>
  route.query.mode === 'login' ? 'login' : 'register',
);

const authName = ref('');
const authEmail = ref('');
const authPassword = ref('');
const authError = ref('');
const authLoading = ref(false);

function goToAuth(mode: 'login' | 'register') {
  router.push(`/?mode=${mode}`);
}

function closeAuth() {
  router.push('/');
}

const threadsLoginError = computed<string>(() => {
  const errorCode = route.query.threads_login_error;
  if (!errorCode) return '';
  const messages: Record<string, string> = {
    access_denied: 'Threads access was denied.',
    invalid_state: 'Login session expired. Please try again.',
    login_failed: "We couldn't finish the Threads login. Please try again.",
  };
  return messages[errorCode as string] ?? 'Threads login failed.';
});

function signInWithThreads() {
  window.location.href = `${baseURL}/api/threads/login`;
}

async function handleAuthSubmit() {
  authError.value = '';
  authLoading.value = true;
  try {
    if (authMode.value === 'register') {
      await $fetch(`${baseURL}/api/auth/sign-up/email`, {
        method: 'POST',
        body: { name: authName.value, email: authEmail.value, password: authPassword.value },
        credentials: 'include',
      });
    } else {
      await $fetch(`${baseURL}/api/auth/sign-in/email`, {
        method: 'POST',
        body: { email: authEmail.value, password: authPassword.value },
        credentials: 'include',
      });
    }
    authState.value = null;
    const data = await $fetch<{ session: { completedAt: string | null } | null }>(
      `${baseURL}/api/onboarding/session`,
      { credentials: 'include' },
    );
    router.replace(data.session?.completedAt ? '/dashboard' : '/onboarding');
  } catch (err: unknown) {
    const apiError = err as { data?: { message?: string } };
    authError.value = apiError?.data?.message || 'Something went wrong. Please try again.';
  } finally {
    authLoading.value = false;
  }
}


// ─── Static data ───────────────────────────────────────────────

const THOUGHTS = [
  "ok so the airport layover yesterday made me realize",
  "I think my pricing page is totally wrong",
  "nobody talks about the boring part between launch and getting users",
  "what if I just shared the whole messy process",
  "my best ideas always come mid-walk, why is that",
  "writing is thinking slowed down enough to catch yourself",
  "hot take - most advice online is just someone's story in disguise",
  "I was in the shower and realized we built the wrong feature",
  "also - reply to Cheyenne about the timeline, she's waiting",
  "don't forget: call mom",
  "maybe post about what happened at the coffee meeting",
  "everyone's talking about AI but nobody's talking about taste",
  "the real secret is just showing up when nobody cares yet",
];

const thoughtChips = computed(() =>
  THOUGHTS.map((text, index) => {
    const seed = index * 137.5;
    const radius = 210 + ((index * 73) % 80);
    const angle0 = seed % 360;
    const duration = 28 + (index % 5) * 4;
    const delay = -(index * 1.4);
    const rot = ((index * 17) % 16) - 8;
    const size = 0.84 + ((index * 31) % 40) / 100;
    const pullDelay = 8 + (index % 6) * 1.6;
    return {
      text,
      index,
      style: {
        '--r': `${radius}px`,
        '--a0': `${angle0}deg`,
        '--dur': `${duration}s`,
        '--delay': `${delay}s`,
        '--pull-delay': `${pullDelay}s`,
        '--tilt': `${rot}deg`,
        '--scale': `${size}`,
        '--entrance-delay': `${1.4 + index * 0.18}s`,
      },
    };
  }),
);

const waveformBars = computed(() =>
  Array.from({ length: 42 }).map((_, i) => `${12 + Math.abs(Math.sin(i * 0.7)) * 26}px`),
);

const loopSteps: { n: string; title: string; sub: string; icon: Component }[] = [
  { n: '01', title: 'Talk',       sub: 'Just say what\'s on your mind. Walking, driving, showering - doesn\'t matter.',   icon: Mic },
  { n: '02', title: 'We listen',  sub: 'We find ideas. We suggest 2-3 posts worth making. You pick.',                     icon: Filter },
  { n: '03', title: 'We write',   sub: 'Each idea becomes a post made for its platform. Long for LinkedIn. Short for X.', icon: SlidersHorizontal },
  { n: '04', title: 'You post',   sub: 'Tap to approve. We post it, schedule it, or save the draft for later.',           icon: Rocket },
];

const tapeFragments = [
  'ok so three clients this week all said the same thing and I started noticing...',
  'been thinking about why my last launch flopped and it\'s not what I thought...',
  'unpopular opinion but I think most productivity advice is cope...',
  'had a call with Sarah and she said something that\'s been stuck in my head...',
  'noticed my best posts are the ones I almost didn\'t publish...',
  'spent an hour today on something I should have said no to...',
  'everyone\'s talking about AI agents but nobody\'s shipping them to real users...',
  'the thing that actually moved the needle wasn\'t on my roadmap...',
  'three different people asked me the same question this week...',
  'I keep telling founders to ship and then I spent 3 weeks not shipping...',
];

const platformTabs = [
  { id: 'threads',   label: 'Threads' },
  { id: 'linkedin',  label: '' },
  { id: 'instagram', label: '' },
  { id: 'x',         label: '' },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    per: '/month',
    tag: 'Try it',
    highlights: ['Casual usage', 'Threads posting', 'Full voice matching'],
    cta: 'Start free',
    feature: false,
  },
  {
    name: 'Creator',
    price: '$20',
    per: '/month',
    tag: 'Most creators pick this',
    highlights: ['Daily posting', 'Threads posting', 'Full voice matching', 'Schedule posts'],
    cta: 'Get started',
    feature: true,
  },
  {
    name: 'Pro',
    price: '$40',
    per: '/month',
    tag: 'For daily posters',
    highlights: ['Multiple posts per day', 'Threads posting', 'Full voice matching', 'Schedule posts', 'Priority support'],
    cta: 'Get started',
    feature: false,
  },
];
</script>

<style>
/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════ */
:root {
  --primary: #3525cd;
  --primary-600: #4f46e5;
  --primary-fixed: #e2dfff;
  --primary-fixed-dim: #c3c0ff;
  --on-primary-fixed: #0f0069;
  --surface: #f7f5f0;
  --surface-ink: #1a1824;
  --surface-dim: #ede9df;
  --surface-card: #ffffff;
  --line: #1a1824;
  --mute: #6a6678;
  --accent: #8b5cf6;
  --accent-2: #c084fc;
  --accent-3: #e2dfff;
  --teal: #006a61;
  --warn: #e66a3a;
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  background: var(--surface);
  color: var(--surface-ink);
  font-family: 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
  max-width: 100vw;
}

/* Paper grain overlay */
body::before {
  content: '';
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0 0.15  0 0 0 0.035 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.9;
  pointer-events: none;
  z-index: 1;
  mix-blend-mode: multiply;
}

a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; border: none; background: none; padding: 0; color: inherit; }

.display { font-family: 'Instrument Serif', serif; font-weight: 400; letter-spacing: -0.015em; line-height: 0.98; }
.display em { font-style: italic; }
.hand { font-family: 'Caveat', cursive; }
.mono-label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.22em; text-transform: uppercase;
}

#__nuxt { position: relative; z-index: 2; }
.page { position: relative; }

/* ═══════════════════════════════════════════════════════
   BUTTONS
   ═══════════════════════════════════════════════════════ */
.btn-ghost {
  padding: 9px 16px; border-radius: 999px;
  font-size: 14px; font-weight: 600; color: var(--surface-ink);
  transition: background 0.15s;
}
.btn-ghost:hover { background: rgba(26, 24, 36, 0.06); }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border-radius: 999px;
  background: var(--surface-ink); color: #fff;
  font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 14px;
  transition: transform 0.12s, background 0.15s;
}
.btn-primary:hover { background: var(--primary); transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

.btn-primary--big {
  padding: 16px 28px; font-size: 16px;
  box-shadow: 0 10px 28px rgba(26, 24, 36, 0.18);
}

.btn-outline {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border-radius: 999px;
  background: transparent; color: var(--surface-ink);
  border: 1.5px solid var(--surface-ink);
  font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 14px;
  transition: background 0.15s, color 0.15s;
}
.btn-outline:hover { background: var(--surface-ink); color: #fff; }

/* ═══════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════ */
.nav {
  position: sticky; top: 0; z-index: 40;
  background: rgba(247, 245, 240, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(26, 24, 36, 0.07);
}
.nav-inner {
  max-width: 1280px; margin: 0 auto;
  padding: 18px 40px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 32px;
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand-mark {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-600), var(--accent), var(--accent-2));
  position: relative; overflow: hidden;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}
.brand-mark-inner {
  position: absolute; inset: 4px;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7), transparent 50%);
  border-radius: 50%;
}
.brand-mark--big { width: 40px; height: 40px; }
.brand-name {
  font-family: 'Manrope', sans-serif;
  font-weight: 800; font-size: 18px; letter-spacing: -0.02em;
}
.nav-links { display: flex; gap: 28px; }
.nav-links a {
  font-size: 14px; font-weight: 500; opacity: 0.7;
  transition: opacity 0.15s;
}
.nav-links a:hover { opacity: 1; }
.nav-cta { display: flex; align-items: center; gap: 10px; }

/* ═══════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════ */
.hero {
  position: relative;
  padding: 64px 32px 40px;
  max-width: 1280px; margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  overflow: visible;
}
.hero-copy {
  position: relative; z-index: 2;
  max-width: 620px;
  grid-column: 1; grid-row: 1;
}
.eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 14px; border-radius: 999px;
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(26, 24, 36, 0.1);
  margin-bottom: 32px;
  backdrop-filter: blur(8px);
}
.eyebrow-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 3px rgba(53, 37, 205, 0.2);
  animation: pulse-dot 2s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 3px rgba(53, 37, 205, 0.2); }
  50% { box-shadow: 0 0 0 6px rgba(53, 37, 205, 0.08); }
}
.hero-title {
  font-size: clamp(56px, 7.2vw, 110px);
  margin: 0 0 28px;
  overflow: visible;
  padding: 0 20px 10px;
  margin-left: -20px;
  margin-right: -20px;
}
.hero-title em {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text; background-clip: text; color: transparent;
  display: inline-block; padding: 0 18px 8px; margin: 0 -18px;
}
.hero-sub {
  font-size: 20px; line-height: 1.55;
  max-width: 520px; margin: 0 0 44px;
  opacity: 0.82;
}
.underline-scribble {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 12'><path d='M2 8 Q 30 2, 60 7 T 118 5' fill='none' stroke='%233525cd' stroke-width='2' stroke-linecap='round'/></svg>");
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 100% 10px;
  padding-bottom: 6px;
  font-style: italic;
  font-family: 'Instrument Serif', serif;
}
.hero-ctas { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
.hero-cta-col { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.no-card-text {
  font-size: 12px; color: var(--mute);
  font-family: 'Manrope', sans-serif; font-weight: 500;
  letter-spacing: 0.01em;
}
.no-card-text--dark { color: rgba(255,255,255,0.5); }

/* Stage */
.stage {
  position: relative; z-index: 4;
  pointer-events: none;
  aspect-ratio: 1 / 1;
  width: 100%; max-width: 680px;
  justify-self: end;
  margin-right: -20px;
  overflow: visible;
  grid-column: 2; grid-row: 1;
}
.stage-inner { position: absolute; inset: 0; overflow: visible; }

/* Orb */
.orb-wrap {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 220px; height: 220px;
  z-index: 3;
  animation: orb-enter 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes orb-enter {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.75); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.orb-halo {
  position: absolute; inset: -60px; border-radius: 50%;
  background: radial-gradient(circle, rgba(139,92,246,0.3), transparent 60%);
  filter: blur(40px);
  animation: halo-pulse 4s ease-in-out infinite;
}
.orb-halo--2 {
  inset: -20px;
  background: radial-gradient(circle, rgba(79,70,229,0.4), transparent 55%);
  animation-delay: -2s;
}
@keyframes halo-pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}
.orb {
  position: relative; width: 100%; height: 100%;
  border-radius: 50%;
  background: linear-gradient(-45deg, #4f46e5, #8b5cf6, #c084fc, #e0e7ff);
  background-size: 400% 400%;
  animation: orb-fluid 10s ease infinite;
  border: 5px solid rgba(255,255,255,0.5);
  box-shadow: 0 30px 60px rgba(53,37,205,0.25), inset 0 0 60px rgba(255,255,255,0.2);
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
@keyframes orb-fluid {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.orb-sheen {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55), transparent 45%);
  mix-blend-mode: overlay;
}
.orb-ring {
  position: absolute; width: 100%; height: 100%;
  border: 1.5px dashed rgba(255,255,255,0.35);
  border-radius: 50%;
  animation: ring-rot 18s linear infinite;
}
.orb-ring--2 {
  width: 78%; height: 78%;
  border-color: rgba(255,255,255,0.22);
  border-style: dotted;
  animation: ring-rot 12s linear infinite reverse;
}
@keyframes ring-rot {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.orb-core {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  width: 60%; height: 60%;
}
.eq { display: flex; align-items: center; gap: 5px; height: 54px; }
.eq-bar {
  width: 5px; border-radius: 3px;
  background: rgba(255,255,255,0.92);
  animation: eq-bounce 1.1s ease-in-out infinite;
  height: 22px;
}
@keyframes eq-bounce {
  0%, 100% { height: 22px; opacity: 0.6; }
  50% { height: 54px; opacity: 1; }
}

/* Orbiting thought chips - 3-phase entrance */
.chip-orbit {
  position: absolute; top: 50%; left: calc(50% - 100px);
  width: 0; height: 0;
  /* Phase order: entrance (once) → orbit (∞) → pull-fade (∞) */
  animation-name: chip-entrance, chip-orbit, chip-pull;
  animation-duration: 0.55s, var(--dur), 28s;
  animation-timing-function: ease-out, linear, ease-in;
  animation-iteration-count: 1, infinite, infinite;
  animation-delay: var(--entrance-delay), var(--delay), var(--pull-delay);
  /* both = start hidden before entrance, stay visible after */
  animation-fill-mode: both, none, none;
}
@keyframes chip-entrance {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes chip-orbit {
  from { transform: rotate(var(--a0)) translateX(var(--r)) rotate(calc(-1 * var(--a0))); }
  to   { transform: rotate(calc(var(--a0) + 360deg)) translateX(var(--r)) rotate(calc(-1 * var(--a0) - 360deg)); }
}
@keyframes chip-pull {
  0%, 80%  { opacity: 1; }
  92%      { opacity: 0.7; }
  95%      { opacity: 0; }
  95.01%   { opacity: 0; }
  100%     { opacity: 1; }
}
.chip-inner {
  transform: scale(var(--scale, 1));
  animation: chip-pull-scale 28s ease-in infinite;
  animation-delay: var(--pull-delay);
}
@keyframes chip-pull-scale {
  0%, 80% { transform: scale(var(--scale, 1)); filter: blur(0); }
  92%     { transform: scale(0.15); filter: blur(2px); }
  95%     { transform: scale(0.05); filter: blur(4px); opacity: 0; }
  95.01%  { transform: scale(var(--scale, 1)); filter: blur(0); opacity: 0; }
  100%    { transform: scale(var(--scale, 1)); filter: blur(0); opacity: 1; }
}
.chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 13px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(26,24,36,0.12);
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(26,24,36,0.08);
  font-family: 'Caveat', cursive;
  font-size: 18px;
  color: var(--surface-ink);
  white-space: nowrap;
  transform: rotate(var(--tilt));
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--primary); opacity: 0.6; flex-shrink: 0;
}

/* Post cards that emerge from orb - sequential reveal */
.post {
  position: absolute; width: 250px;
  opacity: 0; transform: scale(0.6);
  animation: post-reveal 18s ease-out infinite;
  animation-fill-mode: both;
  z-index: 4;
}
/* Staggered positive delays so cards appear one by one after chips */
.post--tr { top: 2%;   right: 0%;  animation-delay: 3.5s; }
.post--br { bottom: 4%; right: 4%; animation-delay: 5.5s; }
.post--bl { bottom: 6%; left: 0%;  animation-delay: 7.5s; }
.post--tl { top: 8%;   left: 4%;   animation-delay: 9.5s; }
@keyframes post-reveal {
  0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
  10%  { opacity: 1; transform: scale(1) translateY(0); }
  75%  { opacity: 1; transform: scale(1) translateY(0); }
  85%  { opacity: 0; transform: scale(0.7) translateY(-12px); }
  100% { opacity: 0; transform: scale(0.5) translateY(10px); }
}
@keyframes post-card-in {
  from { opacity: 0; transform: scale(0.94) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.post-card {
  animation: post-card-in 0.5s ease-out both;
  background: #fff;
  border: 1px solid rgba(26,24,36,0.09);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 14px 40px rgba(26,24,36,0.12), 0 2px 6px rgba(26,24,36,0.04);
  font-family: 'Inter', sans-serif;
}
.post-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.post-head-text { flex: 1; min-width: 0; }
.post-author { font-weight: 700; font-size: 13px; }
.post-meta { font-size: 11px; color: var(--mute); }
.post-body {
  font-size: 13px; line-height: 1.5; white-space: pre-line;
  color: var(--surface-ink);
}
.pg {
  width: 30px; height: 30px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: 'Manrope', sans-serif; font-weight: 800;
  font-size: 14px; color: #fff; flex-shrink: 0;
}
.pg-linkedin  { background: #0a66c2; font-size: 13px; }
.pg-threads   { background: #000; font-size: 16px; }
.pg-instagram { background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
.pg-x         { background: #000; font-size: 15px; }

/* Tape ribbon */
.tape {
  position: relative; left: -8%;
  width: 116%; padding: 18px 0;
  margin-top: 50px;
  background: linear-gradient(135deg, var(--surface-ink), #2d2a3c);
  color: #fff;
  transform: rotate(-2deg);
  z-index: 3; overflow: hidden;
  box-shadow: 0 14px 30px rgba(26,24,36,0.18);
}
.tape-inner {
  display: flex; gap: 36px; white-space: nowrap;
  animation: tape-scroll 40s linear infinite;
  font-family: 'Instrument Serif', serif;
  font-size: 20px; font-style: italic; opacity: 0.92;
}
.tape-inner > span { flex-shrink: 0; }
.tape-dot { color: var(--accent-2); font-size: 14px; }
@keyframes tape-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* ═══════════════════════════════════════════════════════
   SECTIONS - shared
   ═══════════════════════════════════════════════════════ */
.section-head {
  max-width: 1280px; margin: 0 auto;
  padding: 0 40px; margin-bottom: 40px;
}
.section-head--center { text-align: center; }
.section-title {
  font-size: clamp(52px, 7vw, 96px);
  margin: 16px 0 0;
}
.section-title em {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.section-lede {
  max-width: 620px; margin: 20px auto 0;
  font-size: 17px; line-height: 1.55; color: var(--mute);
}

/* ═══════════════════════════════════════════════════════
   LOOP
   ═══════════════════════════════════════════════════════ */
.loop { padding: 72px 0 40px; position: relative; }
.loop-grid {
  max-width: 1280px; margin: 0 auto; padding: 0 40px;
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 20px; position: relative;
}
.loop-grid::before {
  content: ''; position: absolute;
  top: 58px; left: 12%; right: 12%;
  height: 1px;
  background-image: linear-gradient(to right, var(--line) 50%, transparent 0%);
  background-size: 8px 1px; background-repeat: repeat-x;
  z-index: 0; opacity: 0.25;
}
.loop-cell {
  position: relative;
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(26,24,36,0.08);
  border-radius: 20px; padding: 28px 24px 32px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.loop-cell:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(26,24,36,0.08); }
.loop-num { color: var(--mute); margin-bottom: 12px; }
.loop-icon {
  width: 56px; height: 56px; border-radius: 16px;
  background: linear-gradient(135deg, var(--primary-fixed), var(--primary-fixed-dim));
  color: var(--primary);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px; position: relative; z-index: 1;
}
.loop-cell:nth-child(even) .loop-icon {
  background: linear-gradient(135deg, #ffe5d7, #ffc5a3);
  color: var(--warn);
}
.loop-title { font-size: 36px; margin: 0 0 10px; }
.loop-sub { font-size: 14px; line-height: 1.5; color: var(--mute); }

/* ═══════════════════════════════════════════════════════
   VOICE
   ═══════════════════════════════════════════════════════ */
.voice { padding: 72px 40px; max-width: 1280px; margin: 0 auto; }
.voice-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 80px; align-items: center; }
.voice-copy .section-title { font-size: clamp(44px, 5.5vw, 76px); margin: 14px 0 24px; }
.voice-lead { font-size: 17px; line-height: 1.6; color: var(--mute); margin: 0 0 32px; }
.voice-bullets { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 24px; }
.voice-bullets li { display: flex; gap: 16px; align-items: flex-start; }
.voice-bullets li > svg {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px;
  background: var(--primary-fixed); color: var(--primary);
  padding: 10px;
}
.voice-bullets li > div b { display: block; font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.voice-bullets li > div span { font-size: 14px; color: var(--mute); line-height: 1.5; }
.voice-compare { display: flex; flex-direction: column; gap: 8px; }
.compare-card { background: #fff; border-radius: 24px; padding: 24px 26px; position: relative; }
.compare-card--bad {
  border: 1px solid rgba(230,106,58,0.28);
  background: rgba(255,250,247,0.9);
}
.compare-card--good {
  border: 1px solid rgba(53,37,205,0.28);
  background: linear-gradient(180deg, #fff, #f5f3ff);
  box-shadow: 0 20px 40px rgba(53,37,205,0.1);
}
.compare-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.compare-card p { margin: 0; font-size: 16px; line-height: 1.6; }
.compare-card--bad p { color: var(--mute); font-style: italic; }
.compare-card--good p { color: var(--surface-ink); font-weight: 500; font-size: 18px; line-height: 1.65; }
.compare-tags { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.tag {
  padding: 4px 10px; border-radius: 999px;
  background: var(--primary-fixed); color: var(--primary);
  font-size: 11px; font-weight: 600; font-family: 'Manrope', sans-serif;
}
.compare-arrow {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; padding: 6px 0;
}
.compare-arrow .hand { font-size: 22px; color: var(--primary); }

/* ═══════════════════════════════════════════════════════
   PLATFORMS
   ═══════════════════════════════════════════════════════ */
.platforms { padding: 72px 40px; max-width: 1280px; margin: 0 auto; }
.platform-tabs {
  display: flex; justify-content: center; gap: 6px;
  margin-bottom: 40px; padding: 6px; border-radius: 999px;
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(26,24,36,0.08);
  width: fit-content; margin-left: auto; margin-right: auto;
}
.platform-tab--soon {
  cursor: not-allowed;
  color: rgba(106, 102, 120, 0.6);
  background: transparent;
  opacity: 0.7;
}
.platform-tab--soon:hover { color: rgba(106, 102, 120, 0.6); }
.platform-tab__soon {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(26, 24, 36, 0.08);
  color: var(--mute);
}
.platform-tab {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 999px;
  font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 14px;
  color: var(--mute); transition: all 0.15s;
}
.platform-tab-logo { flex-shrink: 0; }
.platform-tab:hover { color: var(--surface-ink); }
.platform-tab--active {
  background: var(--surface-ink); color: #fff;
  box-shadow: 0 4px 12px rgba(26,24,36,0.18);
}
.platform-tab--active:hover { color: #fff; }
.platform-stage {
  display: grid; grid-template-columns: 1fr 100px 1fr;
  gap: 16px; align-items: center;
}
.platform-source, .platform-output {
  background: #fff;
  border: 1px solid rgba(26,24,36,0.08);
  border-radius: 24px;
  min-height: 280px;
}
.platform-source {
  padding: 24px 28px;
  background: var(--surface-ink); color: #fff;
  border-color: var(--surface-ink);
}
.platform-output { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.platform-waveform {
  display: flex; align-items: center; gap: 3px;
  height: 44px; margin-bottom: 18px;
}
.platform-waveform span { flex: 1; min-width: 2px; max-width: 8px; background: var(--accent-2); border-radius: 2px; opacity: 0.8; }
.platform-transcript {
  font-family: 'Instrument Serif', serif; font-size: 20px;
  line-height: 1.4; font-style: italic;
  color: rgba(255,255,255,0.88);
}
.platform-arrow { display: flex; justify-content: center; align-items: center; }

/* Platform mock cards */
.mock {
  display: flex; flex-direction: column; flex: 1;
  font-family: -apple-system, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  font-size: 14px; line-height: 1.35; color: #0f1419; background: #fff;
}
.mock-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px 10px; }
.mock-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 14px;
}
.mock-name {
  font-weight: 700; font-size: 14px;
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
}
.mock-handle { color: #536471; font-weight: 400; font-size: 13px; }
.mock-time { color: #999; font-weight: 400; font-size: 13px; margin-left: 2px; }
.mock-dot { color: #71767b; margin: 0 2px; }
.mock-sub { color: #536471; font-size: 12px; margin-top: 1px; line-height: 1.3; }
.mock-more { color: #536471; padding: 0 4px; }
.mock-body { padding: 0 16px 12px; font-size: 15px; line-height: 1.45; }
.mock-body b, .mock-body strong { font-weight: 700; }
.mock-body--long { min-height: 130px; }
.mock-actions {
  display: flex; align-items: center;
  padding: 4px 12px 10px; color: #536471;
}
.mock-action { display: flex; align-items: center; gap: 6px; padding: 6px 10px; flex: 1; font-size: 13px; }

/* Threads variant */
.mock--threads .mock-head { padding: 14px 16px 6px; }
.mock--threads .mock-name { font-size: 15px; }
.mock--threads .mock-body { font-size: 15px; color: #0f1419; padding: 0 16px 14px 64px; }
.mock--threads .mock-actions { padding: 4px 16px 14px 64px; gap: 18px; color: #333; }
.mock-actions--threads { display: flex; align-items: center; gap: 16px; }
.mock-action-count { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: #555; }

/* LinkedIn variant */
.mock--linkedin .mock-reactions {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 16px; font-size: 13px; color: #536471;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.mock--linkedin .mock-reactions-icons { display: inline-flex; align-items: center; margin-right: 6px; }
.react-i {
  width: 18px; height: 18px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; font-style: normal;
  border: 1.5px solid #fff; margin-left: -5px;
}
.mock--linkedin .mock-reactions-icons .react-i:first-child { margin-left: 0; }
.mock-actions--li { justify-content: space-around; padding: 4px 8px 12px; flex-wrap: nowrap; }
.mock-actions--li .mock-action { flex: 1; justify-content: center; font-weight: 600; }

/* X / Twitter light mode */
.mock--x { background: #fff; color: #0f1419; }
.mock--x .mock-head { padding: 14px 16px 6px; align-items: flex-start; }
.mock--x .mock-name { color: #0f1419; font-size: 15px; }
.mock--x .mock-handle { color: #536471; font-size: 15px; }
.mock-body--x { padding: 2px 16px 12px 64px; font-size: 15px; line-height: 1.45; color: #0f1419; }
.mock-actions--x {
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 16px 14px 64px; color: #536471; gap: 0; max-width: 100%;
}
.mock-actions--x span { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }

/* Instagram Reel variant */
.mock--instagram {
  background: #000; color: #fff;
  position: relative; aspect-ratio: auto;
  min-height: 280px; border-radius: 24px; overflow: hidden;
}
.mock--instagram .mock-reel-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(201,169,233,0.35) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(139,127,232,0.3) 0%, transparent 55%),
    linear-gradient(180deg, #2a1f3d 0%, #1a1428 100%);
}
.mock--instagram .mock-reel-content {
  position: relative; z-index: 2;
  display: flex; flex-direction: column;
  height: 100%; min-height: 280px; padding: 16px;
}
.mock--instagram .mock-reel-top {
  display: flex; justify-content: space-between;
  color: #fff; font-weight: 700; font-size: 16px;
}
.mock--instagram .mock-reel-script {
  flex: 1; display: flex; flex-direction: column; justify-content: center;
  padding: 8px 0;
}
.mock--instagram .mock-reel-caption {
  margin-top: auto;
  font-size: 13px; line-height: 1.5; font-weight: 500;
  max-width: 85%; color: rgba(255,255,255,0.9);
}
.mock--instagram .mock-reel-meta {
  display: flex; align-items: center; gap: 8px;
  margin-top: 10px; font-size: 13px; font-weight: 600;
}
.mock--instagram .mock-reel-meta .dot {
  width: 24px; height: 24px; border-radius: 50%;
  background: linear-gradient(135deg, #C9A9E9, #8B7FE8);
}
.mock--instagram .mock-reel-side {
  position: absolute; right: 14px; bottom: 80px;
  display: flex; flex-direction: column; gap: 18px;
  align-items: center; color: #fff;
}
.mock--instagram .mock-reel-side-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600;
}

/* ═══════════════════════════════════════════════════════
   PRICING
   ═══════════════════════════════════════════════════════ */
.pricing { padding: 72px 40px 96px; max-width: 1280px; margin: 0 auto; }
.pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; }
.plan {
  position: relative; background: #fff;
  border: 1px solid rgba(26,24,36,0.08);
  border-radius: 28px; padding: 36px 32px 40px;
  display: flex; flex-direction: column;
  transition: transform 0.2s;
}
.plan:hover { transform: translateY(-4px); }
.plan--feature {
  background: var(--surface-ink); color: #fff;
  border-color: var(--surface-ink);
  box-shadow: 0 30px 60px rgba(26,24,36,0.22);
  transform: scale(1.03);
}
.plan--feature:hover { transform: scale(1.03) translateY(-4px); }
.plan-flag {
  position: absolute; top: -12px; right: 24px;
  background: var(--primary); color: #fff;
  padding: 6px 14px; border-radius: 999px; font-size: 10px !important;
}
.plan-tag { color: var(--mute); margin-bottom: 16px; font-size: 10px !important; }
.plan--feature .plan-tag { color: rgba(255,255,255,0.55); }
.plan-name { font-size: 32px; margin-bottom: 20px; }
.plan-price { display: flex; align-items: baseline; gap: 6px; margin-bottom: 28px; }
.plan-price-num { font-size: 60px; line-height: 1; }
.plan-per { font-size: 14px; color: var(--mute); }
.plan--feature .plan-per { color: rgba(255,255,255,0.6); }
.plan-list {
  list-style: none; padding: 0; margin: 0 0 28px;
  display: flex; flex-direction: column; gap: 12px; flex: 1;
}
.plan-list li { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; line-height: 1.45; }
.plan--feature .plan-list li > svg { color: var(--accent-2); }
.plan-cta { justify-content: center; width: 100%; }
.plan--feature .plan-cta { background: #fff; color: var(--surface-ink); }
.plan--feature .plan-cta:hover { background: var(--accent-2); color: #fff; }

/* ═══════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════ */
.final-cta {
  position: relative; padding: 96px 40px 112px;
  text-align: center; background: var(--surface-ink); color: #fff;
  overflow: hidden; margin: 32px; border-radius: 40px;
}
.final-cta::before {
  content: ''; position: absolute;
  top: -200px; left: 50%; width: 800px; height: 800px;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(139,92,246,0.4), transparent 60%);
  filter: blur(60px); pointer-events: none;
}
.final-inner { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
.final-title { font-size: clamp(56px, 8vw, 108px); margin: 0 0 24px; color: #fff; }
.final-title em {
  background: linear-gradient(135deg, #c084fc, #e0e7ff);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.final-sub { font-size: 18px; line-height: 1.5; color: rgba(255,255,255,0.72); max-width: 520px; margin: 0 auto 48px; }
.final-cta .btn-primary--big { background: #fff; color: var(--surface-ink); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
.final-cta .btn-primary--big:hover { background: var(--primary); color: #fff; }
/* Arrow between subtitle and button, pointing down */
.final-hand {
  display: flex; justify-content: center; align-items: center;
  margin: 0 0 16px;
}
.final-cta-col {
  display: inline-flex; flex-direction: column; align-items: center; gap: 12px;
}

/* Decorative thought chips + geometric accents scattered around the CTA.
   Pinned absolutely so they sit behind the copy (z-index 0) and don't take
   layout flow. Each element has its own float/drift animation with staggered
   delay so the block feels alive without competing with the CTA. */
.final-decor {
  position: absolute; inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}
.final-chip {
  position: absolute;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 13px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  font-family: 'Caveat', cursive;
  font-size: 17px;
  color: rgba(255, 255, 255, 0.78);
  white-space: nowrap;
  max-width: 280px;
  overflow: hidden; text-overflow: ellipsis;
  animation: final-chip-float 10s ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}
.final-chip .chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent); opacity: 0.7; flex-shrink: 0;
}
@keyframes final-chip-float {
  0%, 100% { transform: translateY(0) rotate(var(--tilt, 0deg)); }
  50%      { transform: translateY(-8px) rotate(calc(var(--tilt, 0deg) + 0.8deg)); }
}

/* Left column — stacked at varying angles */
.final-chip--l1 { top: 18%;  left: 4%;  --tilt: -6deg; --delay: 0s;   }
.final-chip--l2 { top: 42%;  left: 2%;  --tilt:  4deg; --delay: 1.4s; }
.final-chip--l3 { top: 68%;  left: 6%;  --tilt: -3deg; --delay: 2.8s; }

/* Right column */
.final-chip--r1 { top: 22%;  right: 3%; --tilt:  5deg; --delay: 0.7s; }
.final-chip--r2 { top: 46%;  right: 6%; --tilt: -5deg; --delay: 2.1s; }
.final-chip--r3 { top: 70%;  right: 2%; --tilt:  3deg; --delay: 3.3s; }

/* Geometric accents */
.final-ring {
  position: absolute;
  animation: final-chip-float 14s ease-in-out infinite;
}
.final-ring--a { top: 10%;  left: 18%; width: 90px; height: 90px; --tilt: 0deg; animation-delay: 0.4s; }
.final-ring--b { bottom: 12%; right: 22%; width: 60px; height: 60px; --tilt: 0deg; animation-delay: 2.2s; }

.final-dot {
  position: absolute;
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(192, 132, 252, 0.6);
  box-shadow: 0 0 14px 2px rgba(192, 132, 252, 0.35);
  animation: final-chip-float 9s ease-in-out infinite;
  --tilt: 0deg;
}
.final-dot--a { top: 28%; left: 30%; animation-delay: 0.6s; }
.final-dot--b { bottom: 22%; left: 24%; animation-delay: 1.9s; }
.final-dot--c { top: 34%; right: 28%; animation-delay: 3.1s; background: rgba(224,231,255,0.7); }

.final-squiggle {
  position: absolute; width: 120px; height: 20px;
  bottom: 28%; left: 14%;
  animation: final-chip-float 12s ease-in-out infinite;
  animation-delay: 1.2s;
  --tilt: -8deg;
}
.final-plus {
  position: absolute; width: 16px; height: 16px;
  top: 18%; right: 14%;
  animation: final-chip-float 11s ease-in-out infinite;
  animation-delay: 2.6s;
  --tilt: 12deg;
}

/* ═══════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════ */
.footer { padding: 32px 40px; background: var(--surface); }
.footer-inner {
  max-width: 1280px; margin: 0 auto;
  display: grid; grid-template-columns: 1.4fr 2fr; gap: 60px;
  padding-bottom: 48px; border-bottom: 1px solid rgba(26,24,36,0.08);
}
.footer-brand p { margin: 16px 0 0; font-size: 14px; color: var(--mute); max-width: 320px; line-height: 1.5; }
.footer-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.footer-col-title { color: var(--mute); margin-bottom: 16px; }
.footer-cols a { display: block; font-size: 14px; padding: 6px 0; opacity: 0.75; transition: opacity 0.15s; }
.footer-cols a:hover { opacity: 1; }
.footer-base { max-width: 1280px; margin: 0 auto; text-align: center; color: var(--mute); display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 13px; }
.footer-sep { opacity: 0.4; }
.footer-base a { opacity: 0.65; transition: opacity 0.15s; }
.footer-base a:hover { opacity: 1; }

/* ═══════════════════════════════════════════════════════
   AUTH MODAL
   ═══════════════════════════════════════════════════════ */
.auth-overlay {
  position: fixed; inset: 0;
  background: rgba(26,24,36,0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; animation: fade 0.2s ease-out;
}
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
.auth-card {
  background: #fff; border-radius: 28px;
  padding: 36px 40px; width: 100%; max-width: 440px;
  position: relative;
  box-shadow: 0 40px 80px rgba(0,0,0,0.25);
  animation: rise 0.25s ease-out;
}
@keyframes rise { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.auth-close {
  position: absolute; top: 16px; right: 16px;
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--mute); transition: background 0.15s;
}
.auth-close:hover { background: rgba(26,24,36,0.06); color: var(--surface-ink); }
.auth-brand { text-align: center; margin-bottom: 24px; }
.auth-brand .brand-mark { margin: 0 auto 14px; }
.auth-title { font-size: 40px; line-height: 1; margin-bottom: 8px; }
.auth-subtitle { font-size: 14px; color: var(--mute); }
.auth-tabs {
  display: flex; padding: 4px; background: var(--surface-dim);
  border-radius: 10px; gap: 4px; margin-bottom: 24px;
}
.auth-tab {
  flex: 1; padding: 9px; border-radius: 8px;
  font-size: 14px; font-weight: 500; color: var(--mute);
  transition: all 0.15s;
}
.auth-tab--active {
  background: #fff; color: var(--surface-ink); font-weight: 600;
  box-shadow: 0 2px 6px rgba(26,24,36,0.08);
}
.auth-threads-btn {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 12px; border-radius: 10px;
  background: #000; color: #fff; border: none;
  font-family: inherit; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.auth-threads-btn:hover { background: #1a1a1a; }

.auth-divider {
  display: flex; align-items: center; gap: 12px;
  font-size: 12px; color: var(--mute); margin: 16px 0;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.auth-divider::before,
.auth-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--surface-dim);
}

.auth-form { display: flex; flex-direction: column; gap: 14px; }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
.auth-field span { font-size: 12px; font-weight: 600; color: var(--mute); }
.auth-field input {
  padding: 12px 14px; border-radius: 10px;
  border: 1.5px solid transparent;
  background: var(--surface-dim);
  font-family: inherit; font-size: 14px; color: var(--surface-ink);
  transition: border-color 0.15s, background 0.15s; outline: none;
}
.auth-field input:focus { background: #fff; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(53,37,205,0.1); }
.auth-error-msg {
  font-size: 13px; color: #ba1a1a; margin: 0;
  padding: 10px 12px; background: rgba(186,26,26,0.06); border-radius: 8px;
}
.auth-submit { justify-content: center; padding: 12px; font-size: 15px; margin-top: 8px; width: 100%; }
.auth-card__spinner {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
  border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0;
}


/* ═══════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════ */
/* Tablet: collapse hero to single column, 2×2 Loop grid, stacked pricing with max-width
   so cards don't stretch across ~1000px of whitespace. Also tighten nav so links
   don't wrap mid-word before the mobile breakpoint kicks in. */
@media (max-width: 1023px) {
  .hero { grid-template-columns: 1fr; padding-bottom: 40px; }
  .stage { display: none; }
  .voice-grid { grid-template-columns: 1fr; gap: 48px; }
  .platform-stage { grid-template-columns: 1fr; }
  .platform-arrow { transform: rotate(90deg); }
  .loop-grid { grid-template-columns: repeat(2, 1fr); }
  .loop-grid::before { display: none; }
  .pricing-grid {
    grid-template-columns: 1fr;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
  }
  .plan--feature { transform: none; }
  .plan--feature:hover { transform: translateY(-4px); }
  .nav-inner { gap: 16px; padding: 16px 24px; }
  .nav-links { gap: 18px; }
  .nav-links a { font-size: 13px; white-space: nowrap; }
  .nav-cta .btn { white-space: nowrap; }
  /* On tablet chips get smaller + clamped so they live in the corners
     rather than overlapping the headline. Middle chips hidden since there
     isn't room for three on each side. */
  .final-chip { max-width: 200px; font-size: 15px; padding: 6px 11px; }
  .final-chip--l1 { top: 6%;  left: 2%; }
  .final-chip--l2 { display: none; }
  .final-chip--l3 { bottom: 12%; top: auto; left: 2%; }
  .final-chip--r1 { top: 6%;  right: 2%; }
  .final-chip--r2 { display: none; }
  .final-chip--r3 { bottom: 12%; top: auto; right: 2%; }
  .final-ring--a { top: 2%; left: 44%; width: 70px; height: 70px; }
  .final-ring--b { bottom: 4%; right: 38%; width: 50px; height: 50px; }
  .final-squiggle, .final-plus { display: none; }
}
@media (max-width: 760px) {
  .nav-links { display: none; }
  .hero { padding: 40px 20px 32px; }
  .hero-title { font-size: 56px; }
  .loop-grid { grid-template-columns: 1fr; padding: 0; }
  .footer-inner { grid-template-columns: 1fr; }
  .footer-cols { grid-template-columns: repeat(2, 1fr); }
  .final-cta { margin: 16px; padding: 80px 20px; }
  /* All decorative elements hidden on mobile — too little room for them
     to breathe, and the radial glow + copy carry the section on their own. */
  .final-decor { display: none; }
  .platforms { padding: 48px 20px; }
  .loop { padding: 48px 20px; }
  .voice { padding: 48px 20px; }
  .pricing { padding: 48px 20px 64px; }
  /* Tabs wrap into two rows instead of being cut off at the viewport edge. */
  .platform-tabs {
    flex-wrap: wrap;
    justify-content: center;
    row-gap: 6px;
    width: 100%;
    max-width: 100%;
  }
  .platform-tab { padding: 8px 14px; font-size: 13px; }
  .auth-card { margin: 20px; padding: 28px 24px; }
}
</style>
