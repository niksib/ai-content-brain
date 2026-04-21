<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
</script>

<style>
/* ─── Design System CSS Variables ─── */
:root {
  /* Primary */
  --color-primary: #3525cd;
  --color-primary-container: #4f46e5;
  --color-primary-fixed: #e2dfff;
  --color-on-primary: #ffffff;
  --color-on-primary-container: #dad7ff;

  /* Background & Surface */
  --color-background: #f7f9fb;
  --color-surface: #f7f9fb;
  --color-surface-lowest: #ffffff;
  --color-surface-low: #f2f4f6;
  --color-surface: #eceef0;
  --color-surface-high: #e6e8ea;
  --color-surface-highest: #e0e3e5;

  /* On-surface text */
  --color-on-surface: #191c1e;
  --color-on-surface-variant: #464555;
  --color-outline: #777587;
  --color-outline-variant: #c7c4d8;

  /* Secondary */
  --color-secondary: #006a61;
  --color-secondary-container: #86f2e4;
  --color-on-secondary: #ffffff;

  /* Error */
  --color-error: #ba1a1a;

  /* Shadows */
  --shadow-ambient: 0 12px 32px -4px rgba(25, 28, 30, 0.06);
  --shadow-card: 0 2px 8px -2px rgba(25, 28, 30, 0.08);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* Typography */
  --font-heading: 'Manrope', sans-serif;
  --font-body: 'Inter', sans-serif;
}

/* ─── Global Reset & Base ─── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  background: var(--color-background);
  color: var(--color-on-surface);
  line-height: 1.5;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--color-on-surface);
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: var(--font-body);
  cursor: pointer;
}

input, textarea, select {
  font-family: var(--font-body);
}

/* ─── Form element normalization (replaces Tailwind Forms plugin) ─── */
input,
textarea,
select {
  -webkit-appearance: none;
  appearance: none;
}

/* Remove browser default focus outline — components add their own focus styles */
input:focus,
input:focus-visible,
textarea:focus,
textarea:focus-visible,
select:focus,
select:focus-visible,
button:focus:not(:focus-visible) {
  outline: none;
}
</style>
