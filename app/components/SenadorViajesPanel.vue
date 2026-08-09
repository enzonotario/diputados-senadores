<script setup lang="ts">
import type { SenadorViajes, ViajeInternacional, ViajeNacional } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import {
  viajesFuenteUrl,
} from "@/utils/viajes";
import { viajePdfUrl } from "@/utils/staticPdf";
import SenadorViajesMap from "@/components/SenadorViajesMap.vue";

const props = withDefaults(
  defineProps<{
    viajes: SenadorViajes | null;
    /** Mostrar la tarjeta aunque no haya viajes (página dedicada). */
    showEmpty?: boolean;
    chamber?: "senadores" | "diputados";
  }>(),
  { showEmpty: false, chamber: "senadores" },
);

const fuenteUrl = computed(() => viajesFuenteUrl(props.chamber));
const isDiputados = computed(() => props.chamber === "diputados");

const tab = ref<"nacionales" | "internacionales">("nacionales");

/** Senado: tab intl si hay datos. Diputados: misiones van a /misiones. */
const showInternacionales = computed(
  () => !isDiputados.value && (props.viajes?.internacionales.length || 0) > 0,
);

const tabItems = computed(() => {
  const items = [
    {
      label: `Nacionales (${props.viajes?.nacionales.length || 0})`,
      value: "nacionales" as const,
    },
  ];
  if (showInternacionales.value) {
    items.push({
      label: `Internacionales (${props.viajes?.internacionales.length || 0})`,
      value: "internacionales" as const,
    });
  }
  return items;
});

const { sorting: sortingNac } = useTableSorting("periodo", true, {
  syncQuery: false,
});
const { sorting: sortingIntl } = useTableSorting("periodo", true, {
  syncQuery: false,
});

/** Clave ordenable YYYY-MM (o solo YYYY si no hay mes). */
function periodoKey(anio: number, mes: number | null | undefined) {
  if (mes != null && mes >= 1 && mes <= 12) {
    return `${anio}-${String(mes).padStart(2, "0")}`;
  }
  return String(anio);
}

function periodoLabel(
  anio: number,
  mes: number | null | undefined,
  mesNombre: string | null | undefined,
) {
  const nombre = String(mesNombre || "").trim();
  if (nombre) return `${nombre} de ${anio}`;
  if (mes != null && mes >= 1 && mes <= 12) {
    const fallback = new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
      month: "long",
    });
    const capitalized = fallback.charAt(0).toUpperCase() + fallback.slice(1);
    return `${capitalized} de ${anio}`;
  }
  return String(anio);
}

function lugarLabel(nombre: string, codigo: string | null) {
  return codigo ? `${nombre} (${codigo})` : nombre;
}

function intlFuenteHref(v: ViajeInternacional) {
  return viajePdfUrl(v.ambito, v.documentoId);
}

function intlFuenteLabel(_v: ViajeInternacional) {
  return "Ver PDF original";
}

function fechasIntl(v: ViajeInternacional) {
  if (v.fechaTexto) return v.fechaTexto;
  const a = v.fechaInicio ? formatDate(v.fechaInicio) : null;
  const b = v.fechaFin ? formatDate(v.fechaFin) : null;
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b || null;
}

function viajeNacKey(v: ViajeNacional, index: number) {
  const doc = v.documentoId || v.recursoId || "x";
  return `${doc}-${v.anio}-${v.mes}-${v.origenCodigo}-${v.destinoCodigo}-${index}`;
}

const nacionalesSorted = computed(() => {
  const list = [...(props.viajes?.nacionales || [])];
  const desc = sortingNac.value[0]?.desc !== false;
  list.sort((a, b) => {
    const ka = periodoKey(a.anio, a.mes);
    const kb = periodoKey(b.anio, b.mes);
    const cmp = ka.localeCompare(kb);
    return desc ? -cmp : cmp;
  });
  return list;
});

const internacionalesColumns = [
  {
    id: "periodo",
    accessorFn: (row: ViajeInternacional) => {
      if (row.fechaInicio) return String(row.fechaInicio).slice(0, 10);
      return periodoKey(row.anio, row.mes);
    },
    header: sortableHeader("Fecha"),
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "whitespace-nowrap",
      },
    },
  },
  { id: "destino", accessorKey: "destino", header: sortableHeader("Destino") },
  {
    id: "motivo",
    accessorKey: "motivo",
    header: sortableHeader("Motivo"),
    meta: {
      class: {
        td: "max-w-xs whitespace-normal",
      },
    },
  },
  {
    id: "expediente",
    accessorKey: "expediente",
    header: sortableHeader("Expediente"),
  },
];

const hasAny = computed(
  () =>
    (props.viajes?.nacionales.length || 0) +
      (props.viajes?.internacionales.length || 0) >
    0,
);

const showTabs = computed(
  () => tabItems.value.length > 1 && hasAny.value,
);

const visible = computed(() => props.showEmpty || hasAny.value);

const activeIndex = ref(0);
/** No reactivo: mutar refs de filas en render no debe re-renderizar el panel (ni el mapa). */
const rowEls: (HTMLElement | null)[] = [];

