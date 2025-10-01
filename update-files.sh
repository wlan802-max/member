#!/bin/bash

# File-based Update Script
# Use this when you want to update specific files without Git

set -e

APP_DIR="/var/www/membership-system"
APP_USER="membership"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Function to update a single file
update_file() {
    local src_file="$1"
    local dest_file="$APP_DIR/$2"
    
    if [ ! -f "$src_file" ]; then
        warn "Source file not found: $src_file"
        return 1
    fi
    
    log "Updating: $dest_file"
    
    # Create directory if it doesn't exist
    sudo mkdir -p "$(dirname "$dest_file")"
    
    # Copy file and set ownership
    sudo cp "$src_file" "$dest_file"
    sudo chown $APP_USER:$APP_USER "$dest_file"
}

# Check if we're in the right directory
if [ ! -f "src/App.tsx" ] && [ ! -f "package.json" ]; then
    error "Please run this script from your project directory (where package.json is located)"
fi

log "Starting file-based update..."

# Update key application files
log "Updating application files..."

# Core application files
update_file "src/App.tsx" "src/App.tsx"
update_file "src/lib/tenant.ts" "src/lib/tenant.ts"
update_file "src/hooks/useTenant.ts" "src/hooks/useTenant.ts"
update_file "src/hooks/useAuth.ts" "src/hooks/useAuth.ts"
update_file "src/lib/auth.ts" "src/lib/auth.ts"
update_file "src/lib/supabase/client.ts" "src/lib/supabase/client.ts"

# Components
update_file "src/components/admin/SuperAdminDashboard.tsx" "src/components/admin/SuperAdminDashboard.tsx"
update_file "src/components/admin/SuperAdminAuth.tsx" "src/components/admin/SuperAdminAuth.tsx"
update_file "src/components/admin/SuperAdminLayout.tsx" "src/components/admin/SuperAdminLayout.tsx"
update_file "src/components/auth/LoginForm.tsx" "src/components/auth/LoginForm.tsx"
update_file "src/components/dashboard/MemberDashboard.tsx" "src/components/dashboard/MemberDashboard.tsx"
update_file "src/components/layout/Header.tsx" "src/components/layout/Header.tsx"

# UI Components
update_file "src/components/ui/button.tsx" "src/components/ui/button.tsx"
update_file "src/components/ui/card.tsx" "src/components/ui/card.tsx"
update_file "src/components/ui/input.tsx" "src/components/ui/input.tsx"
update_file "src/components/ui/badge.tsx" "src/components/ui/badge.tsx"

# Utilities
update_file "src/lib/utils.ts" "src/lib/utils.ts"

# Configuration files (be careful with these)
if [ -f "package.json" ]; then
    log "Updating package.json..."
    # Backup existing package.json
    sudo cp "$APP_DIR/package.json" "$APP_DIR/package.json.backup"
    update_file "package.json" "package.json"
fi

if [ -f "vite.config.ts" ]; then
    update_file "vite.config.ts" "vite.config.ts"
fi

if [ -f "tailwind.config.js" ]; then
    update_file "tailwind.config.js" "tailwind.config.js"
fi

if [ -f "tsconfig.json" ]; then
    update_file "tsconfig.json" "tsconfig.json"
fi

if [ -f "tsconfig.app.json" ]; then
    update_file "tsconfig.app.json" "tsconfig.app.json"
fi

# Server files
if [ -f "server.js" ]; then
    update_file "server.js" "server.js"
fi

if [ -f "ecosystem.config.cjs" ]; then
    update_file "ecosystem.config.cjs" "ecosystem.config.cjs"
fi

log "Files updated successfully!"

# Ask if user wants to rebuild and restart
read -p "Do you want to rebuild and restart the application? (y/N): " rebuild
if [[ $rebuild =~ ^[Yy]$ ]]; then
    log "Rebuilding application..."
    
    cd "$APP_DIR"
    
    # Install dependencies if package.json was updated
    if [ -f "package.json.backup" ]; then
        log "Installing dependencies..."
        sudo -u $APP_USER npm ci
    fi
    
    # Build application
    log "Building application..."
    sudo -u $APP_USER npm run build
    
    # Remove dev dependencies
    sudo -u $APP_USER npm prune --omit=dev
    
    # Restart PM2
    log "Restarting application..."
    sudo -u $APP_USER pm2 restart membership-system --update-env
    
    # Wait and check health
    sleep 5
    if curl -f -s "http://localhost:5173/health" > /dev/null 2>&1; then
        log "✅ Application restarted successfully!"
    else
        warn "❌ Application may not be running properly. Check logs with: sudo -u $APP_USER pm2 logs membership-system"
    fi
else
    warn "Remember to rebuild and restart the application manually:"
    echo "cd $APP_DIR"
    echo "sudo -u $APP_USER npm ci"
    echo "sudo -u $APP_USER npm run build"
    echo "sudo -u $APP_USER npm prune --omit=dev"
    echo "sudo -u $APP_USER pm2 restart membership-system --update-env"
fi

log "File update completed!"