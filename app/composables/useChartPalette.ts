import { getVotoTipoConfig } from "@/utils/votoTipo";

export type ChartPalette = {
  isDark: boolean;
  text: string;
  textMuted: string;
  border: string;
  splitLine: string;
  background: string;
  tooltipBg: string;
  axis: string;
  primary: string;
  afirmativo: string;
  negativo: string;
  abstencion: string;
  ausente: string;
  otros: string;
  presentismo: string;
};

/** Paleta alineada a Nuxt UI / votoTipo, reactiva al color mode. */
export function useChartPalette() {
  const colorMode = useColorMode();

  return computed<ChartPalette>(() => {
    const dark = colorMode.value === "dark";
    return {
      isDark: dark,
      text: dark ? "#e5e7eb" : "#111827",
      textMuted: dark ? "#9ca3af" : "#6b7280",
      border: dark ? "#374151" : "#e5e7eb",
      splitLine: dark ? "#1f2937" : "#f3f4f6",
      background: "transparent",
      tooltipBg: dark ? "rgba(17,24,39,0.94)" : "rgba(255,255,255,0.96)",
      axis: dark ? "#6b7280" : "#9ca3af",
      primary: dark ? "#f9fafb" : "#111827",
      afirmativo: getVotoTipoConfig("afirmativo").color,
      negativo: getVotoTipoConfig("negativo").color,
      abstencion: getVotoTipoConfig("abstencion").color,
      ausente: getVotoTipoConfig("ausente").color,
      otros: dark ? "#a78bfa" : "#7c3aed",
      presentismo: dark ? "#2dd4bf" : "#0d9488",
    };
  });
}

export function baseChartChrome(p: ChartPalette) {
  return {
    backgroundColor: p.background,
    textStyle: { color: p.text, fontFamily: "inherit" },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: p.tooltipBg,
      borderColor: p.border,
      borderWidth: 1,
      textStyle: { color: p.text, fontSize: 12 },
      extraCssText:
        "backdrop-filter: blur(8px); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.12);",
      axisPointer: {
        type: "cross" as const,
        crossStyle: { color: p.axis },
        lineStyle: { color: p.axis, type: "dashed" as const },
      },
    },
    legend: {
      textStyle: { color: p.textMuted },
      top: 4,
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: {
      left: 48,
      right: 20,
      top: 48,
      bottom: 72,
      containLabel: false,
    },
    toolbox: {
      right: 8,
      top: 0,
      iconStyle: { borderColor: p.textMuted },
      emphasis: { iconStyle: { borderColor: p.text } },
      feature: {
        dataZoom: { yAxisIndex: "none" as const },
        restore: {},
        saveAsImage: {
          pixelRatio: 2,
          backgroundColor: p.isDark ? "#111827" : "#ffffff",
        },
      },
    },
    dataZoom: [
      {
        type: "inside" as const,
        xAxisIndex: 0,
        filterMode: "none" as const,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: "slider" as const,
        xAxisIndex: 0,
        height: 22,
        bottom: 12,
        borderColor: p.border,
        backgroundColor: p.splitLine,
        fillerColor: p.isDark ? "rgba(45,212,191,0.18)" : "rgba(13,148,136,0.15)",
        handleStyle: { color: p.presentismo, borderColor: p.presentismo },
        textStyle: { color: p.textMuted, fontSize: 10 },
        dataBackground: {
          lineStyle: { color: p.axis },
          areaStyle: { color: p.splitLine },
        },
      },
    ],
  };
}
