# Default deployment image (Railway): backend API.
# Docker Compose uses backend.Dockerfile explicitly.
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
RUN npm ci --workspace @sistem-klinik/backend --include-workspace-root

FROM dependencies AS build

COPY apps/backend/tsconfig.json apps/backend/tsconfig.json
COPY apps/backend/src apps/backend/src
COPY packages packages
RUN npm run build --workspace @sistem-klinik/config \
  && npm run build --workspace @sistem-klinik/types \
  && npm run build --workspace @sistem-klinik/database
RUN npm run build --workspace @sistem-klinik/backend

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
RUN npm ci --omit=dev --workspace @sistem-klinik/backend --include-workspace-root \
  && npm cache clean --force

COPY --chown=node:node packages packages
COPY --from=build --chown=node:node /app/apps/backend/dist apps/backend/dist
COPY --from=build --chown=node:node /app/packages/config/dist packages/config/dist
COPY --from=build --chown=node:node /app/packages/database/dist packages/database/dist
COPY --from=build --chown=node:node /app/packages/types/dist packages/types/dist
COPY --chown=node:node apps/backend/src/data apps/backend/dist/data
RUN mkdir -p apps/backend/uploads && chown node:node apps/backend/uploads

USER node

EXPOSE 4004

CMD ["npm", "start", "--workspace", "@sistem-klinik/backend"]
