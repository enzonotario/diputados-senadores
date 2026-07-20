# syntax=docker/dockerfile:1
#
# Coolify usa ESTE Dockerfile (build en el VPS).
# No compila Nuxt: solo hace pull de la imagen ya buildeada en GitHub Actions → GHCR.
#
# Si GHCR es privado, configurá registry login en Coolify (PAT read:packages).
#
# Build arg opcional en Coolify:
#   IMAGE_TAG=529f832adb677a48632cf3a72938255c16e73207
#   IMAGE_TAG=feature-diputados-senadores
#   IMAGE_TAG=latest

ARG GHCR_IMAGE=ghcr.io/enzonotario/diputados-senadores
ARG IMAGE_TAG=feature-diputados-senadores

FROM ${GHCR_IMAGE}:${IMAGE_TAG}