function setRowRef(el: unknown, index: number) {
  rowEls[index] =
    el && typeof el === "object" && "getBoundingClientRect" in el
      ? (el as HTMLElement)
      : null;
}

const activeViaje = computed(
  () => nacionalesSorted.value[activeIndex.value] || null,
);

const trailViajes = computed(() => {
  const list = nacionalesSorted.value;
  const i = activeIndex.value;
  if (!list.length) return [];
  return list.slice(Math.max(0, i - 2), i);
});

/** Mapa + lista lado a lado (`sm:`). Solo ahí tiene sentido scroll-spy / scrollIntoView. */
const sideBySide = useMediaQuery("(min-width: 640px)");

/**
 * Scroll-spy: última fila cuyo centro ya pasó el marker.
 * Evita el salto de 2–3 ítems del “más cercano” + throttle.
 */
function computeScrollTarget() {
  if (!sideBySide.value) return null;
  if (tab.value !== "nacionales" || !rowEls.length) return null;
  const marker = window.innerHeight * 0.28;
  let target = 0;
  for (let i = 0; i < rowEls.length; i++) {
    const el = rowEls[i];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (mid <= marker) target = i;
    else break;
  }
  return target;
}

let scrollRaf = 0;
let catchupRaf = 0;
/** Clic fija el highlight; el scroll-spy no lo pisa hasta un scroll del usuario. */
let pinnedByClick = false;

function syncActiveFromScroll() {
  if (!sideBySide.value || pinnedByClick) return;
  const target = computeScrollTarget();
  if (target == null) return;
  const cur = activeIndex.value;
  if (target === cur) return;
  // De a uno por frame: el mapa/highlight no salta aunque el fling pase varias filas.
  activeIndex.value = target > cur ? cur + 1 : cur - 1;
  if (activeIndex.value !== target) {
    cancelAnimationFrame(catchupRaf);
    catchupRaf = requestAnimationFrame(() => syncActiveFromScroll());
  }
}

function onScrollFrame() {
  if (!sideBySide.value) return;
  // Con pin (clic / anterior-siguiente) ignorar scroll, incluido scrollIntoView.
  if (pinnedByClick) return;
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    syncActiveFromScroll();
  });
}

/** El usuario vuelve a navegar con scroll → soltar pin y sincronizar. */
function unlockPinFromUserScroll() {
  if (!sideBySide.value) return;
  if (!pinnedByClick) return;
  pinnedByClick = false;
  onScrollFrame();
}

function selectRow(index: number) {
  cancelAnimationFrame(scrollRaf);
  cancelAnimationFrame(catchupRaf);
  scrollRaf = 0;
  catchupRaf = 0;
  pinnedByClick = sideBySide.value;
  activeIndex.value = index;
}

function stepViaje(delta: number) {
  const next = activeIndex.value + delta;
  if (next < 0 || next >= nacionalesSorted.value.length) return;
  selectRow(next);
  // En mobile el mapa está arriba: no mover el scroll de la página.
  if (sideBySide.value) {
    rowEls[next]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }
}

function toggleNacSort() {
  const desc = sortingNac.value[0]?.desc !== false;
  sortingNac.value = [{ id: "periodo", desc: !desc }];
}

watch(
  () => props.viajes,
  (v) => {
    if (!v || isDiputados.value) return;
    if (!v.nacionales.length && v.internacionales.length) {
      tab.value = "internacionales";
    }
  },
  { immediate: true },
);

watch(nacionalesSorted, () => {
  pinnedByClick = false;
  activeIndex.value = 0;
  rowEls.length = 0;
  nextTick(() => syncActiveFromScroll());
});

watch(tab, (t) => {
  if (t === "nacionales") {
    pinnedByClick = false;
    nextTick(() => syncActiveFromScroll());
  }
});

watch(sideBySide, (enabled) => {
  if (!enabled) {
    pinnedByClick = false;
    cancelAnimationFrame(scrollRaf);
    cancelAnimationFrame(catchupRaf);
    scrollRaf = 0;
    catchupRaf = 0;
    return;
  }
  nextTick(() => syncActiveFromScroll());
});

onMounted(() => {
  useEventListener(window, "scroll", onScrollFrame, { passive: true });
  useEventListener(window, "resize", onScrollFrame, { passive: true });
  useEventListener(window, "wheel", unlockPinFromUserScroll, { passive: true });
  useEventListener(window, "touchmove", unlockPinFromUserScroll, {
    passive: true,
  });
  nextTick(() => syncActiveFromScroll());
});

onBeforeUnmount(() => {
  cancelAnimationFrame(scrollRaf);
  cancelAnimationFrame(catchupRaf);
});
</script>

