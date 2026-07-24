import {
  filterActasByPeriodo,
  filterMembersByPeriodo,
  filterVotesByPeriodo,
  findPeriodo,
  isTodosPeriodoSelection,
  normalizePeriodoKeys,
  TODOS_PERIODO_KEY,
  type PeriodoInfo,
  type PeriodosCatalog,
} from "@/utils/periodoLegislativo";
import { useMultiQuery } from "@/composables/useMultiQuery";

type PeriodosApi = PeriodosCatalog & { chamber?: string };

function queryMeansTodos(raw: string | string[] | null | undefined): boolean {
  if (raw == null) return false;
  const list = Array.isArray(raw) ? raw : String(raw).split(",");
  const keys = list.map((k) => String(k || "").trim()).filter(Boolean);
  return keys.length === 1 && keys[0] === TODOS_PERIODO_KEY;
}

/**
 * Filtro global de período(s) legislativo(s) vía `?periodo=`.
 * Multi-select (coma-separado). Default = [período vigente].
 * `periodo=todos` / clear = todos los períodos.
 */
export function usePeriodoFilter() {
  const { localFetch } = useLocalApi();
  const { isLegislative, chamberId, isDiputados } = useChamber();
  const route = useRoute();
  const router = useRouter();

  const remembered = useState<string[]>("periodo-selected-keys", () => []);
  /** true si el usuario eligió explícitamente “todos” (clear). */
  const rememberedTodos = useState<boolean>(
    "periodo-selected-todos",
    () => false,
  );

  const { data: catalog, pending } = useAsyncData(
    () => `periodos-catalog-${chamberId.value}`,
    async () => {
      if (!isLegislative.value) return null;
      return localFetch<PeriodosApi>("/api/periodos");
    },
    { watch: [chamberId, isLegislative], lazy: true },
  );

  const periodoQuery = useMultiQuery("periodo");

  const chamber = computed<"diputados" | "senadores">(() =>
    isDiputados.value ? "diputados" : "senadores",
  );

  const periods = computed<PeriodoInfo[]>(() => catalog.value?.periods || []);

  const defaultKey = computed(() => catalog.value?.defaultKey || "");

  const periodos = computed({
    get(): string[] {
      if (queryMeansTodos(periodoQuery.value) || rememberedTodos.value) {
        return [];
      }
      const fromQuery = normalizePeriodoKeys(periodoQuery.value);
      if (fromQuery.length) return fromQuery;
      if (remembered.value.length) return remembered.value;
      return defaultKey.value ? [defaultKey.value] : [];
    },
    set(value: string[]) {
      const next = normalizePeriodoKeys(value);
      remembered.value = next;
      rememberedTodos.value = next.length === 0;
      // Vacío → `todos` en la URL (para no reaplicar el default).
      periodoQuery.value = next.length ? next : [TODOS_PERIODO_KEY];
    },
  });

  /** Compat: primera clave (o vacío). Preferí `periodos`. */
  const periodo = computed({
    get(): string {
      return periodos.value[0] || defaultKey.value || "";
    },
    set(value: string) {
      const key = String(value || "").trim();
      periodos.value = key ? [key] : [];
    },
  });

  const selectedInfos = computed(() =>
    periodos.value
      .map((k) => findPeriodo(catalog.value || undefined, k))
      .filter(Boolean) as PeriodoInfo[],
  );

  const selectedInfo = computed(() => selectedInfos.value[0] || null);

  const isTodos = computed(() => isTodosPeriodoSelection(periodos.value));

  const isVigente = computed(() => {
    if (!defaultKey.value || isTodos.value) return false;
    return (
      periodos.value.length === 1 && periodos.value[0] === defaultKey.value
    );
  });

  // Catalog listo + URL sin ?periodo → fijar default (o remembered).
  watch(
    [catalog, () => route.query.periodo],
    ([c]) => {
      if (!isLegislative.value || !c?.defaultKey) return;
      if (import.meta.prerender) return;
      const q = route.query.periodo;
      const hasQuery =
        q != null &&
        String(Array.isArray(q) ? q.join(",") : q).trim() !== "";
      if (hasQuery) {
        if (queryMeansTodos(Array.isArray(q) ? q.map(String) : String(q))) {
          remembered.value = [];
          rememberedTodos.value = true;
          return;
        }
        rememberedTodos.value = false;
        remembered.value = normalizePeriodoKeys(
          Array.isArray(q) ? q.map(String) : String(q),
        );
        return;
      }
      if (rememberedTodos.value) {
        router.replace({
          path: route.path,
          query: { ...route.query, periodo: TODOS_PERIODO_KEY },
          hash: route.hash,
        });
        return;
      }
      const next =
        remembered.value.length > 0
          ? remembered.value
          : [c.defaultKey];
      const current = String(route.query.periodo || "");
      const nextStr = next.join(",");
      if (current === nextStr) return;
      router.replace({
        path: route.path,
        query: { ...route.query, periodo: nextStr },
        hash: route.hash,
      });
    },
    { immediate: true },
  );

  function togglePeriodo(key: string) {
    const k = String(key || "").trim();
    if (!k) return;
    const cur = [...periodos.value];
    const idx = cur.indexOf(k);
    if (idx >= 0) cur.splice(idx, 1);
    else cur.push(k);
    periodos.value = cur;
  }

  function setPeriodos(keys: string[]) {
    periodos.value = keys;
  }

  function filterActas<
    T extends { fecha?: string | null; periodo?: string | null },
  >(actas: T[]): T[] {
    return filterActasByPeriodo(actas, periodos.value, chamber.value);
  }

  function filterMembers<
    T extends {
      periodoMandato?: { inicio?: string | null; fin?: string | null } | null;
      ceseFecha?: string | null;
      periodoReal?: { inicio?: string | null; fin?: string | null } | null;
      periodoLegal?: { inicio?: string | null; fin?: string | null } | null;
    },
  >(members: T[]): T[] {
    return filterMembersByPeriodo(members, periodos.value, catalog.value);
  }

  function filterVotes<T extends { fecha?: string | null }>(votes: T[]): T[] {
    return filterVotesByPeriodo(votes, periodos.value, catalog.value);
  }

  const selectItems = computed(() =>
    periods.value.map((p) => {
      const range = formatPeriodoRange(p.minFecha, p.maxFecha);
      const countLabel =
        p.count > 0
          ? `${p.count.toLocaleString("es-AR")} ${
              p.count === 1 ? "votación" : "votaciones"
            }`
          : null;
      const description = [range, countLabel].filter(Boolean).join(" · ");
      return {
        label: p.label,
        value: p.key,
        description: description || undefined,
      };
    }),
  );

  const periodosLabel = computed(() => {
    if (isTodos.value) return "Todos los períodos";
    if (selectedInfos.value.length === 1) {
      return selectedInfos.value[0]!.label;
    }
    if (selectedInfos.value.length > 1) {
      return `${selectedInfos.value.length} períodos`;
    }
    return periodos.value.map((k) => `Período ${k}`).join(", ");
  });

  /** Título corto para encabezados: “Período 140”, “2 períodos”, “Todos los períodos”. */
  const periodosScopeTitle = computed(() => {
    if (isTodos.value) return "Todos los períodos";
    if (selectedInfos.value.length === 1) {
      return selectedInfos.value[0]!.label;
    }
    if (selectedInfos.value.length > 1) {
      return `${selectedInfos.value.length} períodos seleccionados`;
    }
    if (periodos.value.length === 1) return `Período ${periodos.value[0]}`;
    if (periodos.value.length > 1) {
      return `${periodos.value.length} períodos seleccionados`;
    }
    return "Todos los períodos";
  });

  /** Labels cortos para badges (uno por período, o uno solo si son muchos / todos). */
  const periodosBadgeLabels = computed(() => {
    if (isTodos.value) return ["Todos"];
    const infos = selectedInfos.value;
    if (infos.length > 0) {
      if (infos.length <= 3) {
        return infos.map((p) => shortPeriodoLabel(p.label, p.key));
      }
      return [`${infos.length} períodos`];
    }
    if (periodos.value.length > 0) {
      if (periodos.value.length <= 3) {
        return periodos.value.map((k) => shortPeriodoLabel(`Período ${k}`, k));
      }
      return [`${periodos.value.length} períodos`];
    }
    return ["Todos"];
  });

  /** Detalle de cada período seleccionado (label + rango de fechas). */
  const periodosScopeDetails = computed(() => {
    if (isTodos.value) {
      const all = periods.value.filter((p) => p.minFecha && p.maxFecha);
      if (!all.length) {
        return [
          {
            key: TODOS_PERIODO_KEY,
            label: "Todos los períodos",
            range: null as string | null,
            count: null as number | null,
          },
        ];
      }
      const min = all.reduce(
        (acc, p) => (p.minFecha < acc ? p.minFecha : acc),
        all[0]!.minFecha,
      );
      const max = all.reduce(
        (acc, p) => (p.maxFecha > acc ? p.maxFecha : acc),
        all[0]!.maxFecha,
      );
      const count = all.reduce((acc, p) => acc + (p.count || 0), 0);
      return [
        {
          key: TODOS_PERIODO_KEY,
          label: "Todos los períodos",
          range: formatPeriodoRange(min, max),
          count,
        },
      ];
    }

    const infos =
      selectedInfos.value.length > 0
        ? selectedInfos.value
        : periodos.value.map(
            (key) =>
              ({
                key,
                label: `Período ${key}`,
                minFecha: "",
                maxFecha: "",
                count: 0,
              }) satisfies PeriodoInfo,
          );

    return infos.map((p) => ({
      key: p.key,
      label: p.label,
      range: formatPeriodoRange(p.minFecha, p.maxFecha),
      count: p.count > 0 ? p.count : null,
    }));
  });

  return {
    catalog,
    pending,
    periods,
    /** Claves seleccionadas (multi). Vacío = todos. */
    periodos,
    /** Compat single. */
    periodo,
    selectedInfo,
    selectedInfos,
    periodosLabel,
    periodosScopeTitle,
    periodosBadgeLabels,
    periodosScopeDetails,
    defaultKey,
    isVigente,
    isTodos,
    isLegislative,
    chamber,
    selectItems,
    togglePeriodo,
    setPeriodos,
    filterActas,
    filterMembers,
    filterVotes,
  };
}

function shortPeriodoLabel(label: string, key: string): string {
  const trimmed = String(label || "").trim();
  if (/^per[ií]odo\s+/i.test(trimmed)) {
    return trimmed.replace(/^per[ií]odo\s+/i, "P. ");
  }
  if (/^\d{4}/.test(trimmed)) return trimmed;
  return key ? `P. ${key}` : trimmed || "Período";
}

function formatPeriodoRange(
  minFecha: string | null | undefined,
  maxFecha: string | null | undefined,
): string | null {
  const min = String(minFecha || "").slice(0, 10);
  const max = String(maxFecha || "").slice(0, 10);
  if (!min && !max) return null;
  const fmt = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(d);
  };
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(min || max);
}
