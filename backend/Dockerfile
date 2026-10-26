# syntax=docker/dockerfile:1
# Production image: compiled JS + production dependencies only, runs as the unprivileged "node" user.

# --- production dependencies ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# --- build: compile TypeScript ---
FROM node:22-alpine AS build
WORKDIR /app
# Tests are not run here (CI runs them); skip downloading the test MongoDB binary.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- runtime ---
# Plain Alpine plus only the node binary: no npm, npx, yarn or corepack (smaller, fewer tools for an attacker).
FROM node:22-alpine AS node
FROM alpine:3.22
RUN apk add --no-cache libstdc++ && addgroup -g 1000 node && adduser -u 1000 -G node -s /bin/sh -D node
COPY --from=node /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Demo photos for "node dist/scripts/seed.js"
COPY seed-assets ./seed-assets
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
