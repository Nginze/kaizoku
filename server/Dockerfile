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

# Build TypeScript (if tsconfig exists) - continue even if build fails
RUN if [ -f tsconfig.json ]; then \
      pnpm build || npx tsc || echo "Build skipped - will use ts-node"; \
    fi

# Production stage
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including tsx for running TypeScript)
RUN pnpm install --frozen-lockfile || npm install

# Copy source from builder
RUN --mount=type=bind,from=builder,source=/app,target=/build \
    cp -r /build/src ./src

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run the server using tsx (handles ES modules properly)
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
