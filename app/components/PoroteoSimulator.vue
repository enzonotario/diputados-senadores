<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import { useDebounceFn } from "@vueuse/core";
import { domToPng } from "modern-screenshot";
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
const exporting = ref(false);
const copyingImage = ref(false);
const sharing = ref(false);
const exportRoot = ref<HTMLElement | null>(null);
const toast = useToast();
const panelLayout = useLocalStorage<"grupos" | "tabla">(
  "poroteo-panel-layout",
  "grupos",
  { initOnMounted: true },
);
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
  color: "success" | "error" | "warning" | "info";
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
];

const votoSelectItems = POROTEO_ACTIONS.map((a) => ({
  label: a.label,
  value: a.tipo,
}));

function votoSelectColor(
  tipo: PoroteoVoto,
): "success" | "error" | "warning" | "info" | "neutral" {
  return POROTEO_ACTIONS.find((a) => a.tipo === tipo)?.color ?? "neutral";
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
  if (!import.meta.client) return;
  const ids = memberIds();
  if (!ids.length) return;

  const key = props.storageKey;
  const urlEncoded = String(route.query[POROTEO_SHARE_QUERY] || "");
  // Re-bootstrap si cambia storage o llega `?s=` nueva.
  const bootKey = `${key}::${urlEncoded}`;
  if (bootstrappedKey.value === bootKey) return;

  suppressUrlWrite.value = true;
  bootstrappedKey.value = bootKey;

  const fromUrl = decodePoroteoShare(urlEncoded, ids);
  if (fromUrl) {
    votes.value = fillMissingVotes(fromUrl);
  } else {
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
  }

  nextTick(() => {
    suppressUrlWrite.value = false;
  });
}

watch(
  () => [props.storageKey, props.members.map((m) => m.id).join(",")] as const,
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

const counts = computed(() =>
  countPoroteoVotes(props.members, votes.value),
);

const groupColors = computed(() => poroteoGroupColors());

const accentColors = computed(() => {
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
    const raw =
      (props.groupField === "bloque" ? m.bloque : m.partido)?.trim() ||
      "Sin dato";
    const list = map.get(raw);
    if (list) list.push(m);
    else map.set(raw, [m]);
  }
  return [...map.entries()]
    .map(([key, members]) => ({
      key,
      label: key === "Sin dato" ? `Sin ${props.groupField}` : key,
      color: accentColors.value[key] || "#6b7280",
      members,
      counts: countPoroteoVotes(members, votes.value),
    }))
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
      (props.groupField === "bloque" ? m.bloque : m.partido)?.trim() || "—",
    voto: voteOf(votes.value, m.id),
  })),
);

/** Foto + nombre fijos a la izquierda al scrollear horizontal. */
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
    {
      id: "grupo",
      accessorKey: "grupo",
      header: sortableHeader(
        props.groupField === "bloque" ? "Bloque" : "Partido",
      ),
      size: 200,
      meta: {
        class: {
          th: "min-w-36",
          td: "min-w-36",
        },
      },
    },
    {
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
    },
    {
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
    },
  ];
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
    [key]: !expandedGroups.value[key],
  };
}

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

