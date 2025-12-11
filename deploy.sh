#!/bin/bash
# ==============================================================================
# Wedding Photo Booth - Deployment Script for Proxmox
# ==============================================================================
# This script sets up the complete photo booth application on your server.
# Run as root or with sudo.
# ==============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/photobooth"
REPO_URL="https://github.com/meezymeek/HHWeddingBooth.git"
DATA_DIR="/opt/photobooth/data"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Haven & Hayden Wedding Photo Booth - Deployment Script     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

# ==============================================================================
# Step 1: Install Dependencies
# ==============================================================================
echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"

# Update package list
apt-get update

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    echo -e "${BLUE}Installing Docker Compose plugin...${NC}"
    apt-get install -y docker-compose-plugin
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

# Install git if not present
if ! command -v git &> /dev/null; then
    echo -e "${BLUE}Installing Git...${NC}"
    apt-get install -y git
else
    echo -e "${GREEN}Git already installed${NC}"
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ==============================================================================
# Step 2: Create Directory Structure
# ==============================================================================
echo -e "${YELLOW}Step 2: Creating directory structure...${NC}"

mkdir -p ${INSTALL_DIR}
mkdir -p ${DATA_DIR}/photos
mkdir -p ${INSTALL_DIR}/nginx/conf.d

echo -e "${GREEN}✓ Directories created at ${INSTALL_DIR}${NC}"
echo ""

# ==============================================================================
# Step 3: Clone Repository
# ==============================================================================
echo -e "${YELLOW}Step 3: Cloning repository...${NC}"

if [ -d "${INSTALL_DIR}/app" ]; then
    echo -e "${BLUE}Repository exists, pulling latest changes...${NC}"
    cd ${INSTALL_DIR}
    git pull origin master
