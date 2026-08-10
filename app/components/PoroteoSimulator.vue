<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import { useDebounceFn } from "@vueuse/core";
import { domToBlob } from "modern-screenshot";
import type { TableColumn } from "@nuxt/ui";
import { getBloqueColores } from "@/lib/diputados-data";
import { getPartidoColores } from "@/lib/senadores-data";
import {
  cyclePoroteoVoto,
  countPoroteoVotes,
  poroteoGroupColors,
  poroteoLegendLabel,
  resetVotes,
  setGroupVotes,
  voteOf,
  type PoroteoMember,
  type PoroteoVoto,
  type PoroteoVotes,
} from "@/utils/poroteo";
import {
  buildPoroteoShareUrl,
  decodePoroteoShare,
  encodePoroteoShare,
  POROTEO_SHARE_QUERY,
} from "@/utils/poroteoShare";
import { POROTEO_VOTO_ORDER } from "@/utils/votoTipo";
import { sortableHeader } from "@/utils/sortableHeader";

const props = defineProps<{
  members: PoroteoMember[];
  groupField: "bloque" | "partido";
  membersLabel: string;
  memberBasePath: string;
  pending?: boolean;
  /** Storage key suffix (chamber). */
  storageKey: string;
}>();

const route = useRoute();
const router = useRouter();
const title = useRouteQuery("titulo", "Poroteo");
const votes = ref<PoroteoVotes>({});
const expandedGroups = ref<Record<string, boolean>>({});
/** Ausente = expandido (default). Solo `false` colapsa. */
function isGroupExpanded(key: string) {
  return expandedGroups.value[key] !== false;
}
const exporting = ref(false);
const copyingImage = ref(false);
const sharing = ref(false);
const exportRoot = ref<HTMLElement | null>(null);
const toast = useToast();

const verPor = useLocalStorage<"grupo" | "provincia">("poroteo-ver-por", "grupo", {
  initOnMounted: true,
});
const verComo = useLocalStorage<"grid" | "tabla">("poroteo-ver-como", "grid", {
  initOnMounted: true,
});

interface PoroteoExportDesign {
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  padding: number;
  showPhotos: boolean;
  showTitle: boolean;
  showCounters: boolean;
  showFooter: boolean;
  colorMode: "auto" | "dark" | "light";
}

const EXPORT_DESIGN_DEFAULTS: PoroteoExportDesign = {
  backgroundColor: "#0a0a0a",
  borderWidth: 0,
  borderColor: "#ffffff",
  borderRadius: 16,
  padding: 32,
  showPhotos: true,
  showTitle: true,
  showCounters: true,
  showFooter: true,
  colorMode: "auto",
};

const EXPORT_BG_PRESETS = [
  { label: "Oscuro", value: "#0a0a0a" },
  { label: "Claro", value: "#ffffff" },
  { label: "Slate", value: "#0f172a" },
  { label: "Crema", value: "#f5f0e8" },
] as const;

const exportDesign = useLocalStorage<PoroteoExportDesign>(
  "poroteo-export-design",
  { ...EXPORT_DESIGN_DEFAULTS },
  { mergeDefaults: true, initOnMounted: true },
);