/** Clipboard API + fallback (p. ej. http://*.localhost.test sin secure context). */
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
  const dataUrl = await domToPng(exportRoot.value, {
    scale: 2,
    backgroundColor: "#0a0a0a",
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) {
    return new Blob([blob], { type: "image/png" });
  }
  return blob;
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

    // Chrome exige ClipboardItem con Promise para image/png en algunos flujos.
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
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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

    <p class="text-sm text-muted">
      Clic en un asiento para ciclar el voto, o usá la vista tabla / los
      botones por {{ groupField }} para asignar en bloque.
    </p>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div
        class="w-full sm:w-[min(58%,40rem)] sm:shrink-0 sm:sticky sm:top-[calc(var(--ui-header-height)+1rem)] sm:self-start space-y-4"
      >
        <AppDataSkeleton v-if="pending" variant="list" />
        <template v-else>
          <UCard :ui="{ body: 'p-4 sm:p-6' }">
            <HemicicloChart
              :members="hemicicloMembers"
              :group-colors="groupColors"
              group-by="tipoVoto"
              :group-order="[...POROTEO_VOTO_ORDER]"
              :group-label="groupLabel"
              :member-base-path="memberBasePath"
              editable
              :clickable="false"
              show-photos
              :show-legend="false"
              @select="onSeatSelect"
            />

            <div
              class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
              :class="members.length ? '' : 'opacity-50'"
            >
              <div
                v-for="action in POROTEO_ACTIONS"
                :key="action.tipo"
                class="rounded-lg px-3 py-2.5 text-center text-white"
                :style="{
                  backgroundColor: groupColors[action.tipo],
                }"
              >
                <p
                  class="text-[0.65rem] font-semibold uppercase tracking-wide opacity-90"
                >
                  {{ action.label }}
                </p>
                <p class="text-2xl font-bold tabular-nums leading-tight">
                  {{ counts[action.tipo] }}
                </p>
              </div>
            </div>
          </UCard>

          <div
            class="pointer-events-none fixed -left-[9999px] top-0 w-[720px]"
            aria-hidden="true"
          >
            <div
              ref="exportRoot"
              class="bg-[#0a0a0a] px-8 py-10 text-white"
            >
              <p
                class="mb-6 text-center text-xl font-bold tracking-tight text-white"
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
                :editable="false"
                :clickable="false"
                show-photos
                :show-legend="false"
                forced-color-mode="dark"
              />
              <div class="mt-8 grid grid-cols-3 gap-3">
                <div
                  class="rounded-md px-3 py-3 text-center font-bold"
                  style="background: #14b8a6"
                >
                  A FAVOR: {{ counts.afirmativo }}
                </div>
                <div
                  class="rounded-md px-3 py-3 text-center font-bold text-gray-900"
                  style="background: #fbbf24"
                >
                  INDECISOS: {{ counts.indeciso }}
                </div>
                <div
                  class="rounded-md px-3 py-3 text-center font-bold"
                  style="background: #ef4444"
                >
                  EN CONTRA: {{ counts.negativo }}
                </div>
              </div>
              <p
                v-if="counts.abstencion"
                class="mt-2 text-center text-sm text-gray-400"
              >
                Abstenciones: {{ counts.abstencion }}
              </p>
              <p class="mt-6 text-center text-xs text-gray-500">
                {{ membersLabel }} · argentinadatos.com
              </p>
            </div>
          </div>
        </template>
      </div>

      <div class="min-w-0 flex-1 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">
            {{
              panelLayout === "tabla" ? membersLabel : `Por ${groupField}`
            }}
          </h2>
          <ClientOnly>
            <UFieldGroup size="sm">
              <UButton
                color="neutral"
                :variant="panelLayout === 'grupos' ? 'solid' : 'outline'"
                icon="i-lucide-shapes"
                label="Grupos"
                @click="panelLayout = 'grupos'"
              />
              <UButton
                color="neutral"
                :variant="panelLayout === 'tabla' ? 'solid' : 'outline'"
                icon="i-lucide-table"
                label="Tabla"
                @click="panelLayout = 'tabla'"
              />
            </UFieldGroup>
            <template #fallback>
              <div class="h-8 w-40 animate-pulse rounded-md bg-elevated" />
            </template>
          </ClientOnly>
        </div>

        <AppDataSkeleton v-if="pending" variant="list" />

        <div v-else-if="panelLayout === 'grupos'" class="space-y-2">
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
                  expandedGroups[group.key]
                    ? 'i-lucide-chevron-up'
                    : 'i-lucide-chevron-down'
                "
                class="size-4 text-muted shrink-0"
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
              v-if="expandedGroups[group.key]"
              class="grid grid-cols-4 gap-2 border-t border-default pt-2 sm:grid-cols-5"
            >
              <button
                v-for="m in group.members"
                :key="m.id"
                type="button"
                class="group/avatar flex flex-col items-center gap-1 rounded-md p-1 hover:bg-elevated"
                :title="`${m.nombreCompleto} — ${poroteoLegendLabel(voteOf(votes, m.id))}`"
                @click="
                  assignMember(
                    m.id,
                    cyclePoroteoVoto(voteOf(votes, m.id)),
                  )
                "
              >
                <span
                  class="size-10 overflow-hidden rounded-full ring-2"
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
              </button>
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
    </div>
  </div>
</template>
