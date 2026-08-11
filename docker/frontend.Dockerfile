FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/utils/package.json packages/utils/package.json
RUN npm ci --workspace @sistem-klinik/frontend --include-workspace-root

FROM dependencies AS build

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_REALTIME_URL=
ARG BACKEND_INTERNAL_URL=http://backend:4004
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL

COPY apps/frontend apps/frontend
RUN npm run build --workspace @sistem-klinik/frontend

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build --chown=node:node /app/apps/frontend/public ./apps/frontend/public

USER node

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
