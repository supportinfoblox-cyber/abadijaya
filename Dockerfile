# ==============================================================================
# Dockerfile: TicketOps (BSI Infoblox & iCare OTRS Management System)
# Multi-runtime: Node.js 22 (LTS) + Python 3 (iCare OTRS Bridge)
# Optimized for Google Cloud Run & GCP Compute Engine
# ==============================================================================

FROM node:22-slim

# Set timezone & environment
ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=8080
ENV VITE_CONFIG_NATIVE_IGNORE_WARNING=true

# Build-time args (dari docker-compose build.args atau --build-arg)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

WORKDIR /app

# 1. Install Python 3, pip, and required HTTP libraries for OTRS bridge
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-requests \
    python3-urllib3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. Copy package manifests and .npmrc
COPY package*.json .npmrc ./

# 3. Install all dependencies (including vite & build plugins) via reproducible npm ci
RUN npm ci --include=dev --ignore-scripts --prefer-offline

# 4. Copy application source code & scripts
COPY . .

# 5. Build Vite React frontend for production
RUN npm run build

# Set production environment for runtime
ENV NODE_ENV=production

# 6. Make python, bash scripts, and entrypoint executable
RUN chmod +x docker-entrypoint.sh scripts/*.py scripts/*.sh 2>/dev/null || true

# 7. Expose default Google Cloud Run / Container port
EXPOSE 8080

# 8. Run entrypoint script that starts both sync daemon & web server
CMD ["./docker-entrypoint.sh"]
