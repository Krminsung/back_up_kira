FROM node:20 AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8003

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads/avatars && chown -R expressjs:nodejs /app/uploads

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/schema.sql ./schema.sql

USER expressjs

EXPOSE 8003

# Start Script (no more Prisma migrations)
COPY --chmod=755 <<EOF /app/start.sh
#!/bin/sh
echo "Starting backend server..."
npm start
EOF

CMD ["/bin/sh", "/app/start.sh"]
