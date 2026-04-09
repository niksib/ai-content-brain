<template>
  <div>
    <!-- Loading state while checking auth -->
    <div v-if="isChecking" class="auth-check">
      <div class="auth-check__spinner"></div>
    </div>

    <!-- Auth modal (register / login) -->
    <div v-else-if="showAuth" class="auth-page">
      <div class="auth-card">
        <div class="auth-card__brand">
          <div class="auth-card__brand-orb">
            <span class="material-symbols-outlined" style="font-size:28px;color:#fff;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">auto_awesome</span>
          </div>
          <h1 class="auth-card__title">Daily Content Brain</h1>
          <p class="auth-card__subtitle">Your AI-powered content creation studio</p>
        </div>
        <div class="auth-card__tabs">
          <button class="auth-card__tab" :class="{ 'auth-card__tab--active': authMode === 'login' }" @click="authMode = 'login'">Sign in</button>
          <button class="auth-card__tab" :class="{ 'auth-card__tab--active': authMode === 'register' }" @click="authMode = 'register'">Create account</button>
        </div>
        <form class="auth-card__form" @submit.prevent="handleAuthSubmit">
          <div v-if="authMode === 'register'" class="auth-field">
            <label class="auth-field__label">Name</label>
            <div class="auth-field__input-wrap">
              <span class="material-symbols-outlined auth-field__icon">person</span>
              <input v-model="authName" type="text" class="auth-field__input" placeholder="Your name" required />
            </div>
          </div>
          <div class="auth-field">
            <label class="auth-field__label">Email</label>
            <div class="auth-field__input-wrap">
              <span class="material-symbols-outlined auth-field__icon">mail</span>
              <input v-model="authEmail" type="email" class="auth-field__input" placeholder="you@example.com" required />
            </div>
          </div>
          <div class="auth-field">
            <label class="auth-field__label">Password</label>
            <div class="auth-field__input-wrap">
              <span class="material-symbols-outlined auth-field__icon">lock</span>
              <input v-model="authPassword" type="password" class="auth-field__input" placeholder="••••••••" required minlength="8" />
            </div>
          </div>
          <p v-if="authError" class="auth-card__error">{{ authError }}</p>
          <button type="submit" class="auth-card__submit" :disabled="authLoading">
            <span v-if="authLoading" class="auth-card__spinner"></span>
            {{ authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account' }}
          </button>
        </form>
        <button class="auth-card__back" @click="router.push('/')">← Back to home</button>
      </div>
      <div class="auth-page__blob auth-page__blob--1"></div>
      <div class="auth-page__blob auth-page__blob--2"></div>
    </div>

    <template v-else>
      <!-- TopNavBar -->
      <nav class="fixed top-0 w-full z-50 bg-slate-50/70 backdrop-blur-xl shadow-sm">
        <div class="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div class="text-xl font-bold tracking-tighter text-slate-900 font-headline">
            Daily Content Brain
          </div>
          <div class="hidden md:flex space-x-8 items-center font-manrope tracking-tight font-medium">
            <a class="text-indigo-600 font-semibold border-b-2 border-indigo-600 transition-colors duration-200" href="#features">Features</a>
            <a class="text-slate-600 hover:text-indigo-500 transition-colors duration-200" href="#transformation">Case Studies</a>
            <a class="text-slate-600 hover:text-indigo-500 transition-colors duration-200" href="#pricing">Pricing</a>
          </div>
          <button class="primary-gradient text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-150 ease-in-out active:scale-95" @click="goToRegister">
            Start Free Trial
          </button>
        </div>
      </nav>

      <main class="relative pt-32 overflow-hidden">
        <!-- Hero Section -->
        <section class="relative px-8 pb-24 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div class="absolute -top-48 left-1/2 -translate-x-1/2 w-[600px] h-[600px] hero-orb rounded-full -z-10"></div>
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-sm font-semibold mb-8">
            <span class="material-symbols-outlined text-sm">auto_awesome</span>
            The Editorial Intelligence for Creators
          </div>
          <h1 class="text-5xl md:text-7xl font-extrabold font-headline tracking-tighter text-on-background max-w-4xl leading-[1.1] mb-8">
            Your daily thoughts <span class="text-primary italic">-&gt;</span> ready-to-post content
          </h1>
          <p class="text-xl text-on-surface-variant max-w-2xl mb-12 leading-relaxed">
            Daily Content Brain captures your raw voice notes and fleeting ideas, distilling them into high-performing social posts that actually sound like you.
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <button class="primary-gradient text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]" @click="goToRegister">
              Start Free Trial
            </button>
          </div>
          <div class="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
            <div class="flex items-center justify-center gap-2 font-headline font-bold uppercase tracking-widest text-xs">
              <span class="material-symbols-outlined">alternate_email</span> Threads
            </div>
            <div class="flex items-center justify-center gap-2 font-headline font-bold uppercase tracking-widest text-xs">
              <span class="material-symbols-outlined">video_library</span> TikTok
            </div>
            <div class="flex items-center justify-center gap-2 font-headline font-bold uppercase tracking-widest text-xs">
              <span class="material-symbols-outlined">photo_library</span> Instagram
            </div>
            <div class="flex items-center justify-center gap-2 font-headline font-bold uppercase tracking-widest text-xs">
              <span class="material-symbols-outlined">work</span> LinkedIn
            </div>
          </div>
        </section>

        <!-- Problem Section -->
        <section class="py-24 bg-surface-container-low" id="features">
          <div class="max-w-7xl mx-auto px-6">
            <div class="text-center max-w-3xl mx-auto mb-16">
              <h2 class="text-3xl md:text-4xl font-extrabold font-headline mb-4 text-on-background">Don't let your ideas die in a notebook.</h2>
              <p class="text-lg text-on-surface-variant">The gap between a great thought and a polished post is where most creators lose their momentum.</p>
            </div>
            <div class="grid md:grid-cols-3 gap-8">
              <div class="bg-surface-container-lowest p-10 rounded-[32px] transition-all hover:-translate-y-1 shadow-sm border border-outline-variant/10">
                <div class="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center mb-6">
                  <span class="material-symbols-outlined text-primary text-3xl">timer</span>
                </div>
                <h3 class="text-xl font-bold font-headline mb-3 text-on-background">Time Friction</h3>
                <p class="text-on-surface-variant leading-relaxed">Spend hours staring at a blinking cursor trying to "find the hook" for an idea you had while walking.</p>
              </div>
              <div class="bg-surface-container-lowest p-10 rounded-[32px] transition-all hover:-translate-y-1 shadow-sm border border-outline-variant/10">
                <div class="w-14 h-14 rounded-2xl bg-secondary-fixed flex items-center justify-center mb-6">
                  <span class="material-symbols-outlined text-secondary text-3xl">record_voice_over</span>
                </div>
                <h3 class="text-xl font-bold font-headline mb-3 text-on-background">Voice Inconsistency</h3>
                <p class="text-on-surface-variant leading-relaxed">Typical AI tools make you sound like a generic corporate bot. You lose the nuance that makes you, you.</p>
              </div>
              <div class="bg-surface-container-lowest p-10 rounded-[32px] transition-all hover:-translate-y-1 shadow-sm border border-outline-variant/10">
                <div class="w-14 h-14 rounded-2xl bg-tertiary-fixed flex items-center justify-center mb-6">
                  <span class="material-symbols-outlined text-tertiary text-3xl">auto_awesome_motion</span>
                </div>
                <h3 class="text-xl font-bold font-headline mb-3 text-on-background">Platform Burnout</h3>
                <p class="text-on-surface-variant leading-relaxed">Manually reformatting the same message for X, LinkedIn, and Instagram is busywork that drains your soul.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Voice Preservation Section -->
        <section class="py-24 px-6 bg-surface" id="voice">
          <div class="max-w-7xl mx-auto">
            <div class="grid lg:grid-cols-2 gap-16 items-center">
              <div class="order-2 lg:order-1">
                <div class="relative bg-surface-container-lowest rounded-[40px] p-8 md:p-12 overflow-hidden shadow-sm border border-outline-variant/30">
                  <div class="space-y-6">
                    <div class="bg-surface-container-low p-6 rounded-2xl border-l-4 border-error/30 opacity-60">
                      <span class="text-[10px] font-bold text-error uppercase tracking-wider mb-2 block font-headline">Standard AI Output</span>
                      <p class="text-sm italic leading-relaxed text-on-surface-variant">"Unlocking success requires a multifaceted approach to systematic integration. Here are 5 ways to optimize your workflow for maximum leverage."</p>
                    </div>
                    <div class="bg-surface-container-lowest p-8 rounded-3xl border-l-4 border-primary shadow-xl scale-[1.05] relative z-10">
                      <span class="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 block font-headline">Daily Content Brain</span>
                      <p class="text-lg font-medium leading-relaxed text-on-surface">"Stop trying to build the perfect system. Just build the one you'll actually show up for. Complexity is just procrastination in a suit."</p>
                      <div class="mt-4 flex items-center gap-2 text-primary">
                        <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                        <span class="text-xs font-bold font-headline uppercase tracking-tight">Voice Preserved</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="order-1 lg:order-2">
                <h2 class="text-4xl md:text-5xl font-extrabold font-headline mb-6 leading-tight text-on-background">Content that sounds like you. Not like everyone else's AI.</h2>
                <p class="text-lg text-on-surface-variant mb-8 leading-relaxed">
                  We don't just "generate" text. We analyze your unique cadence, vocabulary, and core beliefs to ensure every draft maintains your authentic edge.
                </p>
                <ul class="space-y-4">
                  <li class="flex items-start gap-4">
                    <span class="material-symbols-outlined text-primary mt-1">auto_awesome</span>
                    <div>
                      <span class="font-bold block text-on-surface">Vocabulary Lock</span>
                      <span class="text-on-surface-variant text-sm">Uses the specific words you favor, avoiding generic AI-isms.</span>
                    </div>
                  </li>
                  <li class="flex items-start gap-4">
                    <span class="material-symbols-outlined text-primary mt-1">rebase_edit</span>
                    <div>
                      <span class="font-bold block text-on-surface">Pacing Analysis</span>
                      <span class="text-on-surface-variant text-sm">Matches your sentence length and rhythm for perfect flow.</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- Transformation Section -->
        <section class="py-32 px-8 bg-surface-container-low" id="transformation">
          <div class="max-w-7xl mx-auto">
            <div class="text-center mb-16">
              <h2 class="text-4xl font-extrabold font-headline tracking-tight mb-4 text-on-background">The Transformation</h2>
              <p class="text-on-surface-variant text-lg">See how your messy brain dumps become professional distribution.</p>
            </div>
            <div class="grid md:grid-cols-2 gap-12 items-start">
              <!-- Raw Thoughts -->
              <div class="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/30 shadow-sm">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-xl font-bold font-headline flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">mic</span> User's Raw Thoughts
                  </h3>
                  <span class="text-xs font-bold text-outline uppercase">60s Voice Note Transcription</span>
                </div>
                <div class="bg-surface-container-low p-6 rounded-2xl shadow-inner text-on-surface-variant leading-relaxed italic">
                  "Okay, so I was thinking today about morning routines... and how everyone talks about waking up at 5am. But honestly, for me, it's not about the time, it's about the intention. Like, if I wake up at 8am but I'm actually focused, it's better than being a zombie at 5am. I think people use high-performance habits as a shield to hide from the actual work. It's like, stop tracking your water intake and start tracking your output. That's the real shift. Maybe I should write about how habits are becoming the new procrastination?"
                </div>
                <div class="mt-6 flex items-center gap-2 text-primary/60 text-sm">
                  <span class="material-symbols-outlined text-sm">waves</span> 0:42 / 1:00 recording
                </div>
              </div>

              <!-- Platform-Native Posts with Tabs -->
              <div class="space-y-6">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-xl font-bold font-headline flex items-center gap-2">
                    <span class="material-symbols-outlined text-secondary">send</span> Platform-Native Posts
                  </h3>
                </div>
                <!-- Tab headers -->
                <div class="flex gap-2 p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-x-auto">
                  <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap"
                    :class="activeTab === tab.id
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-on-surface-variant hover:bg-white/50'"
                    @click="activeTab = tab.id"
                  >
                    <span class="material-symbols-outlined text-xl">{{ tab.icon }}</span>
                    {{ tab.label }}
                  </button>
                </div>
                <!-- Tab content -->
                <div class="relative bg-white rounded-3xl shadow-xl border border-outline-variant/20 overflow-hidden min-h-[400px]">
                  <!-- LinkedIn -->
                  <div v-if="activeTab === 'linkedin'" class="p-6">
                    <div class="flex items-center gap-3 mb-4">
                      <div class="w-12 h-12 rounded-full bg-slate-200"></div>
                      <div>
                        <div class="text-sm font-bold text-on-background">Your Name</div>
                        <div class="text-xs text-on-surface-variant">Content Creator • 1h</div>
                      </div>
                    </div>
                    <p class="text-on-background leading-relaxed mb-4">
                      Habits are the new procrastination.<br /><br />
                      We spend more time optimizing our 5 AM routine than we do on the actual work that moves the needle.<br /><br />
                      Your output matters more than your water intake. Stop hiding behind high-performance "shields."
                    </p>
                    <div class="border-t border-outline-variant/20 pt-4 flex items-center gap-6 text-on-surface-variant">
                      <span class="material-symbols-outlined text-xl">thumb_up</span>
                      <span class="material-symbols-outlined text-xl">comment</span>
                      <span class="material-symbols-outlined text-xl">share</span>
                    </div>
                  </div>
                  <!-- Instagram -->
                  <div v-else-if="activeTab === 'instagram'">
                    <div class="flex items-center gap-3 p-4">
                      <div class="w-8 h-8 rounded-full bg-slate-200"></div>
                      <div class="text-sm font-bold text-on-background">yourhandle</div>
                    </div>
                    <div class="aspect-square bg-slate-100 flex items-center justify-center relative">
                      <div class="absolute inset-0 primary-gradient opacity-10"></div>
                      <div class="text-center px-8 z-10">
                        <h4 class="text-2xl font-black font-headline text-on-background leading-tight">8 AM focus > 5 AM zombie mode. ☕️</h4>
                      </div>
                    </div>
                    <div class="p-4">
                      <div class="flex gap-4 mb-2">
                        <span class="material-symbols-outlined text-xl">favorite</span>
                        <span class="material-symbols-outlined text-xl">chat_bubble</span>
                        <span class="material-symbols-outlined text-xl">send</span>
                      </div>
                      <p class="text-sm text-on-background">
                        <span class="font-bold">yourhandle</span> It's not the hour you wake up, it's the intention you bring. Are your habits helping you or helping you hide?
                      </p>
                    </div>
                  </div>
                  <!-- Threads -->
                  <div v-else-if="activeTab === 'threads'" class="p-6">
                    <div class="flex items-start gap-4 mb-6">
                      <div class="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0"></div>
                      <div class="flex-grow">
                        <div class="flex items-center justify-between">
                          <div class="text-sm font-bold">yourname</div>
                          <div class="text-xs text-on-surface-variant">4m</div>
                        </div>
                        <p class="text-sm mt-1">Stop letting "optimization" be your excuse for inaction. 🧵</p>
                      </div>
                    </div>
                    <div class="flex items-start gap-4 pl-14 relative">
                      <div class="absolute left-[31px] top-0 bottom-0 w-0.5 bg-slate-100"></div>
                      <div class="flex-grow">
                        <p class="text-sm">A 5am routine won't save a bad business model.</p>
                      </div>
                    </div>
                    <div class="flex items-start gap-4 mt-6">
                      <div class="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0"></div>
                      <div class="flex-grow">
                        <p class="text-sm">High performance is output, not maintenance.</p>
                        <div class="flex gap-4 mt-4 text-on-surface-variant">
                          <span class="material-symbols-outlined text-sm">favorite</span>
                          <span class="material-symbols-outlined text-sm">chat_bubble</span>
                          <span class="material-symbols-outlined text-sm">repeat</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- TikTok -->
                  <div v-else-if="activeTab === 'tiktok'" class="p-0 h-[400px] bg-black relative">
                    <div class="absolute inset-0 flex flex-col justify-end p-6 text-white bg-gradient-to-t from-black/80 to-transparent">
                      <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full border-2 border-white bg-slate-600"></div>
                        <div class="font-bold">@creator</div>
                      </div>
                      <p class="text-sm mb-4">The truth about 5am routines that no one wants to hear... ☕️ #entrepreneur #habits #productivity</p>
                      <div class="flex items-center gap-4">
                        <span class="material-symbols-outlined">music_note</span>
                        <span class="text-xs truncate">Original sound - Content Brain</span>
                      </div>
                    </div>
                    <div class="absolute right-4 bottom-24 flex flex-col gap-6 text-white items-center">
                      <div class="flex flex-col items-center">
                        <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1;">favorite</span>
                        <span class="text-[10px] font-bold">12k</span>
                      </div>
                      <div class="flex flex-col items-center">
                        <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1;">comment</span>
                        <span class="text-[10px] font-bold">452</span>
                      </div>
                      <div class="flex flex-col items-center">
                        <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1;">bookmark</span>
                        <span class="text-[10px] font-bold">1.2k</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Workflow Section -->
        <section class="py-32 px-8 bg-surface overflow-hidden">
          <div class="max-w-7xl mx-auto">
            <div class="text-center mb-24">
              <h2 class="text-4xl font-extrabold font-headline tracking-tight mb-4 text-on-background">The Seamless Workflow</h2>
              <p class="text-on-surface-variant text-lg">Your content machine, operating in the background.</p>
            </div>
            <div class="relative px-4">
              <!-- Wavy connecting line -->
              <div class="curved-path hidden md:block">
                <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 100">
                  <path class="wavy-line" d="M0,50 C100,0 150,100 250,50 C350,0 400,100 500,50 C600,0 650,100 750,50 C850,0 900,100 1000,50"></path>
                </svg>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-12 relative">
                <div v-for="step in workflowSteps" :key="step.number" class="flex flex-col items-center text-center group" :class="step.offset ? 'md:mt-12' : ''">
                  <div
                    class="w-16 h-16 rounded-full shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform z-10"
                    :class="step.primary ? 'bg-primary text-white' : 'bg-white border-2 border-primary/20'"
                  >
                    <span class="material-symbols-outlined text-3xl" :class="!step.primary ? 'text-' + step.color : ''">{{ step.icon }}</span>
                  </div>
                  <h4 class="font-bold font-headline text-on-surface mb-2">{{ step.number }}. {{ step.title }}</h4>
                  <p class="text-xs text-on-surface-variant">{{ step.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="py-32 px-8 relative overflow-hidden bg-surface-container-low" id="pricing">
          <div class="absolute inset-0 primary-gradient opacity-[0.03] -z-10"></div>
          <div class="max-w-3xl mx-auto text-center">
            <h2 class="text-5xl font-extrabold font-headline tracking-tight mb-8 text-on-background">Stop thinking. Start posting.</h2>
            <p class="text-xl text-on-surface-variant mb-12">Join 1,200+ creators who are reclaiming their creative energy and doubling their social presence.</p>
            <button class="primary-gradient text-white px-12 py-5 rounded-xl font-bold text-xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" @click="goToRegister">
              Start Free Trial
            </button>
          </div>
        </section>
      </main>

      <!-- Footer -->
      <footer class="w-full py-16 px-8 bg-primary text-white">
        <div class="max-w-7xl mx-auto">
          <div class="flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
            <div class="flex flex-col items-center md:items-start space-y-4">
              <div class="text-2xl font-black font-headline tracking-tighter">Daily Content Brain</div>
              <div class="text-white/70 text-sm max-w-xs text-center md:text-left leading-relaxed">
                The Editorial Intelligence for modern creators. Transform your raw thoughts into high-performing content.
              </div>
            </div>
            <div class="flex flex-wrap justify-center gap-10 text-sm uppercase tracking-widest font-semibold">
              <a class="hover:text-primary-fixed transition-colors" href="#">Privacy Policy</a>
              <a class="hover:text-primary-fixed transition-colors" href="#">Terms of Service</a>
              <a class="hover:text-primary-fixed transition-colors" href="#">Twitter</a>
              <a class="hover:text-primary-fixed transition-colors" href="#">Contact</a>
            </div>
          </div>
          <div class="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/60 uppercase tracking-widest font-bold">
            <div>© 2024 Daily Content Brain. All rights reserved.</div>
            <div class="flex items-center gap-2">
              Built with <span class="material-symbols-outlined text-xs text-error" style="font-variation-settings: 'FILL' 1;">favorite</span> for Creators
            </div>
          </div>
        </div>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

useHead({
  title: 'Daily Content Brain | Transform Thoughts into Content',
});

const router = useRouter();
const route = useRoute();
const config = useRuntimeConfig();
const baseURL = config.public.apiBaseUrl as string;

const isChecking = ref(true);
const activeTab = ref('linkedin');

const showAuth = computed(() => route.query.mode === 'register' || route.query.mode === 'login');

// Auth form state
const authMode = ref<'login' | 'register'>(route.query.mode === 'login' ? 'login' : 'register');
const authName = ref('');
const authEmail = ref('');
const authPassword = ref('');
const authError = ref('');
const authLoading = ref(false);

function goToRegister() {
  router.push('/?mode=register');
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
    const isAuthenticated = useState<boolean | null>('auth:authenticated');
    isAuthenticated.value = null;
    const data = await $fetch<{ completed: boolean }>(`${baseURL}/api/onboarding/status`, { credentials: 'include' });
    router.replace(data.completed ? '/dashboard' : '/onboarding');
  } catch (err: unknown) {
    const apiError = err as { data?: { message?: string } };
    authError.value = apiError?.data?.message || 'Something went wrong. Please try again.';
  } finally {
    authLoading.value = false;
  }
}

const tabs = [
  { id: 'linkedin', label: 'LinkedIn', icon: 'work' },
  { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
  { id: 'threads', label: 'Threads', icon: 'alternate_email' },
  { id: 'tiktok', label: 'TikTok', icon: 'movie' },
];

const workflowSteps = [
  { number: 1, title: 'Speak', icon: 'mic', color: 'primary', description: 'Talk about your day or a new idea.', offset: false, primary: false },
  { number: 2, title: 'Analyze', icon: 'psychology', color: 'secondary', description: 'AI proposes platform angles.', offset: true, primary: false },
  { number: 3, title: 'Approve', icon: 'chat', color: 'primary', description: 'Tweak ideas via chat interface.', offset: false, primary: false },
  { number: 4, title: 'Generate', icon: 'magic_button', color: 'secondary', description: 'AI drafts final posts & scripts.', offset: true, primary: false },
  { number: 5, title: 'Post', icon: 'rocket_launch', color: 'primary', description: 'Share your voice with the world.', offset: false, primary: true },
];

onMounted(async () => {
  try {
    const data = await $fetch<{ completed: boolean }>(`${baseURL}/api/onboarding/status`, {
      credentials: 'include',
    });
    if (data.completed) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
  } catch {
    // Not authenticated — show landing page
    isChecking.value = false;
  }
});
</script>

<style>
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.hero-orb {
  background: radial-gradient(circle, #3525cd 0%, #4f46e5 40%, #e2dfff 100%);
  filter: blur(60px);
  opacity: 0.25;
  mix-blend-mode: multiply;
}

.primary-gradient {
  background: linear-gradient(135deg, #3525cd 0%, #4f46e5 100%);
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.curved-path {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 100px;
  z-index: 0;
  transform: translateY(-50%);
  pointer-events: none;
}

.wavy-line {
  stroke-dasharray: 8 8;
  stroke: #c7c4d8;
  stroke-width: 2;
  fill: none;
}

.auth-check {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f9fb;
}

.auth-check__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2dfff;
  border-top-color: #3525cd;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Auth page ─── */
.auth-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(circle at top right, #e2dfff 0%, #f7f9fb 40%, #ffffff 100%);
  font-family: 'Inter', sans-serif;
}

.auth-page__blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(60px);
}

.auth-page__blob--1 {
  width: 640px; height: 640px;
  background: radial-gradient(circle, rgba(53,37,205,0.07) 0%, transparent 70%);
  top: -200px; right: -200px;
}

.auth-page__blob--2 {
  width: 480px; height: 480px;
  background: radial-gradient(circle, rgba(0,106,97,0.05) 0%, transparent 70%);
  bottom: -150px; left: -150px;
}

.auth-card {
  position: relative;
  z-index: 10;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.6);
  border-radius: 24px;
  padding: 2.5rem;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(53,37,205,0.08), 0 4px 16px rgba(25,28,30,0.06);
}

.auth-card__brand { text-align: center; margin-bottom: 2rem; }

.auth-card__brand-orb {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: 0 8px 24px rgba(79,70,229,0.3);
}

.auth-card__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.5rem; font-weight: 800;
  letter-spacing: -0.03em;
  color: #191c1e; margin: 0 0 0.375rem;
}

.auth-card__subtitle { font-size: 0.875rem; color: #464555; margin: 0; }

.auth-card__tabs {
  display: flex;
  background: #f2f4f6;
  border-radius: 10px;
  padding: 4px; gap: 4px;
  margin-bottom: 1.75rem;
}

.auth-card__tab {
  flex: 1; padding: 0.5rem;
  border: none; border-radius: 8px;
  cursor: pointer; font-size: 0.875rem; font-weight: 500;
  color: #464555; background: transparent;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.auth-card__tab--active {
  background: #fff; color: #191c1e; font-weight: 600;
  box-shadow: 0 2px 8px rgba(25,28,30,0.08);
}

.auth-card__form { display: flex; flex-direction: column; gap: 1rem; }

.auth-field { display: flex; flex-direction: column; gap: 0.375rem; }

.auth-field__label { font-size: 0.8125rem; font-weight: 600; color: #464555; }

.auth-field__input-wrap { position: relative; }

.auth-field__icon {
  position: absolute; left: 0.875rem; top: 50%;
  transform: translateY(-50%);
  font-size: 18px !important; color: #777587; pointer-events: none;
}

.auth-field__input {
  width: 100%;
  padding: 0.6875rem 0.875rem 0.6875rem 2.75rem;
  background: #f2f4f6;
  border: 1.5px solid transparent;
  border-radius: 10px;
  font-size: 0.9375rem; color: #191c1e;
  outline: none; font-family: 'Inter', sans-serif;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.auth-field__input::placeholder { color: #777587; }

.auth-field__input:focus {
  background: #fff;
  border-color: #3525cd;
  box-shadow: 0 0 0 3px rgba(53,37,205,0.1);
}

.auth-card__error {
  font-size: 0.8125rem; color: #ba1a1a;
  padding: 0.625rem 0.875rem;
  background: rgba(186,26,26,0.06);
  border-radius: 8px; margin: 0;
}

.auth-card__submit {
  margin-top: 0.25rem;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.8125rem;
  background: linear-gradient(135deg, #3525cd, #4f46e5);
  color: #fff; border: none; border-radius: 10px;
  font-size: 0.9375rem; font-weight: 700;
  cursor: pointer; font-family: 'Manrope', sans-serif;
  box-shadow: 0 8px 24px rgba(53,37,205,0.25);
  transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
}

.auth-card__submit:hover:not(:disabled) {
  opacity: 0.93; transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(53,37,205,0.32);
}

.auth-card__submit:disabled { opacity: 0.55; cursor: not-allowed; }

.auth-card__spinner {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite; flex-shrink: 0;
}

.auth-card__back {
  display: block; width: 100%; margin-top: 1rem;
  background: none; border: none; cursor: pointer;
  color: #464555; font-size: 0.875rem;
  text-align: center; padding: 0.5rem;
  font-family: 'Inter', sans-serif;
  transition: color 0.15s;
}

.auth-card__back:hover { color: #3525cd; }
</style>
