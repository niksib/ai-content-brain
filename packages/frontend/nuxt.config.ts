export default defineNuxtConfig({
  compatibilityDate: '2025-04-01',

  modules: ['@pinia/nuxt'],

  ssr: false,

  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
    },
  },
});
