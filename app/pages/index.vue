<script setup lang="ts">
const { isDiputados, isCongreso } = useChamber();
</script>

<template>
  <ChamberCongresoHome v-if="isCongreso" />
  <ChamberDiputadosHome v-else-if="isDiputados" />
  <ChamberSenadoresHome v-else />
</template>
