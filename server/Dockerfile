# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || npm install

# Copy source code and TypeScript config
COPY . .

# Build TypeScript (if tsconfig exists)
RUN if [ -f tsconfig.json ]; then \
      npx tsc || pnpm build || echo "Build skipped"; \
    fi

# Production stage
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod || npm install --production

# Copy built files or source from builder
COPY --from=builder /app/dist ./dist 2>/dev/null || true
COPY --from=builder /app/src ./src

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run the server (try dist first, fallback to src)
CMD if [ -d "dist" ] && [ "$(ls -A dist)" ]; then \
      node dist/index.js; \
    else \
      npx ts-node src/index.ts; \
    fi
