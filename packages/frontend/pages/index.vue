<template>
  <div class="auth-page">
    <!-- Loading state -->
    <div v-if="isChecking" class="auth-page__loading">
      <div class="auth-page__spinner"></div>
    </div>

    <!-- Auth card -->
    <div v-else class="auth-card">
      <!-- Brand -->
      <div class="auth-card__brand">
        <div class="auth-card__brand-orb">
          <span class="material-symbols-outlined" style="font-size:28px;color:#fff;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">auto_awesome</span>
        </div>
        <h1 class="auth-card__title">Creator Hub</h1>
        <p class="auth-card__subtitle">Your AI-powered content creation studio</p>
      </div>

      <!-- Tabs -->
      <div class="auth-card__tabs">
        <button
          class="auth-card__tab"
          :class="{ 'auth-card__tab--active': mode === 'login' }"
          @click="mode = 'login'"
        >Sign in</button>
        <button
          class="auth-card__tab"
          :class="{ 'auth-card__tab--active': mode === 'register' }"
          @click="mode = 'register'"
        >Create account</button>
      </div>

      <!-- Form -->
      <form class="auth-card__form" @submit.prevent="handleSubmit">
        <div v-if="mode === 'register'" class="auth-field">
          <label class="auth-field__label">Name</label>
          <div class="auth-field__input-wrap">
            <span class="material-symbols-outlined auth-field__icon">person</span>
            <input
              v-model="name"
              type="text"
              class="auth-field__input"
              placeholder="Your name"
              required
            />
          </div>
        </div>

        <div class="auth-field">
          <label class="auth-field__label">Email</label>
          <div class="auth-field__input-wrap">
            <span class="material-symbols-outlined auth-field__icon">mail</span>
            <input
              v-model="email"
              type="email"
              class="auth-field__input"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div class="auth-field">
          <label class="auth-field__label">Password</label>
          <div class="auth-field__input-wrap">
            <span class="material-symbols-outlined auth-field__icon">lock</span>
            <input
              v-model="password"
              type="password"
              class="auth-field__input"
              placeholder="••••••••"
              required
              minlength="8"
            />
          </div>
        </div>

        <p v-if="error" class="auth-card__error">{{ error }}</p>

        <button type="submit" class="auth-card__submit" :disabled="isLoading">
          <span v-if="isLoading" class="auth-card__spinner"></span>
          {{ isLoading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account' }}
        </button>
      </form>
    </div>

    <!-- Decorative blobs -->
    <div class="auth-page__blob auth-page__blob--1"></div>
    <div class="auth-page__blob auth-page__blob--2"></div>
    <div class="auth-page__blob auth-page__blob--3"></div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

const router = useRouter();
const config = useRuntimeConfig();
const baseURL = config.public.apiBaseUrl as string;

const isChecking = ref(true);
const mode = ref<'login' | 'register'>('login');
const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

onMounted(async () => {
  try {
    const data = await $fetch<{ completed: boolean }>(`${baseURL}/api/onboarding/status`, {
      credentials: 'include',
    });
    // Already authenticated — redirect
    if (data.completed) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
  } catch {
    // Not authenticated — show login form
    isChecking.value = false;
  }
});

async function handleSubmit() {
  error.value = '';
  isLoading.value = true;

  try {
    if (mode.value === 'register') {
      await $fetch(`${baseURL}/api/auth/sign-up/email`, {
        method: 'POST',
        body: { name: name.value, email: email.value, password: password.value },
        credentials: 'include',
      });
    } else {
      await $fetch(`${baseURL}/api/auth/sign-in/email`, {
        method: 'POST',
        body: { email: email.value, password: password.value },
        credentials: 'include',
      });
    }

    // Clear cached auth state so middleware re-checks
    const isAuthenticated = useState<boolean | null>('auth:authenticated');
    isAuthenticated.value = null;

    // Check onboarding status to decide where to send the user
    const data = await $fetch<{ completed: boolean }>(`${baseURL}/api/onboarding/status`, {
      credentials: 'include',
    });

    if (data.completed) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
  } catch (err: unknown) {
    const apiError = err as { data?: { message?: string } };
    error.value = apiError?.data?.message || 'Something went wrong. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
/* ─── Page ─── */
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

/* ─── Background blobs ─── */
.auth-page__blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(60px);
}

.auth-page__blob--1 {
  width: 640px;
  height: 640px;
  background: radial-gradient(circle, rgba(53, 37, 205, 0.07) 0%, transparent 70%);
  top: -200px;
  right: -200px;
}

.auth-page__blob--2 {
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, rgba(0, 106, 97, 0.05) 0%, transparent 70%);
  bottom: -150px;
  left: -150px;
}

.auth-page__blob--3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(192, 132, 252, 0.08) 0%, transparent 70%);
  top: 40%;
  left: 20%;
}

/* ─── Loading ─── */
.auth-page__loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-page__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2dfff;
  border-top-color: #3525cd;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Card ─── */
.auth-card {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  padding: 2.5rem;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(53, 37, 205, 0.08), 0 4px 16px rgba(25, 28, 30, 0.06);
}

/* ─── Brand ─── */
.auth-card__brand {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-card__brand-orb {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
}

.auth-card__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.625rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #191c1e;
  margin: 0 0 0.375rem;
}

.auth-card__subtitle {
  font-size: 0.875rem;
  color: #464555;
  margin: 0;
}

/* ─── Tabs ─── */
.auth-card__tabs {
  display: flex;
  background: #f2f4f6;
  border-radius: 10px;
  padding: 4px;
  gap: 4px;
  margin-bottom: 1.75rem;
}

.auth-card__tab {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #464555;
  background: transparent;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.auth-card__tab--active {
  background: #ffffff;
  color: #191c1e;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(25, 28, 30, 0.08);
}

/* ─── Form ─── */
.auth-card__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Field ─── */
.auth-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.auth-field__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #464555;
}

.auth-field__input-wrap {
  position: relative;
}

.auth-field__icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px !important;
  color: #777587;
  pointer-events: none;
}

.auth-field__input {
  width: 100%;
  padding: 0.6875rem 0.875rem 0.6875rem 2.75rem;
  background: #f2f4f6;
  border: 1.5px solid transparent;
  border-radius: 10px;
  font-size: 0.9375rem;
  color: #191c1e;
  outline: none;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.auth-field__input::placeholder {
  color: #777587;
}

.auth-field__input:focus {
  background: #ffffff;
  border-color: #3525cd;
  box-shadow: 0 0 0 3px rgba(53, 37, 205, 0.1);
}

/* ─── Error ─── */
.auth-card__error {
  font-size: 0.8125rem;
  color: #ba1a1a;
  padding: 0.625rem 0.875rem;
  background: rgba(186, 26, 26, 0.06);
  border-radius: 8px;
  margin: 0;
}

/* ─── Submit ─── */
.auth-card__submit {
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8125rem;
  background: linear-gradient(135deg, #3525cd, #4f46e5);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  box-shadow: 0 8px 24px rgba(53, 37, 205, 0.25);
  transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
}

.auth-card__submit:hover:not(:disabled) {
  opacity: 0.93;
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(53, 37, 205, 0.32);
}

.auth-card__submit:active:not(:disabled) {
  transform: translateY(0);
}

.auth-card__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.auth-card__spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
</style>