<template>
  <DataTableCard
    v-if="visible"
    :show-periodo-badge="false"
    :scrollable="false"
  >
    <template #header>
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 class="text-lg font-semibold">Viajes</h2>
        <SegmentedTabs
          v-if="showTabs"
          v-model="tab"
          :items="tabItems"
          :center="false"
        />
      </div>
    </template>

    <p v-if="!hasAny && !showTabs" class="px-4 sm:px-6 py-6 text-sm text-muted">
      <template v-if="isDiputados">
        No hay viajes nacionales registrados para este diputado.
      </template>
      <template v-else>
        No hay viajes nacionales ni internacionales registrados para este
        senador.
      </template>
    </p>

    <template v-else-if="tab === 'nacionales'">
      <div
        v-if="nacionalesSorted.length"
        class="flex flex-col gap-4 p-4 sm:p-6 sm:flex-row sm:items-start sm:gap-6"
      >
        <div
          class="w-full sm:w-[min(42%,28rem)] sm:shrink-0 sm:sticky sm:top-[calc(var(--ui-header-height)+1rem)] sm:self-start"
        >
          <ClientOnly>
            <SenadorViajesMap
              :active="activeViaje"
              :trail="trailViajes"
              :catalog="nacionalesSorted"
              :can-prev="activeIndex > 0"
              :can-next="activeIndex < nacionalesSorted.length - 1"
              height="32rem"
              @prev="stepViaje(-1)"
              @next="stepViaje(1)"
            />
            <template #fallback>
              <div
                class="animate-pulse rounded-lg bg-elevated h-[32rem]"
                aria-hidden="true"
              />
            </template>
          </ClientOnly>
        </div>

        <div class="min-w-0 flex-1">
          <div
            class="mb-2 grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-3 text-xs font-medium text-muted"
          >
            <button
              type="button"
              class="inline-flex items-center gap-1 text-left hover:text-highlighted"
              @click="toggleNacSort"
            >
              Fecha
              <UIcon
                :name="
                  sortingNac[0]?.desc !== false
                    ? 'i-lucide-arrow-down'
                    : 'i-lucide-arrow-up'
                "
                class="size-3.5"
              />
            </button>
            <span>Origen</span>
            <span>Destino</span>
          </div>

          <ul class="divide-y divide-default rounded-lg ring ring-default overflow-hidden">
            <li
              v-for="(viaje, index) in nacionalesSorted"
              :key="viajeNacKey(viaje, index)"
              :ref="(el) => setRowRef(el, index)"
              class="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-3 py-3 cursor-pointer transition-colors"
              :class="
                index === activeIndex
                  ? 'bg-elevated/80 ring-1 ring-inset ring-primary/40'
                  : 'hover:bg-elevated/40'
              "
              @click="selectRow(index)"
            >
              <div class="flex items-start gap-1 min-w-0">
                <div class="leading-tight min-w-0">
                  <p class="text-sm">
                    {{
                      periodoLabel(viaje.anio, viaje.mes, viaje.mesNombre)
                    }}
                  </p>
                  <p class="text-xs text-muted tabular-nums">
                    {{ periodoKey(viaje.anio, viaje.mes) }}
                  </p>
                </div>
                <FuentePdfButton
                  :href="
                    viaje.documentoId
                      ? viajePdfUrl(viaje.ambito, viaje.documentoId)
                      : null
                  "
                />
              </div>
              <div class="min-w-0 text-sm truncate">
                {{ lugarLabel(viaje.origen, viaje.origenCodigo) }}
              </div>
              <div class="min-w-0 text-sm truncate">
                {{ lugarLabel(viaje.destino, viaje.destinoCodigo) }}
              </div>
            </li>
          </ul>
        </div>
      </div>
      <p v-else class="px-4 sm:px-6 py-6 text-sm text-muted">
        Sin viajes nacionales registrados.
      </p>
    </template>

    <UTable
      v-else
      v-model:sorting="sortingIntl"
      :data="viajes?.internacionales || []"
      :columns="internacionalesColumns"
      empty="Sin viajes internacionales registrados."
    >
      <template #periodo-cell="{ row }">
        <div class="flex items-start gap-1">
          <div class="leading-tight min-w-0">
            <p class="text-sm">
              {{
                fechasIntl(row.original as ViajeInternacional) ||
                periodoLabel(
                  (row.original as ViajeInternacional).anio,
                  (row.original as ViajeInternacional).mes,
                  (row.original as ViajeInternacional).mesNombre,
                )
              }}
            </p>
            <p class="text-xs text-muted tabular-nums">
              {{
                (row.original as ViajeInternacional).fechaInicio
                  ? String(
                      (row.original as ViajeInternacional).fechaInicio,
                    ).slice(0, 7)
                  : periodoKey(
                      (row.original as ViajeInternacional).anio,
                      (row.original as ViajeInternacional).mes,
                    )
              }}
            </p>
          </div>
          <FuentePdfButton
            :href="intlFuenteHref(row.original as ViajeInternacional)"
            :label="intlFuenteLabel(row.original as ViajeInternacional)"
          />
        </div>
      </template>
      <template #motivo-cell="{ row }">
        <span class="text-sm">
          {{ (row.original as ViajeInternacional).motivo || "—" }}
        </span>
      </template>
    </UTable>

    <p class="px-4 sm:px-6 py-3 text-xs text-muted border-t border-default">
      Fuente:
      <a
        :href="fuenteUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="underline hover:text-highlighted"
      >
        {{ isDiputados ? "viajes (HCDN)" : "viajes del Senado" }}
      </a>
    </p>
  </DataTableCard>
</template>
