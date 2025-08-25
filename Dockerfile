# === Stage 1: build frontend ===
FROM node:20-alpine AS fe
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# === Stage 2: build backend ===
FROM node:20-alpine AS be
WORKDIR /app/test-case
COPY test-case/package*.json ./
RUN npm ci
COPY test-case ./
RUN npm run build

# === Stage 3: runtime ===
FROM node:20-alpine
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=8000
WORKDIR /app

# runtime-залежності бекенда без скриптів (щоб не стріляв postinstall)
COPY test-case/package*.json /app/test-case/
RUN cd /app/test-case && npm ci --omit=dev --ignore-scripts

# артефакти збірки
COPY --from=be /app/test-case/dist /app/test-case/dist
COPY --from=fe /app/frontend/dist /app/frontend/dist

EXPOSE 8000
CMD ["node", "/app/test-case/dist/index.js"]
