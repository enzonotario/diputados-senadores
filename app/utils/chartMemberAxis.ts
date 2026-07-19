const PLACEHOLDER_PHOTO = "/placeholder-user.jpg";

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeAxisLabel(value: string, max = 18) {
  return String(value || "")
    .replace(/[{}|]/g, "")
    .trim()
    .slice(0, max);
}

/**
 * Ejes de categoría con avatar + nombre (rich text de ECharts).
 * Usar URLs same-origin (p.ej. vía `useImage()` / IPX) para evitar CORS en canvas.
 */
export function memberPhotoAxisLabel(
  fotos: Array<string | null | undefined>,
  options: {
    size?: number;
    labels?: string[];
    textColor?: string;
    /** Ángulo del label completo (útil en eje X). */
    rotate?: number;
    /**
     * `stack`: foto arriba, apellido abajo (eje X).
     * `inline`: foto + apellido en la misma línea (eje Y).
     */
    layout?: "stack" | "inline";
    fontSize?: number;
    maxLabelChars?: number;
  } = {},
) {
  const size = options.size ?? 22;
  const layout = options.layout ?? "inline";
  const fontSize = options.fontSize ?? 9;
  const maxLabelChars = options.maxLabelChars ?? 18;
  /** Ancho aproximado del texto para que ECharts reserve espacio y no lo recorte. */
  const textWidth = Math.ceil(maxLabelChars * fontSize * 0.62);
  const rich: Record<string, any> = {
    name: {
      color: options.textColor,
      fontSize,
      lineHeight: fontSize + 4,
      height: fontSize + 4,
      width: textWidth,
      padding: layout === "stack" ? [4, 0, 0, 0] : [0, 0, 0, 5],
      align: layout === "stack" ? "center" : "left",
      verticalAlign: "middle",
      overflow: "truncate",
    },
  };

  for (let i = 0; i < fotos.length; i++) {
    rich[`f${i}`] = {
      height: size,
      width: size,
      borderRadius: Math.ceil(size / 2),
      backgroundColor: {
        image: fotos[i] || PLACEHOLDER_PHOTO,
      },
      align: layout === "stack" ? "center" : "left",
      verticalAlign: "middle",
    };
  }

  return {
    interval: 0 as const,
    rotate: options.rotate ?? 0,
    hideOverlap: false,
    margin: 10,
    formatter: (value: string, index: number) => {
      const photo = `{f${index}|}`;
      const label = sanitizeAxisLabel(
        options.labels?.[index] ?? value,
        maxLabelChars,
      );
      if (!label) return photo;
      if (layout === "stack") return `${photo}\n{name|${label}}`;
      return `${photo}{name|${label}}`;
    },
    rich,
  };
}

/** Espacio mínimo por categoría para que foto + apellido entren en el eje. */
export function heatmapCellPx(memberCount: number) {
  if (memberCount <= 8) return 52;
  if (memberCount <= 12) return 44;
  if (memberCount <= 18) return 38;
  return 34;
}

export function heatmapPhotoSize(cellPx: number) {
  return Math.max(14, Math.min(22, cellPx - 16));
}


export function memberPhotoTooltipHtml(
  name: string,
  foto?: string | null,
  extra?: string,
) {
  const src = escapeHtml(foto || PLACEHOLDER_PHOTO);
  const safeName = escapeHtml(name);
  const extraHtml = extra
    ? `<div class="opacity-80 mt-0.5">${extra}</div>`
    : "";
  return `<div class="flex items-center gap-2 text-xs"><img src="${src}" alt="" width="28" height="28" style="border-radius:9999px;object-fit:cover;width:28px;height:28px;flex-shrink:0" /><div><div class="font-medium">${safeName}</div>${extraHtml}</div></div>`;
}

export function resolveChartPhoto(
  img: { (src: string, modifiers?: Record<string, any>): string },
  src?: string | null,
  size = 48,
): string {
  if (!src) return PLACEHOLDER_PHOTO;
  try {
    return img(src, {
      width: size,
      height: size,
      fit: "cover",
      format: "webp",
    });
  } catch {
    return src;
  }
}

const circularPhotoCache = new Map<string, string>();

function drawInitialsAvatar(
  ctx: CanvasRenderingContext2D,
  size: number,
  label: string,
) {
  const initials = String(label || "?")
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#6b7280";
  ctx.font = `600 ${Math.round(size * 0.36)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials || "?", size / 2, size / 2 + 1);
}

/**
 * Recorta la foto a un círculo (PNG data-URL) para símbolos ECharts.
 * `image://` dibuja el bitmap tal cual (cuadrado); el clip evita eso.
 * Si no hay foto o falla la carga, dibuja iniciales.
 */
export function loadCircularChartPhoto(
  src: string | null | undefined,
  size = 64,
  label = "",
): Promise<string> {
  const url = src || "";
  const cacheKey = `${url || "initials"}|${size}|${label}`;
  const cached = circularPhotoCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  if (typeof document === "undefined") {
    return Promise.resolve(url || PLACEHOLDER_PHOTO);
  }

  const toDataUrl = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const dpr = 2;
    const canvas = document.createElement("canvas");
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return PLACEHOLDER_PHOTO;
    ctx.scale(dpr, dpr);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    draw(ctx);
    const dataUrl = canvas.toDataURL("image/png");
    circularPhotoCache.set(cacheKey, dataUrl);
    return dataUrl;
  };

  if (!url) {
    return Promise.resolve(
      toDataUrl((ctx) => drawInitialsAvatar(ctx, size, label)),
    );
  }

  return new Promise((resolve) => {
    const image = new Image();
    if (!url.startsWith("/") && !url.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => {
      try {
        resolve(
          toDataUrl((ctx) => {
            const scale = Math.max(size / image.width, size / image.height);
            const w = image.width * scale;
            const h = image.height * scale;
            ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
          }),
        );
      } catch {
        resolve(
          toDataUrl((ctx) => drawInitialsAvatar(ctx, size, label)),
        );
      }
    };
    image.onerror = () => {
      resolve(toDataUrl((ctx) => drawInitialsAvatar(ctx, size, label)));
    };
    image.src = url;
  });
}

/** Carga en paralelo un mapa id → foto circular. */
export async function loadCircularChartPhotoMap(
  entries: Array<{ id: string; src?: string | null; label?: string }>,
  size = 64,
): Promise<Record<string, string>> {
  const pairs = await Promise.all(
    entries.map(async ({ id, src, label }) => {
      const url = await loadCircularChartPhoto(src, size, label || id);
      return [id, url] as const;
    }),
  );
  return Object.fromEntries(pairs);
}