else
    echo -e "${BLUE}Cloning fresh repository...${NC}"
    cd ${INSTALL_DIR}
    git clone ${REPO_URL} temp_clone
    mv temp_clone/* .
    mv temp_clone/.* . 2>/dev/null || true
    rm -rf temp_clone
fi

echo -e "${GREEN}✓ Repository ready${NC}"
echo ""

# ==============================================================================
# Step 4: Copy Deployment Files
# ==============================================================================
echo -e "${YELLOW}Step 4: Setting up deployment configuration...${NC}"

# Copy docker-compose.yml if not customized
if [ ! -f "${INSTALL_DIR}/docker-compose.yml" ]; then
    cat > ${INSTALL_DIR}/docker-compose.yml << 'DOCKERCOMPOSE'
version: '3.8'

services:
  backend:
    build:
      context: ./app
      dockerfile: Dockerfile
    container_name: photobooth-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3001
      - HOST=0.0.0.0
      - DATABASE_PATH=/data/photobooth.db
      - PHOTOS_PATH=/data/photos
      - PUBLIC_URL=${PUBLIC_URL:-https://photobooth.meekthenilands.com}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - GMAIL_USER=${GMAIL_USER}
      - GMAIL_APP_PASSWORD=${GMAIL_APP_PASSWORD}
    volumes:
      - ./data:/data
    networks:
      - photobooth-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - PUBLIC_API_URL=${PUBLIC_URL:-https://photobooth.meekthenilands.com}
    container_name: photobooth-frontend
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - photobooth-network

  nginx:
    image: nginx:alpine
    container_name: photobooth-nginx
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - backend
      - frontend
    networks:
      - photobooth-network

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: photobooth-tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - nginx
    networks:
      - photobooth-network

networks:
  photobooth-network:
    driver: bridge
DOCKERCOMPOSE
fi

# Create backend Dockerfile if not exists
if [ ! -f "${INSTALL_DIR}/app/Dockerfile" ]; then
    cat > ${INSTALL_DIR}/app/Dockerfile << 'DOCKERFILE'
FROM node:20-alpine

RUN apk add --no-cache python3 make g++ vips-dev fftw-dev wget

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

RUN mkdir -p /data/photos && chown -R node:node /app /data

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -q --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
DOCKERFILE
fi

# Create frontend Dockerfile if not exists
if [ ! -f "${INSTALL_DIR}/frontend/Dockerfile" ]; then
    cat > ${INSTALL_DIR}/frontend/Dockerfile << 'DOCKERFILE'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG PUBLIC_API_URL=https://photobooth.meekthenilands.com
ENV PUBLIC_API_URL=${PUBLIC_API_URL}
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE
fi

# Create frontend nginx.conf if not exists
if [ ! -f "${INSTALL_DIR}/frontend/nginx.conf" ]; then
    cat > ${INSTALL_DIR}/frontend/nginx.conf << 'NGINXCONF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss image/svg+xml;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /service-worker.js {
        expires off;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXCONF
fi

# Create main nginx.conf
cat > ${INSTALL_DIR}/nginx/nginx.conf << 'MAINNGINX'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';
    access_log /var/log/nginx/access.log main;

    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 25M;

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    limit_req_zone $binary_remote_addr zone=general:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=uploads:10m rate=20r/m;

    include /etc/nginx/conf.d/*.conf;
}
MAINNGINX

# Create nginx site config
cat > ${INSTALL_DIR}/nginx/conf.d/default.conf << 'SITECONF'
upstream backend {
    server backend:3001;
    keepalive 32;
}

upstream frontend {
    server frontend:80;
    keepalive 32;
}

server {
    listen 80;
    server_name localhost photobooth.meekthenilands.com;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location /api/ {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /api/photos {
        limit_req zone=uploads burst=10 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        client_max_body_size 25M;
    }

    location /health {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /photos/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 1d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
SITECONF

echo -e "${GREEN}✓ Deployment configuration ready${NC}"
echo ""

# ==============================================================================
# Step 5: Environment Configuration
# ==============================================================================
echo -e "${YELLOW}Step 5: Environment configuration...${NC}"

if [ ! -f "${INSTALL_DIR}/.env" ]; then
    cat > ${INSTALL_DIR}/.env << 'ENVFILE'
# Wedding Photo Booth - Production Environment
# IMPORTANT: Fill in these values before starting!

# Cloudflare Tunnel Token (REQUIRED)
CLOUDFLARE_TUNNEL_TOKEN=

# Admin Dashboard Password (REQUIRED)
ADMIN_PASSWORD=

# Gmail for sending photos (REQUIRED)
GMAIL_USER=photobooth@meekthenilands.com
GMAIL_APP_PASSWORD=

# Public URL
PUBLIC_URL=https://photobooth.meekthenilands.com

# Internal settings
NODE_ENV=production
ENVFILE

    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  IMPORTANT: You need to edit ${INSTALL_DIR}/.env           ║${NC}"
    echo -e "${RED}║  Fill in the required values before continuing!             ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Required values:${NC}"
    echo "  1. CLOUDFLARE_TUNNEL_TOKEN - Get from Cloudflare Zero Trust dashboard"
    echo "  2. ADMIN_PASSWORD - Choose a secure password for admin access"
    echo "  3. GMAIL_APP_PASSWORD - Generate at https://myaccount.google.com/apppasswords"
    echo ""
    echo -e "${BLUE}After editing .env, run this script again or run:${NC}"
    echo "  cd ${INSTALL_DIR} && docker compose up -d --build"
    echo ""
    exit 0
else
    # Check if required values are set
    source ${INSTALL_DIR}/.env
    MISSING=""
    [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ] && MISSING="${MISSING}CLOUDFLARE_TUNNEL_TOKEN "
    [ -z "$ADMIN_PASSWORD" ] && MISSING="${MISSING}ADMIN_PASSWORD "
    [ -z "$GMAIL_APP_PASSWORD" ] && MISSING="${MISSING}GMAIL_APP_PASSWORD "
    
    if [ -n "$MISSING" ]; then
        echo -e "${RED}Error: Missing required environment variables: ${MISSING}${NC}"
        echo "Please edit ${INSTALL_DIR}/.env and fill in all required values."
        exit 1
    fi
    echo -e "${GREEN}✓ Environment configuration looks good${NC}"
fi
echo ""

# ==============================================================================
# Step 6: Build and Start Services
# ==============================================================================
echo -e "${YELLOW}Step 6: Building and starting services...${NC}"

cd ${INSTALL_DIR}

# Build images
echo -e "${BLUE}Building Docker images (this may take a few minutes)...${NC}"
docker compose build --no-cache

# Start services
echo -e "${BLUE}Starting services...${NC}"
docker compose up -d

echo -e "${GREEN}✓ Services started${NC}"
echo ""

# ==============================================================================
# Step 7: Verify Deployment
# ==============================================================================
echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"

# Wait for services to be ready
echo -e "${BLUE}Waiting for services to initialize...${NC}"
sleep 15

# Check service status
echo ""
echo -e "${BLUE}Service Status:${NC}"
docker compose ps

# Test health endpoint
echo ""
echo -e "${BLUE}Testing health endpoint...${NC}"
if curl -s http://localhost:8080/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "Check logs with: docker compose logs backend"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Deployment Complete! 🎉                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo "  • Local:  http://localhost:8080"
echo "  • Public: https://photobooth.meekthenilands.com"
echo "  • Admin:  https://photobooth.meekthenilands.com/admin"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  • View logs:      cd ${INSTALL_DIR} && docker compose logs -f"
echo "  • Restart:        cd ${INSTALL_DIR} && docker compose restart"
echo "  • Stop:           cd ${INSTALL_DIR} && docker compose down"
echo "  • Update:         cd ${INSTALL_DIR} && git pull && docker compose up -d --build"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure your Cloudflare Tunnel to point to http://nginx:80"
echo "  2. Test the photo booth at https://photobooth.meekthenilands.com"
echo "  3. Verify admin access at /admin with your password"
echo ""
