import LZString from "lz-string";
import {
  isPoroteoVoto,
  type PoroteoVoto,
  type PoroteoVotes,
} from "@/utils/poroteo";

/**
 * Payload compacto v1: solo ids con voto ≠ `indeciso`.
 * a = afirmativo · n = negativo · b = abstencion
 */
export type PoroteoSharePayloadV1 = {
  v: 1;
  a?: string[];
  n?: string[];
  b?: string[];
};

/** Query param del poroteo comprimido (lz-string URI-safe). */
export const POROTEO_SHARE_QUERY = "s";

export function votesToSharePayload(votes: PoroteoVotes): PoroteoSharePayloadV1 {
  const a: string[] = [];
  const n: string[] = [];
  const b: string[] = [];
  for (const [id, raw] of Object.entries(votes)) {
    if (!id || !isPoroteoVoto(raw) || raw === "indeciso") continue;
    if (raw === "afirmativo") a.push(id);
    else if (raw === "negativo") n.push(id);
    else if (raw === "abstencion") b.push(id);
  }
  a.sort();
  n.sort();
  b.sort();
  const payload: PoroteoSharePayloadV1 = { v: 1 };
  if (a.length) payload.a = a;
  if (n.length) payload.n = n;
  if (b.length) payload.b = b;
  return payload;
}

export function sharePayloadToVotes(
  payload: PoroteoSharePayloadV1,
  memberIds: string[],
): PoroteoVotes {
  const votes: PoroteoVotes = {};
  for (const id of memberIds) votes[id] = "indeciso";

  const apply = (ids: string[] | undefined, tipo: PoroteoVoto) => {
    if (!ids?.length) return;
    for (const id of ids) {
      if (id) votes[id] = tipo;
    }
  };
  apply(payload.a, "afirmativo");
  apply(payload.n, "negativo");
  apply(payload.b, "abstencion");
  return votes;
}

export function encodePoroteoShare(votes: PoroteoVotes): string | null {
  const payload = votesToSharePayload(votes);
  if (!payload.a?.length && !payload.n?.length && !payload.b?.length) {
    return null;
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodePoroteoShare(
  encoded: string | null | undefined,
  memberIds: string[],
): PoroteoVotes | null {
  const raw = String(encoded || "").trim();
  if (!raw) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const parsed = JSON.parse(json) as PoroteoSharePayloadV1;
    if (!parsed || parsed.v !== 1) return null;
    return sharePayloadToVotes(parsed, memberIds);
  } catch {
    return null;
  }
}

export function buildPoroteoShareUrl(
  href: string,
  votes: PoroteoVotes,
  titulo?: string | null,
): string {
  const url = new URL(href);
  const encoded = encodePoroteoShare(votes);
  if (encoded) url.searchParams.set(POROTEO_SHARE_QUERY, encoded);
  else url.searchParams.delete(POROTEO_SHARE_QUERY);

  const t = String(titulo || "").trim();
  if (t && t !== "Poroteo") url.searchParams.set("titulo", t);
  return url.toString();
}
