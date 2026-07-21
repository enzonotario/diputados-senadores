import type { H3Event } from "h3";
import {
  resolveChamberFromHost,
  type ChamberId,
} from "../../app/lib/chamber";

/** Cámara según `Host` del request (mismo criterio que el middleware de páginas). */
export function resolveChamberFromEvent(event: H3Event): ChamberId {
  const host =
    getRequestHeader(event, "x-forwarded-host") ||
    getRequestHeader(event, "host") ||
    getRequestURL(event).hostname;
  return resolveChamberFromHost(String(host || ""));
}
