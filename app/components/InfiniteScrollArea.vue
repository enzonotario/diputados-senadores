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

const scrollArea = useTemplateRef<{ $el: HTMLElement }>("scrollArea");
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

useIntersectionObserver(
  loadSentinel,
  ([entry]) => {
    if (entry?.isIntersecting) {
      void loadNextPage();
    }
  },
  {
    root: () => scrollArea.value?.$el,
    rootMargin: "0px 0px 160px 0px",
  },
);

/**
 * Si una página nueva todavía no llena el viewport, continuar cargando hasta
 * que el indicador quede fuera del área visible.
 */
watch(
  [() => props.loading, loadingMore, () => props.hasMore],
  async ([loading, loadingNext, hasMore]) => {
    if (loading || loadingNext || !hasMore) return;
    await nextTick();

    const root = scrollArea.value?.$el;
    const sentinel = loadSentinel.value;
    if (!root || !sentinel) return;

    const rootRect = root.getBoundingClientRect();
    const sentinelRect = sentinel.getBoundingClientRect();
    if (sentinelRect.top <= rootRect.bottom + 160) {
      await loadNextPage();
    }
  },
  { flush: "post" },
);
</script>

<template>
  <UScrollArea
    ref="scrollArea"
    shadow
    class="max-h-[70vh]"
    :aria-label="ariaLabel"
  >
    <slot />

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
  </UScrollArea>
</template>
