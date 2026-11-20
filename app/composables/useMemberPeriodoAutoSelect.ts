import type { MaybeRefOrGetter } from "vue";
import {
  isTodosPeriodoSelection,
  normalizePeriodoKeys,
  resolveActaPeriodoKey,
  routeUsesPeriodoQuery,
  SIN_PERIODO_KEY,
  toIsoDateAr,
} from "@/utils/periodoLegislativo";
import {
  isPathUnder,
  useMemberPeriodoAutoState,
} from "@/composables/usePeriodoFilter";

type MemberActaRow = { fecha?: string | null; periodo?: string | null };

/**
 * Ficha de un miembro inactivo: si la selección de período no incluye ningún
 * período en el que haya votado (y no es “todos”), elegir su último período.
 *
 * - Activos: sin cambios (default = vigente).
 * - Selección con algún período del miembro (p. ej. link compartido): se respeta.
 * - Si el usuario cambia el período a mano en la ficha, no se reaplica.
 * - La auto-selección no se guarda como selección global recordada
 *   (ver `useMemberPeriodoAutoState` / `useNavPeriodoQuery`).
 *
 * Solo cliente (tras mount) para no romper la hidratación.
 */
export function useMemberPeriodoAutoSelect(options: {
  basePath: MaybeRefOrGetter<string>;
  /** `null` mientras no se sabe (miembro sin cargar). */
  active: MaybeRefOrGetter<boolean | null>;
  actas: MaybeRefOrGetter<MemberActaRow[]>;
  chamber: "diputados" | "senadores";
}) {
  const route = useRoute();
  const router = useRouter();
  const memberAuto = useMemberPeriodoAutoState();
  const mounted = ref(false);
  onMounted(() => {
    mounted.value = true;
  });

  /** Períodos con votos del miembro, más reciente primero. */
  const memberPeriodKeys = computed(() => {
    const maxByKey = new Map<string, string>();
    for (const a of toValue(options.actas)) {
      const key = resolveActaPeriodoKey(a, options.chamber);
      if (!key || key === SIN_PERIODO_KEY) continue;
      const fecha = toIsoDateAr(a.fecha) || "";
      const cur = maxByKey.get(key);
      if (cur == null || fecha > cur) maxByKey.set(key, fecha);
    }
    return [...maxByKey.entries()]
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([key]) => key);
  });

  watch(
    [
      mounted,
      () => toValue(options.active),
      () => toValue(options.basePath),
      memberPeriodKeys,
      () => route.path,
      () => route.query.periodo,
    ],
    () => {
      if (!mounted.value) return;
      if (toValue(options.active) !== false) return;
      const basePath = toValue(options.basePath);
      if (!basePath || !isPathUnder(route.path, basePath)) return;
      if (!routeUsesPeriodoQuery(route.path)) return;

      const auto = memberAuto.value;
      if (auto?.basePath === basePath && auto.dismissed) return;

      const latest = memberPeriodKeys.value[0];
      if (!latest) return;

      // Sin ?periodo todavía: usePeriodoFilter lo completa y volvemos a correr.
      const raw = route.query.periodo;
      const list = Array.isArray(raw) ? raw.map(String) : String(raw ?? "");
      if (raw == null || !String(list).trim()) return;
      if (isTodosPeriodoSelection(list)) return;

      const selected = normalizePeriodoKeys(list);
      const own = new Set(memberPeriodKeys.value);
      if (selected.some((k) => own.has(k))) return;

      memberAuto.value = { basePath, keys: latest };
      router.replace({
        path: route.path,
        query: { ...route.query, periodo: latest },
        hash: route.hash,
      });
    },
    { immediate: true },
  );
}
