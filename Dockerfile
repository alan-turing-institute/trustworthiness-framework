# Use Debian-based Node.js image (Alpine's Chromium crashes on ARM64/aarch64)
FROM node:20-slim

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-freefont-ttf \
    libfreetype6 \
    libharfbuzz0b \
    libnss3 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-xcb1 \
    gosu \
    wget \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use the system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

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
RUN groupadd -g 1001 nodejs
RUN useradd -m -u 1001 -g nodejs nextjs

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