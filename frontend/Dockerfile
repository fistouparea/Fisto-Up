# syntax=docker/dockerfile:1
# Production image: the static PWA served by an unprivileged nginx (no root, listens on 8080).

# --- build: static PWA files ---
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Optional, baked into the build: error tracking DSN, release name, API on another domain.
ARG VITE_SENTRY_DSN=""
ARG VITE_RELEASE=""
ARG VITE_API_BASE_URL=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN VITE_RELEASE=$VITE_RELEASE VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# --- serve: nginx also forwards /api to the backend ---
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx/security-headers.conf nginx/app-locations.conf nginx/http.conf /etc/nginx/snippets/
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
