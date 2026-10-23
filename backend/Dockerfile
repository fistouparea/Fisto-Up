# --- build: compile TypeScript ---
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- runtime: production dependencies + compiled JS only ---
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Demo photos for "npm run seed" / node dist/scripts/seed.js
COPY seed-assets ./seed-assets
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
