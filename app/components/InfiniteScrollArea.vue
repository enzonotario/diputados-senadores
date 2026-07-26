<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    hasMore: boolean;
    loading: boolean;
    loadMore: () => Promise<void>;
    ariaLabel?: string;
  }>(),
  {
    ariaLabel: "Resultados con carga automática",
  },
);

const loadSentinel = useTemplateRef<HTMLElement>("loadSentinel");
const loadingMore = ref(false);

async function loadNextPage() {
  if (!props.hasMore || props.loading || loadingMore.value) return;

  loadingMore.value = true;
  try {
    await props.loadMore();
  } finally {
    loadingMore.value = false;
  }
}

/** Scroll de página (viewport): la tabla crece con su alto natural. */
useIntersectionObserver(
  loadSentinel,
  ([entry]) => {
    if (entry?.isIntersecting) {
      void loadNextPage();
    }
  },
  {
    rootMargin: "0px 0px 240px 0px",
  },
);

watch(
  [() => props.loading, loadingMore, () => props.hasMore],
  async ([loading, loadingNext, hasMore]) => {
    if (loading || loadingNext || !hasMore) return;
    await nextTick();

    const sentinel = loadSentinel.value;
    if (!sentinel) return;

    const rect = sentinel.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 240) {
      await loadNextPage();
    }
  },
  { flush: "post" },
);
</script>

<template>
  <div :aria-label="ariaLabel">
    <div class="min-w-0 overflow-x-auto">
      <slot />
    </div>

    <div
      v-if="hasMore || loading || loadingMore"
      ref="loadSentinel"
      class="flex min-h-14 items-center justify-center gap-2 py-4 text-sm text-muted"
      role="status"
      aria-live="polite"
    >
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
      <span>Cargando más resultados…</span>
    </div>
  </div>
</template>
