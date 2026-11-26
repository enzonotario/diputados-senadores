import type { ChamberId } from "./chamber";
import type { ChamberOgInput } from "./og";
import { countPoroteoVotes, type PoroteoMember } from "../utils/poroteo";
import { decodePoroteoShare } from "../utils/poroteoShare";

export type PoroteoSeoOutput = {
  title: string;
  description: string;
  og: ChamberOgInput;
};

/**
 * SEO + props OG para `/poroteo`.
 *
 * Sin `?s=` (o payload inválido): tarjeta genérica del simulador.
 * Con `?s=` válido: decodifica los votos, calcula los conteos y pasa el
 * payload para renderizar el hemiciclo con fotos + anillo del color del voto.
 */
export function buildPoroteoSeo(
  chamber: ChamberId,
  members: PoroteoMember[],
  query: {
    s?: unknown;
    titulo?: unknown;
  },
): PoroteoSeoOutput {
  const membersLabel = chamber === "diputados" ? "diputados" : "senadores";
  const rawShare = String(
    Array.isArray(query.s) ? query.s[0] || "" : query.s || "",
  ).trim();
  const rawTitle = String(
    Array.isArray(query.titulo) ? query.titulo[0] || "" : query.titulo || "",
  ).trim();
  const customTitle = rawTitle && rawTitle !== "Poroteo" ? rawTitle : "";

  const memberIds = members.map((m) => m.id);
  const votes =
    rawShare && memberIds.length
      ? decodePoroteoShare(rawShare, memberIds)
      : null;

  if (!votes) {
    return {
      title: customTitle || "Poroteo",
      description: `Simulá cómo votarían los ${membersLabel} y exportá una imagen para compartir.`,
      og: { kind: "list", eyebrow: "poroteo", badge: "Poroteo" },
    };
  }

  const counts = countPoroteoVotes(members, votes);

  let badge = "Poroteo";
  let accent: string | undefined;
  if (counts.afirmativo > counts.negativo) {
    badge = "A favor";
    accent = "afirmativo";
  } else if (counts.negativo > counts.afirmativo) {
    badge = "En contra";
    accent = "negativo";
  } else if (counts.afirmativo > 0 && counts.afirmativo === counts.negativo) {
    badge = "Empate";
    accent = "empate";
  }

  const descParts: string[] = [
    `A favor: ${counts.afirmativo}`,
    `En contra: ${counts.negativo}`,
  ];
  if (counts.abstencion > 0) descParts.push(`Abstención: ${counts.abstencion}`);
  if (counts.ausente > 0) descParts.push(`Ausentes: ${counts.ausente}`);
  if (counts.indeciso > 0) descParts.push(`Indecisos: ${counts.indeciso}`);

  return {
    title: customTitle || "Poroteo",
    description: descParts.join(" · "),
    og: {
      kind: "poroteo",
      eyebrow: "poroteo",
      badge,
      accent,
      footerLeft: `${members.length} ${membersLabel}`,
      votosAfirmativos: counts.afirmativo,
      votosNegativos: counts.negativo,
      abstenciones: counts.abstencion,
      ausentes: counts.ausente,
      indecisos: counts.indeciso,
      poroteo: rawShare,
    },
  };
}
