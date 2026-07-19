<script setup lang="ts">
const { isDiputados } = useChamber();
</script>

<template>
  <ChamberDiputadosHome v-if="isDiputados" />
  <ChamberSenadoresHome v-else />
</template>
