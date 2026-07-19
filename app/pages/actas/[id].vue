<script setup lang="ts">
const { isDiputados } = useChamber();
</script>

<template>
  <ActasDiputadosActaDetail v-if="isDiputados" />
  <ActasSenadoresActaDetail v-else />
</template>
