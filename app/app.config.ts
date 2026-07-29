export default defineAppConfig({
  ui: {
    colors: {
      primary: "teal",
      secondary: "cyan",
      neutral: "zinc",
    },
    // Sitio de contenido (no dashboard fixed): evitar inset-0 / overflow-hidden.
    dashboardGroup: {
      base: "relative flex flex-col min-h-dvh overflow-visible",
    },
    badge: {
      compoundVariants: [
        {
          color: "primary",
          variant: "soft",
          class:
            "!bg-teal-100 !text-teal-900 dark:!bg-teal-900/50 dark:!text-teal-100",
        },
        {
          color: "success",
          variant: "soft",
          class:
            "!bg-teal-100 !text-teal-900 dark:!bg-teal-900/50 dark:!text-teal-100",
        },
        {
          color: "warning",
          variant: "soft",
          class:
            "!bg-amber-100 !text-amber-950 dark:!bg-amber-900/50 dark:!text-amber-100",
        },
        {
          color: "secondary",
          variant: "soft",
          class:
            "!bg-cyan-100 !text-cyan-950 dark:!bg-cyan-900/50 dark:!text-cyan-100",
        },
        {
          color: "info",
          variant: "soft",
          class:
            "!bg-blue-100 !text-blue-950 dark:!bg-blue-900/50 dark:!text-blue-100",
        },
        {
          color: "error",
          variant: "soft",
          class:
            "!bg-red-100 !text-red-950 dark:!bg-red-900/50 dark:!text-red-100",
        },
        {
          color: "neutral",
          variant: "soft",
          class:
            "!bg-zinc-100 !text-zinc-800 dark:!bg-zinc-800 dark:!text-zinc-100",
        },
        {
          size: "xs",
          class: "text-[10px]",
        },
      ],
    },
  },
});
