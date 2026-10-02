FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client and Build NestJS
RUN npx prisma generate
RUN npm run build

# --- Production Image ---
FROM node:22-alpine

WORKDIR /app

# Copy built artifacts and node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Start command
CMD ["npm", "run", "start:prod"]
