import { getBloquesSenado, getEscalaSalarialSenado, getGastoSenado } from '../../app/lib/senadores-data'

export default defineEventHandler(async () => {
  const [gasto, bloques, escala] = await Promise.all([
    getGastoSenado(),
    getBloquesSenado(),
    getEscalaSalarialSenado(),
  ])

  return {
    gasto,
    bloques,
    escala,
  }
})
