<script setup lang="ts">
const { isDiputados } = useChamber();
</script>

<template>
  <ActasDiputadosActasIndex v-if="isDiputados" />
  <ActasSenadoresActasIndex v-else />
</template>
