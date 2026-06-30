# syntax=docker/dockerfile:1

# WASM build is arch-independent; always compile on the native builder platform.
FROM --platform=$BUILDPLATFORM emscripten/emsdk:3.1.54 AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN . /emsdk/emsdk_env.sh && npm run build

FROM nginx:alpine AS runtime

RUN apk add --no-cache chrony

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 356

ENTRYPOINT ["/entrypoint.sh"]
