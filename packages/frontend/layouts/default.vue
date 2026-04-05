<template>
  <div class="app-layout">
    <header class="app-header">
      <NuxtLink to="/dashboard" class="app-name">Daily Content Brain</NuxtLink>
      <nav class="app-nav">
        <NuxtLink to="/profile">Profile</NuxtLink>
      </nav>
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.app-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  text-decoration: none;
}

.app-nav a {
  color: #6b7280;
  text-decoration: none;
  font-size: 0.875rem;
}

.app-nav a:hover {
  color: #111827;
}

.app-main {
  flex: 1;
  padding: 2rem;
}
</style>
