# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Install necessary system dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    su-exec

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
# Use --legacy-peer-deps if there are peer dependency conflicts
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Copy framework directory to dist
RUN mkdir -p dist/framework && cp server/framework/framework.json dist/framework/

# Copy drizzle config for migrations
COPY drizzle.config.ts /app/drizzle.config.ts

# Install drizzle-kit for migrations (keep it in production for migrations)
RUN npm install drizzle-kit

# Clean npm cache to reduce image size (but keep all node_modules)
RUN npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').request('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).end()" || exit 1

# Use entrypoint to run migrations before starting the app
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start the application
CMD ["npm", "start"]