function hexLuminance(hex: string): number {
  const raw = hex.trim().replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const m = full.match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return 0;
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = toLin(parseInt(m[1]!, 16));
  const g = toLin(parseInt(m[2]!, 16));
  const b = toLin(parseInt(m[3]!, 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const exportIsLightBg = computed(
  () => hexLuminance(exportDesign.value.backgroundColor) > 0.45,
);
const exportTextColor = computed(() =>
  exportIsLightBg.value ? "#111827" : "#ffffff",
);
const exportMutedColor = computed(() =>
  exportIsLightBg.value ? "#6b7280" : "#9ca3af",
);
const exportForcedColorMode = computed<"dark" | "light">(() => {
  if (exportDesign.value.colorMode === "auto") {
    return exportIsLightBg.value ? "light" : "dark";
  }
  return exportDesign.value.colorMode;
});
const exportRootStyle = computed(() => {
  const d = exportDesign.value;
  return {
    backgroundColor: d.backgroundColor,
    color: exportTextColor.value,
    borderWidth: `${d.borderWidth}px`,
    borderStyle: d.borderWidth > 0 ? "solid" : "none",
    borderColor: d.borderColor,
    borderRadius: `${d.borderRadius}px`,
    padding: `${d.padding}px`,
  } as Record<string, string>;
});

function resetExportDesign() {
  exportDesign.value = { ...EXPORT_DESIGN_DEFAULTS };
}

const dockExpanded = ref(false);
const dockPinned = ref(false);
const designPanelOpen = ref(false);

function openExportDesign() {
  dockExpanded.value = true;
  dockPinned.value = true;
  designPanelOpen.value = true;
}

function toggleDesignPanel() {
  if (!designPanelOpen.value) {
    openExportDesign();
    return;
  }
  designPanelOpen.value = false;
}
const dockBarRef = ref<HTMLElement | null>(null);
const hemiZoneRef = ref<HTMLElement | null>(null);

const { sorting } = useTableSorting("nombreCompleto", false, {
  syncQuery: false,
});

/** Evita que el write a URL pise el bootstrap desde `?s=`. */
const suppressUrlWrite = ref(true);
const bootstrappedKey = ref("");

const POROTEO_ACTIONS: {
  tipo: PoroteoVoto;
  label: string;
  short: string;
  color: "success" | "error" | "warning" | "info" | "neutral";
}[] = [
  { tipo: "afirmativo", label: "A favor", short: "Favor", color: "success" },
  { tipo: "negativo", label: "En contra", short: "Contra", color: "error" },
  { tipo: "indeciso", label: "Indecisos", short: "Indec.", color: "warning" },
  {
    tipo: "abstencion",
    label: "Abstención",
    short: "Abst.",
    color: "info",
  },
  { tipo: "ausente", label: "Ausentes", short: "Aus.", color: "neutral" },
];

const dockLeftActions = POROTEO_ACTIONS.filter((a) =>
  a.tipo === "afirmativo" || a.tipo === "negativo" || a.tipo === "indeciso",
);
const dockRightActions = POROTEO_ACTIONS.filter(
  (a) => a.tipo === "abstencion" || a.tipo === "ausente",
);

const verPorGroupLabel = computed(() =>
  props.groupField === "bloque" ? "Bloque" : "Partido",
);

const votoSelectItems = POROTEO_ACTIONS.map((a) => ({
  label: a.label,
  value: a.tipo,
}));

function votoSelectColor(
  tipo: PoroteoVoto,
): "success" | "error" | "warning" | "info" | "neutral" {
  return POROTEO_ACTIONS.find((a) => a.tipo === tipo)?.color ?? "neutral";
}

function votoBadgeTextClass(tipo: PoroteoVoto): string {
  return tipo === "indeciso" ? "text-gray-900" : "text-white";
}

function votoAction(tipo: PoroteoVoto) {
  return POROTEO_ACTIONS.find((a) => a.tipo === tipo);
}

function memberVotoMenuItems(memberId: string) {
  const current = voteOf(votes.value, memberId);
  return [
    POROTEO_ACTIONS.map((action) => ({
      label: action.label,
      color: action.color,
      icon: current === action.tipo ? "i-lucide-check" : undefined,
      onSelect: () => assignMember(memberId, action.tipo),
    })),
  ];
}

function memberIds(): string[] {
  return props.members.map((m) => m.id);
}

function fillMissingVotes(base: PoroteoVotes): PoroteoVotes {
  const next = { ...base };
  for (const id of memberIds()) {
    if (!next[id]) next[id] = "indeciso";
  }
  return next;
}

function bootstrapVotes() {
  const ids = memberIds();
  if (!ids.length) return;

  const key = props.storageKey;
  const urlEncoded = String(route.query[POROTEO_SHARE_QUERY] || "");
  const bootKey = `${key}::${urlEncoded}`;
  if (bootstrappedKey.value === bootKey) return;

  suppressUrlWrite.value = true;
  bootstrappedKey.value = bootKey;

  // Preferir `?s=` también en SSR para que badges/colores no hidraten como indeciso.
  const fromUrl = decodePoroteoShare(urlEncoded, ids);
  if (fromUrl) {
    votes.value = fillMissingVotes(fromUrl);
  } else if (import.meta.client) {
    try {
      const raw = localStorage.getItem(`poroteo:${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as PoroteoVotes;
        votes.value = fillMissingVotes(
          parsed && typeof parsed === "object" ? parsed : {},
        );
      } else {
        votes.value = resetVotes(ids);
      }
    } catch {
      votes.value = resetVotes(ids);
    }
  } else {
    votes.value = resetVotes(ids);
  }

  nextTick(() => {
    suppressUrlWrite.value = false;
  });
}

watch(
  () =>
    [
      props.storageKey,
      props.members.map((m) => m.id).join(","),
      String(route.query[POROTEO_SHARE_QUERY] || ""),
    ] as const,
  () => bootstrapVotes(),
  { immediate: true },
);

function applyShareToUrl() {
  if (!import.meta.client || suppressUrlWrite.value) return;
  const encoded = encodePoroteoShare(votes.value);
  const nextQuery: Record<string, string | string[] | undefined | null> = {
    ...route.query,
  };
  if (encoded) nextQuery[POROTEO_SHARE_QUERY] = encoded;
  else delete nextQuery[POROTEO_SHARE_QUERY];

  const cur = String(route.query[POROTEO_SHARE_QUERY] || "");
  const nxt = encoded || "";
  if (cur === nxt) return;

  return router.replace({ query: nextQuery });
}

const syncShareToUrl = useDebounceFn(applyShareToUrl, 400);

watch(
  votes,
  (v) => {
    if (!import.meta.client || !props.storageKey) return;
    try {
      localStorage.setItem(`poroteo:${props.storageKey}`, JSON.stringify(v));
    } catch {
      /* ignore quota */
    }
    syncShareToUrl();
  },
  { deep: true },
);

const hemicicloMembers = computed(() =>
  props.members.map((m) => ({
    ...m,
    tipoVoto: voteOf(votes.value, m.id),
  })),
);

const counts = computed(() => countPoroteoVotes(props.members, votes.value));

const groupColors = computed(() => poroteoGroupColors());

const accentColors = computed(() => {
  if (verPor.value === "provincia") return {} as Record<string, string>;
  const keys = [
    ...new Set(
      props.members
        .map((m) =>
          props.groupField === "bloque" ? m.bloque : m.partido,
        )
        .filter(Boolean) as string[],
    ),
  ];
  return props.groupField === "bloque"
    ? getBloqueColores(keys)
    : getPartidoColores(keys);
});

type PoroteoGroup = {
  key: string;
  label: string;
  color: string;
  members: PoroteoMember[];
  counts: Record<PoroteoVoto, number>;
};

const groups = computed<PoroteoGroup[]>(() => {
  const map = new Map<string, PoroteoMember[]>();
  for (const m of props.members) {
    let raw: string;
    if (verPor.value === "provincia") {
      raw = m.provincia?.trim() || "Sin dato";
    } else {
      raw =
        (props.groupField === "bloque" ? m.bloque : m.partido)?.trim() ||
        "Sin dato";
    }
    const list = map.get(raw);
    if (list) list.push(m);
    else map.set(raw, [m]);
  }
  return [...map.entries()]
    .map(([key, members]) => {
      let label: string;
      let color: string;
      if (verPor.value === "provincia") {
        label = key === "Sin dato" ? "Sin provincia" : key;
        color = "#6b7280";
      } else {
        label = key === "Sin dato" ? `Sin ${props.groupField}` : key;
        color = accentColors.value[key] || "#6b7280";
      }
      return {
        key,
        label,
        color,
        members,
        counts: countPoroteoVotes(members, votes.value),
      };
    })
    .sort((a, b) => b.members.length - a.members.length);
});

type PoroteoTableRow = PoroteoMember & {
  grupo: string;
  voto: PoroteoVoto;
};

const tableRows = computed<PoroteoTableRow[]>(() =>
  props.members.map((m) => ({
    ...m,
    grupo:
      verPor.value === "provincia"
        ? m.provincia?.trim() || "—"
        : (props.groupField === "bloque" ? m.bloque : m.partido)?.trim() ||
          "—",
    voto: voteOf(votes.value, m.id),
  })),
);

const columnPinning = ref({
  left: ["foto", "nombreCompleto"],
  right: [] as string[],
});

const tableColumns = computed(() => {
  const cols: TableColumn<PoroteoTableRow>[] = [
    {
      id: "foto",
      accessorKey: "foto",
      header: "",
      enableSorting: false,
      size: 56,
      meta: {
        class: {
          th: "w-14 px-2",
          td: "w-14 px-2",
        },
      },
    },
    {
      id: "nombreCompleto",
      accessorKey: "nombreCompleto",
      header: sortableHeader("Nombre"),
      size: 220,
      meta: {
        class: {
          th: "min-w-44",
          td: "min-w-44",
        },
      },
    },
  ];

  if (verPor.value === "grupo") {
    cols.push({
      id: "grupo",
      accessorKey: "grupo",
      header: sortableHeader(verPorGroupLabel.value),
      size: 200,
      meta: {
        class: {
          th: "min-w-36",
          td: "min-w-36",
        },
      },
    });
  } else {
    cols.push({
      id: "provincia",
      accessorKey: "provincia",
      header: sortableHeader("Provincia"),
      size: 140,
      meta: {
        class: {
          th: "min-w-28",
          td: "min-w-28",
        },
      },
    });
  }

  cols.push({
    id: "voto",
    accessorKey: "voto",
    header: sortableHeader("Intención"),
    size: 180,
    meta: {
      class: {
        th: "min-w-44",
        td: "min-w-44",
      },
    },
  });

  return cols;
});

function onSeatSelect(member: { id: string }) {
  const cur = voteOf(votes.value, member.id);
  votes.value = {
    ...votes.value,
    [member.id]: cyclePoroteoVoto(cur),
  };
}

function assignGroup(group: PoroteoGroup, tipo: PoroteoVoto) {
  votes.value = setGroupVotes(
    votes.value,
    group.members.map((m) => m.id),
    tipo,
  );
}

function assignMember(id: string, tipo: PoroteoVoto) {
  votes.value = { ...votes.value, [id]: tipo };
}

function toggleGroup(key: string) {
  expandedGroups.value = {
    ...expandedGroups.value,
    [key]: !isGroupExpanded(key),
  };
}

watch(verPor, () => {
  expandedGroups.value = {};
});

function expandDock() {
  cancelDockCollapse();
  dockExpanded.value = true;
}

let dockCollapseTimer: ReturnType<typeof setTimeout> | null = null;

function cancelDockCollapse() {
  if (dockCollapseTimer) {
    clearTimeout(dockCollapseTimer);
    dockCollapseTimer = null;
  }
}

function scheduleDockCollapse() {
  cancelDockCollapse();
  dockCollapseTimer = setTimeout(() => {
    if (!dockPinned.value && !designPanelOpen.value) {
      dockExpanded.value = false;
    }
  }, 200);
}

function onHemiZoneLeave() {
  scheduleDockCollapse();
}

function toggleDockPin() {
  if (dockExpanded.value && dockPinned.value) {
    closeDock();
    return;
  }
  dockPinned.value = true;
  dockExpanded.value = true;
}

function closeDock() {
  cancelDockCollapse();
  dockExpanded.value = false;
  dockPinned.value = false;
  designPanelOpen.value = false;
}

function onDockKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && dockExpanded.value) closeDock();
}

onMounted(() => {
  if (!import.meta.client) return;
  window.addEventListener("keydown", onDockKeydown);
});

onUnmounted(() => {
  cancelDockCollapse();
  if (!import.meta.client) return;
  window.removeEventListener("keydown", onDockKeydown);
});

function clearAll() {
  votes.value = resetVotes(props.members.map((m) => m.id));
  toast.add({
    title: "Poroteo reiniciado",
    description: "Todos quedaron como indecisos.",
    color: "neutral",
  });
}

async function copyShareUrl() {
  if (!import.meta.client || sharing.value) return;
  sharing.value = true;
  try {
    const url = buildPoroteoShareUrl(
      window.location.href,
      votes.value,
      String(title.value || ""),
    );
    const parsed = new URL(url);
    const nextQuery: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      nextQuery[key] = value;
    });
    await router.replace({ query: nextQuery });
    await copyTextToClipboard(url);
    toast.add({
      title: "Link copiado",
      description: "Quien abra el link verá esta simulación.",
      color: "success",
    });
  } catch (e: any) {
    toast.add({
      title: "No se pudo copiar",
      description: e?.message || "Probá de nuevo.",
      color: "error",
    });
  } finally {
    sharing.value = false;
  }
}

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("El navegador bloqueó el portapapeles");
}

async function renderExportPngBlob(): Promise<Blob> {
  if (!exportRoot.value) throw new Error("No hay imagen para exportar");
  // Asegurar layout (el preview vive en el modal o offscreen con el mismo markup).
  await nextTick();
  const blob = await domToBlob(exportRoot.value, {
    scale: 2,
    backgroundColor: exportDesign.value.backgroundColor,
    // Evitar controles de UI si quedaran dentro del nodo.
    filter: (el) => {
      if (!(el instanceof HTMLElement)) return true;
      return !el.hasAttribute("data-export-ignore");
    },
  });
  if (!blob) throw new Error("No se pudo generar la imagen");
  return blob.type.startsWith("image/")
    ? blob
    : new Blob([blob], { type: "image/png" });
}

async function exportPng() {
  if (!exportRoot.value || exporting.value || copyingImage.value) return;
  exporting.value = true;
  try {
    const blob = await renderExportPngBlob();
    const dataUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = String(title.value || "poroteo")
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    a.href = dataUrl;
    a.download = `${slug || "poroteo"}.png`;
    a.click();
    URL.revokeObjectURL(dataUrl);
    toast.add({
      title: "Imagen descargada",
      description: "Lista para compartir.",
      color: "success",
    });
  } catch (e: any) {
    toast.add({
      title: "No se pudo exportar",
      description: e?.message || "Probá de nuevo.",
      color: "error",
    });
  } finally {
    exporting.value = false;
  }
}

async function copyImageToClipboard() {
  if (!exportRoot.value || copyingImage.value || exporting.value) return;
  copyingImage.value = true;
  try {
    const blob = await renderExportPngBlob();
    const pngBlob =
      blob.type === "image/png"
        ? blob
        : new Blob([await blob.arrayBuffer()], { type: "image/png" });

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard?.write ||
      typeof ClipboardItem === "undefined"
    ) {
      throw new Error(
        "Este navegador no permite copiar imágenes al portapapeles. Usá Descargar imagen.",
      );
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob,
      }),
    ]);
    toast.add({
      title: "Imagen copiada",
      description: "Pegala en X/Twitter u otra app (Ctrl/⌘+V).",
      color: "success",
    });
  } catch (e: any) {
    toast.add({
      title: "No se pudo copiar la imagen",
      description: e?.message || "Probá Descargar imagen.",
      color: "error",
    });
  } finally {
    copyingImage.value = false;
  }
}

function groupLabel(key: string) {
  return poroteoLegendLabel(key as PoroteoVoto);
}

const groupsSectionTitle = computed(() => {
  if (verComo.value === "tabla") return props.membersLabel;
  return verPor.value === "provincia"
    ? "Por provincia"
    : `Por ${props.groupField}`;
});
</script>

<template>
  <div class="flex flex-col gap-6 pb-36">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <UFormField label="Título del poroteo" class="w-full max-w-xl">
        <UInput
          v-model="title"
          placeholder="Ej. Ley de Tierras — capítulo X"
          size="lg"
        />
      </UFormField>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-rotate-ccw"
          label="Reiniciar"
          @click="clearAll"
        />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-link"
          :loading="sharing"
          label="Copiar link"
          @click="copyShareUrl"
        />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-palette"
          label="Diseño imagen"
          @click="openExportDesign"
        />
        <UButton
          color="primary"
          variant="outline"
          icon="i-lucide-copy"
          :loading="copyingImage"
          label="Copiar imagen"
          @click="copyImageToClipboard"
        />
        <UButton
          color="primary"
          icon="i-lucide-download"
          :loading="exporting"
          label="Descargar imagen"
          @click="exportPng"
        />
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <ClientOnly>
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium text-muted">Ver por:</span>
            <UFieldGroup size="sm">
              <UButton
                color="neutral"
                :variant="verPor === 'grupo' ? 'solid' : 'outline'"
                :label="verPorGroupLabel"
                @click="verPor = 'grupo'"
              />
              <UButton
                color="neutral"
                :variant="verPor === 'provincia' ? 'solid' : 'outline'"
                label="Provincia"
                @click="verPor = 'provincia'"
              />
            </UFieldGroup>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium text-muted">Ver como:</span>
            <UFieldGroup size="sm">
              <UButton
                color="neutral"
                :variant="verComo === 'grid' ? 'solid' : 'outline'"
                icon="i-lucide-layout-grid"
                label="Grid"
                @click="verComo = 'grid'"
              />
              <UButton
                color="neutral"
                :variant="verComo === 'tabla' ? 'solid' : 'outline'"
                icon="i-lucide-table"
                label="Tabla"
                @click="verComo = 'tabla'"
              />
            </UFieldGroup>
          </div>
        </div>
        <template #fallback>
          <div class="h-8 w-72 animate-pulse rounded-md bg-elevated" />
        </template>
      </ClientOnly>
    </div>

    <p class="text-sm text-muted">
      Clic en un asiento del hemiciclo para ciclar el voto, o usá la vista
      {{ verComo === "tabla" ? "tabla" : "grid" }} para asignar en bloque.
    </p>

    <AppDataSkeleton v-if="pending" variant="list" />

    <template v-else>
      <div class="space-y-3">
        <h2 class="text-lg font-semibold">
          {{ groupsSectionTitle }}
        </h2>

        <div v-if="verComo === 'grid'" class="space-y-2">
          <UCard
            v-for="group in groups"
            :key="group.key"
            :ui="{ body: 'p-3 space-y-2.5' }"
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 text-left"
              @click="toggleGroup(group.key)"
            >
              <span
                class="size-3 shrink-0 rounded-full ring-2 ring-default"
                :style="{ backgroundColor: group.color }"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 truncate font-medium">
                {{ group.label }}
              </span>
              <UBadge variant="subtle" color="neutral" size="sm">
                {{ group.members.length }}
              </UBadge>
              <UIcon
                :name="
                  isGroupExpanded(group.key)
                    ? 'i-lucide-chevron-up'
                    : 'i-lucide-chevron-down'
                "
                class="size-4 shrink-0 text-muted"
              />
            </button>

            <div class="flex flex-wrap gap-1">
              <UButton
                v-for="action in POROTEO_ACTIONS"
                :key="action.tipo"
                size="xs"
                :color="action.color"
                :variant="
                  group.counts[action.tipo] > 0 ? 'soft' : 'outline'
                "
                :aria-label="`Asignar ${group.label} a ${action.label}`"
                :label="`${action.short} ${group.counts[action.tipo]}`"
                @click.stop="assignGroup(group, action.tipo)"
              />
            </div>

            <div
              v-if="isGroupExpanded(group.key)"
              class="grid grid-cols-3 gap-2 border-t border-default pt-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
            >
              <div
                v-for="m in group.members"
                :key="m.id"
                class="relative flex min-w-0 flex-col items-center rounded-md pt-1 hover:bg-elevated"
              >
                <UDropdownMenu
                  :items="memberVotoMenuItems(m.id)"
                  :content="{ align: 'end', side: 'bottom', sideOffset: 4 }"
                  size="sm"
                  :ui="{ content: 'min-w-40' }"
                >
                  <button
                    type="button"
                    class="absolute right-0.5 top-0.5 z-10 cursor-pointer rounded-sm px-1.5 py-0 text-[0.6rem] font-semibold leading-4 shadow-sm"
                    :class="votoBadgeTextClass(voteOf(votes, m.id))"
                    :style="{
                      backgroundColor: groupColors[voteOf(votes, m.id)],
                    }"
                    :aria-label="`Cambiar voto de ${m.nombreCompleto}`"
                    @click.stop
                  >
                    {{ votoAction(voteOf(votes, m.id))?.short }}
                  </button>
                </UDropdownMenu>

                <button
                  type="button"
                  class="flex w-full min-w-0 flex-col items-center gap-1.5 rounded-md p-1.5 pt-4"
                  :title="`${m.nombreCompleto} — ${poroteoLegendLabel(voteOf(votes, m.id))}`"
                  @click="
                    assignMember(
                      m.id,
                      cyclePoroteoVoto(voteOf(votes, m.id)),
                    )
                  "
                >
                  <span
                    class="size-10 shrink-0 overflow-hidden rounded-full ring-2"
                    :style="{
                      boxShadow: `0 0 0 2px ${groupColors[voteOf(votes, m.id)]}`,
                    }"
                  >
                    <img
                      v-if="m.foto"
                      :src="m.foto"
                      :alt="m.nombreCompleto || ''"
                      class="size-full object-cover"
                      loading="lazy"
                    />
                    <span
                      v-else
                      class="flex size-full items-center justify-center bg-elevated text-xs font-bold"
                    >
                      {{
                        (m.apellido || m.nombreCompleto || "?").slice(0, 2)
                      }}
                    </span>
                  </span>
                  <span class="w-full min-w-0 text-center">
                    <span
                      class="block truncate text-xs font-semibold leading-tight text-highlighted"
                    >
                      {{ m.apellido || m.nombreCompleto || "—" }}
                    </span>
                    <span
                      v-if="m.nombre"
                      class="mt-0.5 block truncate text-[0.65rem] leading-tight text-muted line-clamp-1"
                    >
                      {{ m.nombre }}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </UCard>
        </div>

        <DataTableCard v-else :show-periodo-badge="false">
          <UTable
            v-model:sorting="sorting"
            v-model:column-pinning="columnPinning"
            :data="tableRows"
            :columns="tableColumns"
            :get-row-id="(row) => row.id"
            :ui="{
              base: 'w-full min-w-[48rem]',
            }"
            empty="No hay legisladores vigentes."
          >
            <template #foto-cell="{ row }">
              <span
                class="inline-flex size-9 overflow-hidden rounded-full ring-2"
                :style="{
                  boxShadow: `0 0 0 2px ${groupColors[row.original.voto]}`,
                }"
              >
                <img
                  v-if="row.original.foto"
                  :src="row.original.foto"
                  :alt="row.original.nombreCompleto || ''"
                  class="size-full object-cover"
                  loading="lazy"
                />
                <span
                  v-else
                  class="flex size-full items-center justify-center bg-elevated text-xs font-bold"
                >
                  {{
                    (
                      row.original.apellido ||
                      row.original.nombreCompleto ||
                      "?"
                    ).slice(0, 2)
                  }}
                </span>
              </span>
            </template>
            <template #nombreCompleto-cell="{ row }">
              <NuxtLink
                :to="`${memberBasePath}/${row.original.id}`"
                class="font-medium hover:underline"
                @click.stop
              >
                {{ row.original.nombreCompleto }}
              </NuxtLink>
            </template>
            <template #grupo-cell="{ row }">
              <span class="text-sm">{{ row.original.grupo }}</span>
            </template>
            <template #provincia-cell="{ row }">
              <span class="text-sm">{{ row.original.provincia || "—" }}</span>
            </template>
            <template #voto-cell="{ row }">
              <USelect
                :model-value="row.original.voto"
                :items="votoSelectItems"
                size="sm"
                :color="votoSelectColor(row.original.voto)"
                class="w-40"
                @update:model-value="
                  (v: string) =>
                    assignMember(row.original.id, v as PoroteoVoto)
                "
              />
            </template>
          </UTable>
        </DataTableCard>
      </div>
    </template>

    <ClientOnly>
      <Teleport to="body">
        <!-- Backdrop solo cuando está fijado por click (evita titilar con hover). -->
        <Transition
          enter-active-class="transition-opacity duration-150 ease-out"
          enter-from-class="opacity-0"
          leave-active-class="transition-opacity duration-100 ease-in"
          leave-to-class="opacity-0"
        >
          <div
            v-if="dockExpanded && dockPinned"
            class="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[1px]"
            aria-hidden="true"
            @click="closeDock"
          />
        </Transition>

        <div
          ref="dockBarRef"
          class="fixed inset-x-0 bottom-0 z-[60] border-t border-default bg-default/95 backdrop-blur-md supports-[backdrop-filter]:bg-default/80"
        >
          <div
            class="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3"
          >
            <div class="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <div
                v-for="action in dockLeftActions"
                :key="action.tipo"
                class="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-center text-white sm:px-3 sm:py-2"
                :style="{ backgroundColor: groupColors[action.tipo] }"
              >
                <p
                  class="truncate text-[0.6rem] font-semibold uppercase tracking-wide opacity-90 sm:text-[0.65rem]"
                >
                  {{ action.label }}
                </p>
                <p
                  class="text-lg font-bold tabular-nums leading-tight sm:text-xl"
                >
                  {{ counts[action.tipo] }}
                </p>
              </div>
            </div>

            <!-- Zona continua mini + preview: el hover no se rompe al agrandar. -->
            <div
              ref="hemiZoneRef"
              class="relative z-[70] -mt-5 shrink-0 sm:-mt-6"
              @mouseenter="expandDock"
              @mouseleave="onHemiZoneLeave"
            >
              <button
                type="button"
                class="relative block w-24 rounded-2xl bg-default p-1 shadow-lg ring-2 ring-default transition-transform duration-200 hover:scale-105 sm:w-28"
                :aria-expanded="dockExpanded"
                :aria-pressed="dockPinned"
                aria-label="Ampliar hemiciclo"
                @click.stop="toggleDockPin"
              >
                <HemicicloChart
                  :members="hemicicloMembers"
                  :group-colors="groupColors"
                  group-by="tipoVoto"
                  :group-order="[...POROTEO_VOTO_ORDER]"
                  :group-label="groupLabel"
                  :member-base-path="memberBasePath"
                  editable
                  :clickable="false"
                  :show-photos="false"
                  :show-tooltip="false"
                  :show-legend="false"
                  @select="onSeatSelect"
                />
                <UIcon
                  v-if="dockPinned"
                  name="i-lucide-pin"
                  class="absolute -right-1 -top-1 size-3.5 text-primary sm:size-4"
                  aria-hidden="true"
                />
              </button>

              <!--
                Preview = imagen final. Siempre montado: visible en el modal o
                offscreen para que Copiar/Descargar capturen el mismo nodo.
              -->
              <div
                class="transition duration-200 ease-out"
                :class="
                  dockExpanded
                    ? designPanelOpen
                      ? 'absolute bottom-[calc(100%+0.75rem)] left-1/2 w-[min(96vw,52rem)] -translate-x-1/2'
                      : 'absolute bottom-[calc(100%+0.75rem)] left-1/2 w-[min(92vw,40rem)] -translate-x-1/2'
                    : 'pointer-events-none fixed -left-[9999px] top-0 w-[720px]'
                "
                :aria-hidden="!dockExpanded"
                role="dialog"
                :aria-label="dockExpanded ? 'Vista previa de la imagen' : undefined"
                @click.stop
              >
                <div
                  v-show="dockExpanded"
                  data-export-ignore
                  class="mb-2 flex items-center justify-between gap-2 rounded-lg bg-default/95 px-2 py-1.5 shadow-sm ring-1 ring-default"
                >
                  <p class="min-w-0 flex-1 truncate text-sm font-medium text-muted">
                    Así se verá la imagen — clic en un asiento para ciclar
                  </p>
                  <div class="flex shrink-0 items-center gap-1">
                    <UButton
                      color="primary"
                      variant="outline"
                      size="xs"
                      icon="i-lucide-copy"
                      :loading="copyingImage"
                      label="Copiar"
                      @click="copyImageToClipboard"
                    />
                    <UButton
                      color="primary"
                      size="xs"
                      icon="i-lucide-download"
                      :loading="exporting"
                      label="Descargar"
                      @click="exportPng"
                    />
                    <UButton
                      color="neutral"
                      :variant="designPanelOpen ? 'solid' : 'soft'"
                      size="xs"
                      icon="i-lucide-palette"
                      label="Diseño"
                      :aria-expanded="designPanelOpen"
                      @click="toggleDesignPanel"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-x"
                      aria-label="Cerrar hemiciclo"
                      @click="closeDock"
                    />
                  </div>
                </div>

                <div
                  class="flex flex-col gap-2 sm:flex-row-reverse sm:items-stretch"
                >
                  <aside
                    v-if="designPanelOpen && dockExpanded"
                    data-export-ignore
                    class="flex max-h-[min(70vh,32rem)] w-full shrink-0 flex-col gap-3 overflow-y-auto rounded-xl bg-default p-3 shadow-xl ring-1 ring-default sm:w-64"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-semibold">Diseño</p>
                      <UButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        label="Restablecer"
                        @click="resetExportDesign"
                      />
                    </div>

                    <div class="flex flex-col gap-1.5">
                      <p class="text-xs font-medium text-muted">Fondo</p>
                      <div class="flex flex-wrap gap-1.5">
                        <button
                          v-for="preset in EXPORT_BG_PRESETS"
                          :key="preset.value"
                          type="button"
                          class="size-7 rounded-md ring-1 ring-default transition"
                          :class="
                            exportDesign.backgroundColor.toLowerCase() ===
                            preset.value
                              ? 'ring-2 ring-primary ring-offset-1 ring-offset-default'
                              : ''
                          "
                          :style="{ backgroundColor: preset.value }"
                          :title="preset.label"
                          :aria-label="`Fondo ${preset.label}`"
                          @click="exportDesign.backgroundColor = preset.value"
                        />
                        <label
                          class="relative size-7 cursor-pointer overflow-hidden rounded-md ring-1 ring-default"
                          title="Color personalizado"
                        >
                          <span class="sr-only">Color de fondo</span>
                          <input
                            v-model="exportDesign.backgroundColor"
                            type="color"
                            class="absolute inset-0 size-full cursor-pointer border-0 p-0"
                          />
                        </label>
                      </div>
                    </div>

                    <UFormField
                      :label="`Borde (${exportDesign.borderWidth}px)`"
                      class="w-full"
                    >
                      <USlider
                        v-model="exportDesign.borderWidth"
                        :min="0"
                        :max="24"
                        :step="1"
                        size="sm"
                      />
                    </UFormField>

                    <div
                      v-if="exportDesign.borderWidth > 0"
                      class="flex items-center justify-between gap-2"
                    >
                      <p class="text-xs font-medium text-muted">Color borde</p>
                      <label
                        class="relative size-7 cursor-pointer overflow-hidden rounded-md ring-1 ring-default"
                      >
                        <span class="sr-only">Color del borde</span>
                        <input
                          v-model="exportDesign.borderColor"
                          type="color"
                          class="absolute inset-0 size-full cursor-pointer border-0 p-0"
                        />
                      </label>
                    </div>

                    <UFormField
                      :label="`Esquinas (${exportDesign.borderRadius}px)`"
                      class="w-full"
                    >
                      <USlider
                        v-model="exportDesign.borderRadius"
                        :min="0"
                        :max="40"
                        :step="1"
                        size="sm"
                      />
                    </UFormField>

                    <UFormField
                      :label="`Relleno (${exportDesign.padding}px)`"
                      class="w-full"
                    >
                      <USlider
                        v-model="exportDesign.padding"
                        :min="12"
                        :max="56"
                        :step="2"
                        size="sm"
                      />
                    </UFormField>

                    <UFormField label="Tema hemiciclo" class="w-full">
                      <div class="flex flex-wrap gap-1">
                        <UButton
                          size="xs"
                          color="neutral"
                          :variant="
                            exportDesign.colorMode === 'auto'
                              ? 'solid'
                              : 'outline'
                          "
                          label="Auto"
                          @click="exportDesign.colorMode = 'auto'"
                        />
                        <UButton
                          size="xs"
                          color="neutral"
                          :variant="
                            exportDesign.colorMode === 'dark'
                              ? 'solid'
                              : 'outline'
                          "
                          label="Oscuro"
                          @click="exportDesign.colorMode = 'dark'"
                        />
                        <UButton
                          size="xs"
                          color="neutral"
                          :variant="
                            exportDesign.colorMode === 'light'
                              ? 'solid'
                              : 'outline'
                          "
                          label="Claro"
                          @click="exportDesign.colorMode = 'light'"
                        />
                      </div>
                    </UFormField>

                    <div class="flex flex-col gap-2 border-t border-default pt-2">
                      <USwitch
                        v-model="exportDesign.showTitle"
                        size="sm"
                        label="Título"
                      />
                      <USwitch
                        v-model="exportDesign.showPhotos"
                        size="sm"
                        label="Fotos"
                      />
                      <USwitch
                        v-model="exportDesign.showCounters"
                        size="sm"
                        label="Contadores"
                      />
                      <USwitch
                        v-model="exportDesign.showFooter"
                        size="sm"
                        label="Pie de página"
                      />
                    </div>
                  </aside>

                  <div class="min-w-0 flex-1">
                    <div
                      ref="exportRoot"
                      class="shadow-2xl"
                      :style="exportRootStyle"
                    >
                      <p
                        v-if="exportDesign.showTitle"
                        class="mb-5 text-center text-lg font-bold tracking-tight sm:mb-6 sm:text-xl"
                        :style="{ color: exportTextColor }"
                      >
                        {{ title || "Poroteo" }}
                      </p>
                      <HemicicloChart
                        :members="hemicicloMembers"
                        :group-colors="groupColors"
                        group-by="tipoVoto"
                        :group-order="[...POROTEO_VOTO_ORDER]"
                        :group-label="groupLabel"
                        :member-base-path="memberBasePath"
                        :editable="dockExpanded"
                        :clickable="false"
                        :show-photos="exportDesign.showPhotos"
                        :show-legend="false"
                        :forced-color-mode="exportForcedColorMode"
                        @select="onSeatSelect"
                      />
                      <div
                        v-if="exportDesign.showCounters"
                        class="mt-6 grid grid-cols-5 gap-2 sm:mt-8"
                      >
                        <div
                          v-for="action in POROTEO_ACTIONS"
                          :key="action.tipo"
                          class="rounded-md px-1.5 py-2 text-center sm:px-2 sm:py-2.5"
                          :class="
                            action.tipo === 'indeciso'
                              ? 'text-gray-900'
                              : 'text-white'
                          "
                          :style="{ backgroundColor: groupColors[action.tipo] }"
                        >
                          <p
                            class="truncate text-[0.55rem] font-semibold uppercase tracking-wide opacity-90 sm:text-[0.65rem]"
                          >
                            {{ action.label }}
                          </p>
                          <p
                            class="text-base font-bold tabular-nums leading-tight sm:text-lg"
                          >
                            {{ counts[action.tipo] }}
                          </p>
                        </div>
                      </div>
                      <p
                        v-if="exportDesign.showFooter"
                        class="mt-5 text-center text-xs sm:mt-6"
                        :style="{ color: exportMutedColor }"
                      >
                        {{ membersLabel }} · argentinadatos.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2"
            >
              <div
                v-for="action in dockRightActions"
                :key="action.tipo"
                class="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-center text-white sm:px-3 sm:py-2"
                :style="{ backgroundColor: groupColors[action.tipo] }"
              >
                <p
                  class="truncate text-[0.6rem] font-semibold uppercase tracking-wide opacity-90 sm:text-[0.65rem]"
                >
                  {{ action.label }}
                </p>
                <p
                  class="text-lg font-bold tabular-nums leading-tight sm:text-xl"
                >
                  {{ counts[action.tipo] }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>
