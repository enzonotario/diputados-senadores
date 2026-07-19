<script setup lang="ts">
const route = useRoute();
const slug = String(route.params.slug || "");

await navigateTo(
  {
    path: `/senadores/partidos/${slug}`,
    query: { vista: "afinidad" },
  },
  { redirectCode: 301, replace: true },
);
</script>
