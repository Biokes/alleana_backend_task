# syntax=docker/dockerfile:1

# ---------- Base builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm i; fi

# Copy source
COPY tsconfig.json .
COPY src ./src

# Build TypeScript
RUN npx tsc

# ---------- Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only necessary files
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install --prod --frozen-lockfile; \
    elif [ -f yarn.lock ]; then corepack enable && yarn install --production --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --omit=dev; \
    else npm i --omit=dev; fi

COPY --from=builder /app/dist ./dist

# Default port (can be overridden by PORT env)
EXPOSE 3000

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

# Run the server
CMD ["node", "dist/app.js"]
