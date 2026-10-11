# WOHNFEE – Website + Dashboard (Nuxt 3 / Nitro, Node-Server)
# Build: docker build -t wohnfee-app .   ·   Betrieb: siehe deploy/docker-compose.yml

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Uploads gehören nicht ins Image (kommen als Volume)
RUN rm -rf public/uploads/* && npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 TZ=Europe/Vienna
WORKDIR /app
# gebaute App (enthält alle öffentlichen Dateien); /app/public/uploads = Volume für Dashboard-Uploads
COPY --from=build --chown=node:node /app/.output ./.output
RUN mkdir -p public/uploads && chown -R node:node /app/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
