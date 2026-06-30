# syntax=docker/dockerfile:1

# WASM build is arch-independent; always compile on the native builder platform.
FROM --platform=$BUILDPLATFORM emscripten/emsdk:3.1.54 AS wasm

WORKDIR /app/src/wasm

COPY src/wasm/ .

RUN chmod +x build_editdistance.sh build_timesignal.sh \
  && ./build_editdistance.sh \
  && ./build_timesignal.sh

FROM --platform=$BUILDPLATFORM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
COPY --from=wasm /app/wasm ./wasm

RUN npx vite build

FROM nginx:alpine AS runtime

RUN apk add --no-cache chrony

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 356

ENTRYPOINT ["/entrypoint.sh"]
