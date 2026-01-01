# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Accept build arguments for environment variables
ARG VITE_GOOGLE_SHEETS_URL
ARG VITE_API_URL
ARG VITE_BASE_URL

# Set them as environment variables for the build
ENV VITE_GOOGLE_SHEETS_URL=$VITE_GOOGLE_SHEETS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE_URL=$VITE_BASE_URL

# Build the application
RUN pnpm build

# Production stage - serve static files
FROM node:20-alpine

WORKDIR /app

# Install serve globally for serving static files
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Set environment
ENV NODE_ENV=production

# Serve static files on port 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
