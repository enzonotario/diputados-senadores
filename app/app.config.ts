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
          color: "success",
          variant: "soft",
          class:
            "!bg-teal-100/50 !text-teal-800 dark:!bg-teal-900/50 dark:!text-teal-200",
        },
        {
          color: "warning",
          variant: "soft",
          class:
            "!bg-amber-100/50 !text-amber-800 dark:!bg-amber-900/50 dark:!text-amber-200",
        },
        {
          color: "secondary",
          variant: "soft",
          class:
            "!bg-cyan-100/50 !text-cyan-800 dark:!bg-cyan-900/50 dark:!text-cyan-200",
        },
        {
          color: "info",
          variant: "soft",
          class:
            "!bg-blue-100/50 !text-blue-800 dark:!bg-blue-900/50 dark:!text-blue-200",
        },
        {
          color: "error",
          variant: "soft",
          class:
            "!bg-red-100/50 !text-red-800 dark:!bg-red-900/50 dark:!text-red-200",
        },
        {
          size: "xs",
          class: "text-[10px]",
        },
      ],
    },
  },
});
