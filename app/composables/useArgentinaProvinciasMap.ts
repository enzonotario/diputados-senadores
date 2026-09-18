import { registerMap } from "echarts/core";
import { provinciaKey } from "@/utils/provinciaKey";

const MAP_NAME = "argentina-provincias";

export type ProvinciaMapMeta = {
  key: string;
  displayName: string;
  /** [lon, lat] para pies/markers en geo (IGN, o Isla Grande si el IGN cae en Antártida). */
  center: [number, number];
};

let metas: ProvinciaMapMeta[] = [];

/** Metas del GeoJSON registrado (vacío hasta `ensureArgentinaProvinciasMap`). */
export function getArgentinaProvinciaMetas(): ProvinciaMapMeta[] {
  return metas;
}

/** Latitud mínima del mapa continental (descarta Antártida del IGN). */
const CLIP_MIN_LAT = -56.2;

/** Descarta polígonos antárticos (GeoJSON IGN estira el mapa a lat -90). */
function clipSouthOf(geometry: any, minLat = CLIP_MIN_LAT): any {
  if (!geometry) return geometry;

  const ringOk = (ring: number[][]) =>
    Array.isArray(ring) && ring.some((p) => Array.isArray(p) && p[1]! > minLat);

  if (geometry.type === "Polygon") {
    const coords = (geometry.coordinates || []).filter(ringOk);
    return coords.length ? { type: "Polygon", coordinates: coords } : null;
  }

  if (geometry.type === "MultiPolygon") {
    const coords = (geometry.coordinates || [])
      .map((poly: number[][][]) => poly.filter(ringOk))
      .filter((poly: number[][][]) => poly.length > 0);
    return coords.length
      ? { type: "MultiPolygon", coordinates: coords }
      : null;
  }

  return geometry;
}

/** Área aproximada (shoelace) del anillo exterior de un Polygon coords. */
function polygonOuterArea(poly: number[][][]): number {
  const ring = poly?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    area += x1! * y2! - x2! * y1!;
  }
  return Math.abs(area / 2);
}

/** Media de vértices de un Polygon (coords = rings). */
function polygonMean(poly: number[][][]): [number, number] | null {
  const ring = poly?.[0];
  if (!Array.isArray(ring) || !ring.length) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const p of ring) {
    if (!Array.isArray(p) || typeof p[0] !== "number") continue;
    sx += p[0]!;
    sy += p[1]!;
    n += 1;
  }
  if (!n) return null;
  return [sx / n, sy / n];
}

/**
 * Centroide usable para pies/markers en geo.
 * El IGN mete Antártida en Tierra del Fuego → centroide ~lat -82, fuera del
 * viewport. Si el centroide cae al sur del clip, usamos el polígono más
 * grande que quedó tras el recorte (Isla Grande).
 */
function resolveCenter(
  geometry: any,
  centroide: { lon?: number; lat?: number } | null | undefined,
): [number, number] {
  const lon = Number(centroide?.lon);
  const lat = Number(centroide?.lat);
  if (Number.isFinite(lon) && Number.isFinite(lat) && lat > CLIP_MIN_LAT) {
    return [lon, lat];
  }

  const polys: number[][][][] =
    geometry?.type === "Polygon"
      ? [geometry.coordinates]
      : geometry?.type === "MultiPolygon"
        ? geometry.coordinates || []
        : [];

  let best: [number, number] | null = null;
  let bestArea = -1;
  for (const poly of polys) {
    const area = polygonOuterArea(poly);
    if (area <= bestArea) continue;
    const mean = polygonMean(poly);
    if (!mean) continue;
    bestArea = area;
    best = mean;
  }

  if (best) return best;
  if (Number.isFinite(lon) && Number.isFinite(lat)) return [lon, lat];
  return [0, 0];
}

let ready: Promise<string> | null = null;

/**
 * Carga `/assets/provincias.geojson`, normaliza `name` y registra el mapa en ECharts.
 * Idempotente (client-only).
 */
export function ensureArgentinaProvinciasMap(): Promise<string> {
  if (!import.meta.client) {
    return Promise.resolve(MAP_NAME);
  }
  if (!ready) {
    ready = (async () => {
      const geo = await $fetch<any>("/assets/provincias.geojson");
      const features = (geo.features || [])
        .map((f: any) => {
          const geometry = clipSouthOf(f.geometry);
          if (!geometry) return null;
          const nombre = String(f.properties?.nombre || "");
          return {
            ...f,
            geometry,
            properties: {
              ...f.properties,
              name: provinciaKey(nombre),
              displayName: nombre,
            },
          };
        })
        .filter(Boolean);

      metas = features.map((f: any) => {
        return {
          key: String(f.properties.name),
          displayName: String(f.properties.displayName || f.properties.name),
          center: resolveCenter(f.geometry, f.properties?.centroide),
        };
      });

      registerMap(MAP_NAME, {
        geoJSON: { type: "FeatureCollection", features },
      } as any);

      return MAP_NAME;
    })().catch((err) => {
      ready = null;
      metas = [];
      throw err;
    });
  }
  return ready;
}

export { MAP_NAME as ARGENTINA_PROVINCIAS_MAP };
