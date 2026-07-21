import type { H3Event } from "h3";
import {
  resolveChamberFromHost,
  type ChamberId,
} from "../../app/lib/chamber";

function asChamberId(raw: unknown): ChamberId | null {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "diputados" || v === "senadores") return v;
  return null;
}

/**
 * Cámara del request API.
 * Preferí query/`x-chamber`: en SSR, `$fetch('/api/…')` no reenvía `Host`
 * y sin eso cae al default (senadores) → 404 en deep links de diputados.
 */
export function resolveChamberFromEvent(event: H3Event): ChamberId {
  const query = getQuery(event);
  const fromQuery = asChamberId(query.chamber);
  if (fromQuery) return fromQuery;

  const fromHeader = asChamberId(getRequestHeader(event, "x-chamber"));
  if (fromHeader) return fromHeader;

  const host =
    getRequestHeader(event, "x-forwarded-host") ||
    getRequestHeader(event, "host") ||
    getRequestURL(event).hostname;
  return resolveChamberFromHost(String(host || ""));
}
