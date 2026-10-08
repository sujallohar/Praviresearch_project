# ==============================================================================
# Stage 1: Build Stage (Node.js 20 Alpine)
# Compiles TypeScript and packages optimized production assets with Vite
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies strictly matching package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# Copy full application source code
COPY . .

# Build production bundle (HTML, JS, CSS, PWA assets)
ENV NODE_ENV=production
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime Stage (Ultra-minimal Nginx Alpine)
# Non-root unprivileged container execution (~35MB total image size)
# ==============================================================================
FROM nginx:alpine AS runner

# Remove default Nginx welcome configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy hardened custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Security Hardening: Ensure Nginx cache and PID paths are writable by non-root user
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html /etc/nginx/conf.d

# Switch to non-root unprivileged user for defense-in-depth container security
USER nginx

# Expose unprivileged web server port
EXPOSE 8080

# Kubernetes & Docker Health Probe
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

# Start Nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
