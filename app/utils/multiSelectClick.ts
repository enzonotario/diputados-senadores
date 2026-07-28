/**
 * Selección multi estilo Explorer / timeline de períodos:
 * - clic: solo ese ítem
 * - Ctrl/⌘+clic: sumar / quitar
 * - Shift+clic: rango entre ancla y el clic (orden = `orderedKeys`)
 */
export type MultiSelectClickInput = {
  key: string;
  orderedKeys: string[];
  selected: string[];
  ctrl: boolean;
  shift: boolean;
  shiftAnchorKey: string | null;
  /** Normaliza para comparar (p. ej. `provinciaKey`). Default: identidad. */
  keyOf?: (value: string) => string;
};

export type MultiSelectClickResult = {
  next: string[];
  shiftAnchorKey: string | null;
};

export function applyMultiSelectClick(
  input: MultiSelectClickInput,
): MultiSelectClickResult {
  const keyOf = input.keyOf ?? ((v: string) => v);
  const key = String(input.key || "").trim();
  if (!key) {
    return { next: [...input.selected], shiftAnchorKey: input.shiftAnchorKey };
  }

  const keys = input.orderedKeys;
  const selected = input.selected || [];
  const { ctrl, shift } = input;
  let shiftAnchorKey = input.shiftAnchorKey;

  const indexOf = (name: string) =>
    keys.findIndex((k) => keyOf(k) === keyOf(name));

  if (shift) {
    const anchor =
      shiftAnchorKey || selected[selected.length - 1] || key;
    const i0 = indexOf(anchor);
    const i1 = indexOf(key);
    if (i0 < 0 || i1 < 0) {
      return { next: [key], shiftAnchorKey: key };
    }
    const [lo, hi] = i0 < i1 ? [i0, i1] : [i1, i0];
    return { next: keys.slice(lo, hi + 1), shiftAnchorKey };
  }

  if (ctrl) {
    const set = new Set(selected.map((s) => keyOf(s)));
    const click = keyOf(key);
    if (set.has(click)) set.delete(click);
    else set.add(click);

    const next = keys.filter((k) => set.has(keyOf(k)));
    // Ítems seleccionados fuera del orden canónico (p. ej. tipografía distinta).
    for (const s of selected) {
      if (set.has(keyOf(s)) && !next.some((n) => keyOf(n) === keyOf(s))) {
        next.push(s);
      }
    }
    if (set.has(click) && !next.some((n) => keyOf(n) === click)) {
      next.push(key);
    }

    if (!shiftAnchorKey) shiftAnchorKey = key;
    return { next, shiftAnchorKey };
  }

  return { next: [key], shiftAnchorKey: key };
}
