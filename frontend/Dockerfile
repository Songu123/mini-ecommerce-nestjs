FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Pass build-time environment variables
ENV NEXT_PUBLIC_API_URL=http://localhost:3000
# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js
RUN npm run build

# --- Production Image ---
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output (requires output: 'standalone' in next.config.ts)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
