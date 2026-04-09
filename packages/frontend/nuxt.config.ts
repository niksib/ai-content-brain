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

  app: {
    head: {
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap',
        },
      ],
      script: [
        {
          src: 'https://cdn.tailwindcss.com?plugins=forms,container-queries',
          tagPosition: 'head',
        },
        {
          id: 'tailwind-config',
          tagPosition: 'head',
          innerHTML: `
            tailwind.config = {
              darkMode: "class",
              theme: {
                extend: {
                  colors: {
                    "on-background": "#191c1e",
                    "inverse-surface": "#2d3133",
                    "tertiary": "#7e3000",
                    "secondary-fixed": "#89f5e7",
                    "on-surface-variant": "#464555",
                    "on-secondary": "#ffffff",
                    "surface-bright": "#f7f9fb",
                    "surface-container": "#eceef0",
                    "surface-tint": "#4d44e3",
                    "on-tertiary-fixed": "#351000",
                    "primary": "#3525cd",
                    "background": "#f7f9fb",
                    "surface-container-highest": "#e0e3e5",
                    "on-tertiary": "#ffffff",
                    "on-secondary-fixed": "#00201d",
                    "tertiary-fixed": "#ffdbcc",
                    "on-primary-fixed": "#0f0069",
                    "on-primary-container": "#dad7ff",
                    "inverse-primary": "#c3c0ff",
                    "secondary-fixed-dim": "#6bd8cb",
                    "secondary-container": "#86f2e4",
                    "surface-dim": "#d8dadc",
                    "surface-container-lowest": "#ffffff",
                    "outline-variant": "#c7c4d8",
                    "on-primary": "#ffffff",
                    "error": "#ba1a1a",
                    "secondary": "#006a61",
                    "tertiary-fixed-dim": "#ffb695",
                    "primary-fixed-dim": "#c3c0ff",
                    "on-tertiary-fixed-variant": "#7b2f00",
                    "surface-container-high": "#e6e8ea",
                    "primary-fixed": "#e2dfff",
                    "primary-container": "#4f46e5",
                    "on-tertiary-container": "#ffd2be",
                    "on-error": "#ffffff",
                    "surface": "#f7f9fb",
                    "tertiary-container": "#a44100",
                    "on-secondary-container": "#006f66",
                    "outline": "#777587",
                    "error-container": "#ffdad6",
                    "on-surface": "#191c1e",
                    "on-error-container": "#93000a",
                    "on-primary-fixed-variant": "#3323cc",
                    "surface-variant": "#e0e3e5",
                    "on-secondary-fixed-variant": "#005049",
                    "surface-container-low": "#f2f4f6",
                    "inverse-on-surface": "#eff1f3"
                  },
                  borderRadius: {
                    DEFAULT: "0.25rem",
                    lg: "0.5rem",
                    xl: "0.75rem",
                    full: "9999px"
                  },
                  fontFamily: {
                    headline: ["Manrope"],
                    body: ["Inter"],
                    label: ["Inter"]
                  }
                }
              }
            }
          `,
        },
      ],
    },
  },
});
