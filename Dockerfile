FROM oven/bun:1-alpine AS base

WORKDIR /app

# Install build tools for native deps (e.g., bcrypt on musl)
RUN apk add --no-cache python3 make g++

# Copy lockfile and package manifest first for better layer caching
COPY bun.lock package.json ./

# Install dependencies according to lockfile
RUN bun install --ci

# Copy the rest of the application code
COPY . .

# Environment defaults (can be overridden at runtime)
ENV NODE_ENV=production \
    APP_ENV=production \
    PORT=3000

EXPOSE 3000

# Start the server
CMD ["bun", "run", "start"]


