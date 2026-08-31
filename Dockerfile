# ---------------------------------------------------------------------------
# BoatXchange production image.
#
# Debian slim rather than Alpine: better-sqlite3 and sharp are native modules,
# and their prebuilt binaries target glibc. Alpine works but needs a musl
# rebuild toolchain in the image, which costs more space than Debian saves.
#
# Three stages so the final image carries no compiler, no dev dependencies and
# no source — just the traced standalone server.
# ---------------------------------------------------------------------------

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` needs dev dependencies here because the build runs in the next stage.
RUN npm ci --no-audit --no-fund

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The build reaches out for the two Google fonts and self-hosts them. If your
# build environment has no outbound network, see DEPLOY.md § Offline builds.
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/boatxchange.db

# Run as a non-root user. The database directory is created here, owned by that
# user, so the app can write even when no volume is mounted over it.
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs \
 && mkdir -p /data \
 && chown -R nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

# server.js is emitted by Next's standalone output — not a file in this repo.
CMD ["node", "server.js"]
