<script setup lang="ts">
type SearchItem = {
  id: string;
  label: string;
  suffix?: string;
  description?: string;
  /** Resultado del acta (para badge en el palette). */
  resultado?: string;
  proyecto?: string;
  to?: string;
  target?: string;
  icon?: string;
  avatar?: { src: string };
};

const { chamber, otherChamber, otherChamberUrl } = useChamber();
const { localFetch } = useLocalApi();

const open = ref(false);
const searchTerm = ref("");
const loading = ref(false);

const members = ref<SearchItem[]>([]);
const groups = ref<SearchItem[]>([]);
const actas = ref<SearchItem[]>([]);
let loadedFor: string | null = null;

async function loadCatalog() {
  const id = chamber.value.id;
  if (loadedFor === id) return;

  loading.value = true;
  try {
    const catalog = await localFetch<{
      members: SearchItem[];
      groups: SearchItem[];
      actas: SearchItem[];
    }>("/api/search-catalog");

    members.value = catalog.members || [];
    groups.value = catalog.groups || [];
    actas.value = catalog.actas || [];
    loadedFor = id;
  } finally {
    loading.value = false;
  }
}

watch(open, (isOpen) => {
  if (isOpen) void loadCatalog();
});

watch(
  () => chamber.value.id,
  () => {
    loadedFor = null;
    members.value = [];
    groups.value = [];
    actas.value = [];
  },
);

const pageItems = computed<SearchItem[]>(() => [
  {
    id: "page-home",
    label: "Inicio",
    suffix: "Página",
    icon: "i-lucide-house",
    to: "/",
  },
  {
    id: "page-actas",
    label: "Votaciones",
    suffix: "Página",
    icon: "i-lucide-file-text",
    to: "/actas",
  },
  {
    id: "page-members",
    label: chamber.value.membersLabel,
    suffix: "Página",
    icon: "i-lucide-users",
    to: chamber.value.membersPath,
  },
  {
    id: "page-groups",
    label: chamber.value.groupsLabel,
    suffix: "Página",
    icon: "i-lucide-shapes",
    to: chamber.value.groupsPath,
  },
  {
    id: "page-other-chamber",
    label: otherChamber.value.membersLabel,
    suffix: "Otra cámara",
    icon: "i-lucide-external-link",
    to: otherChamberUrl.value,
    target: "_blank",
  },
]);
const paletteGroups = computed(() => {
  const term = searchTerm.value.trim();
  const showAllActas = term.length >= 2;

  const result: { id: string; label: string; items: SearchItem[] }[] = [
    {
      id: "pages",
      label: "Páginas",
      items: pageItems.value,
    },
  ];

  if (members.value.length) {
    result.push({
      id: "members",
      label: chamber.value.membersLabel,
      items: members.value,
    });
  }

  if (groups.value.length) {
    result.push({
      id: "groups",
      label: chamber.value.groupsLabel,
      items: groups.value,
    });
  }

  if (actas.value.length) {
    result.push({
      id: "actas",
      label: showAllActas ? "Votaciones" : "Votaciones recientes",
      items: showAllActas ? actas.value : actas.value.slice(0, 24),
    });
  }

  return result;
});

const itemCount = computed(() =>
  paletteGroups.value.reduce((n, g) => n + g.items.length, 0),
);

const placeholder = computed(
  () =>
    `Buscar ${chamber.value.membersLabel.toLowerCase()}, ${chamber.value.groupsLabel.toLowerCase()}, acta…`,
);
</script>

<template>
  <UDashboardSearch
    v-model:open="open"
    v-model:search-term="searchTerm"
    :groups="paletteGroups"
    :loading="loading"
    :color-mode="false"
    :placeholder="placeholder"
    :fuse="{
      fuseOptions: {
        keys: ['label', 'suffix', 'description', 'resultado', 'proyecto'],
        threshold: 0.28,
        ignoreLocation: true,
      },
      resultLimit: 96,
    }"
    :virtualize="itemCount > 48"
  >
    <template #item-description="{ item }">
      <div
        v-if="(item as SearchItem).resultado"
        class="flex items-center gap-1.5 min-w-0"
      >
        <ResultadoBadge
          :resultado="(item as SearchItem).resultado"
          size="sm"
        />
        <span
          v-if="(item as SearchItem).proyecto"
          class="truncate text-muted"
        >
          {{ (item as SearchItem).proyecto }}
        </span>
      </div>
      <span v-else-if="(item as SearchItem).description">
        {{ (item as SearchItem).description }}
      </span>
    </template>
  </UDashboardSearch>
</template>
