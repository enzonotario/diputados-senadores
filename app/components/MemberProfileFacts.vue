<script setup lang="ts">
import type { ProfileFactSection } from "@/utils/memberProfile";

const props = defineProps<{
  sections: ProfileFactSection[];
}>();

const visibleSections = computed(() =>
  props.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.hideEmpty === false) return true;
        const v = item.value;
        return v != null && String(v).trim() !== "" && String(v).trim() !== "—";
      }),
    }))
    .filter((section) => section.items.length > 0),
);
</script>

<template>
  <div
    v-if="visibleSections.length"
    class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
  >
    <section
      v-for="section in visibleSections"
      :key="section.title"
      class="rounded-lg border border-default bg-elevated/30 p-4 space-y-3"
    >
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
        {{ section.title }}
      </h2>
      <dl class="space-y-3">
        <div v-for="item in section.items" :key="item.label" class="min-w-0">
          <dt class="text-xs text-muted">{{ item.label }}</dt>
          <dd class="text-sm text-highlighted break-words">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="hover:underline font-medium"
            >
              {{ item.value }}
            </NuxtLink>
            <a
              v-else-if="item.href"
              :href="item.href"
              class="hover:underline font-medium"
              :target="item.href.startsWith('http') ? '_blank' : undefined"
              :rel="
                item.href.startsWith('http')
                  ? 'noopener noreferrer'
                  : undefined
              "
            >
              {{ item.value }}
            </a>
            <span v-else>{{ item.value }}</span>
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>
