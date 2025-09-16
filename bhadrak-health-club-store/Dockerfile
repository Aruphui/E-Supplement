# Multi-stage Dockerfile for Bhadrak Health Club Store
# Stage 1: Build and prepare the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production image
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules

# Copy application files
COPY --chown=nodejs:nodejs backend/ ./backend/
COPY --chown=nodejs:nodejs admin-portal/ ./admin-portal/
COPY --chown=nodejs:nodejs user-store/ ./user-store/
COPY --chown=nodejs:nodejs package*.json ./

# Create directories for database and uploads with proper permissions
RUN mkdir -p /app/data /app/backend/uploads && \
    chown -R nodejs:nodejs /app/data /app/backend/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/server.js"]