#!/bin/bash

# Application Update Script for Multi-Tenant Membership Management System
# This script safely updates the application on the production server

set -e

# Configuration
APP_NAME="membership-system"
APP_DIR="/var/www/$APP_NAME"
APP_USER="membership"
BACKUP_DIR="/var/backups/$APP_NAME"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as correct user
check_user() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Check if application directory exists
check_app_dir() {
    if [ ! -d "$APP_DIR" ]; then
        error "Application directory $APP_DIR does not exist. Please run the deployment script first."
    fi
}

# Create backup before update
create_backup() {
    log "Creating backup before update..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/pre_update_backup_$timestamp.tar.gz"
    
    # Create backup directory if it doesn't exist
    sudo mkdir -p "$BACKUP_DIR"
    sudo chown $APP_USER:$APP_USER "$BACKUP_DIR"
    
    # Backup .env file separately
    if [ -f "$APP_DIR/.env" ]; then
        sudo cp "$APP_DIR/.env" "$BACKUP_DIR/.env.backup_$timestamp"
        log ".env file backed up separately"
    fi
    
    # Create backup
    sudo tar -czf "$backup_file" \
        --exclude=node_modules \
        --exclude=dist \
        --exclude=.git \
        --exclude=*.log \
        -C /var/www "$APP_NAME"
    
    log "Backup created: $backup_file"
    
    # Keep only last 5 backups
    sudo find "$BACKUP_DIR" -name "pre_update_backup_*.tar.gz" -type f | sort -r | tail -n +6 | sudo xargs rm -f
}

# Check application health
check_health() {
    local url="http://localhost:5173/health"
    local max_attempts=30
    local attempt=1
    
    log "Checking application health..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log "Application is healthy"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts failed, waiting 2 seconds..."
        sleep 2
        ((attempt++))
    done
    
    error "Application health check failed after $max_attempts attempts"
}

# Update from local files
update_from_local() {
    log "Updating application from local files..."
    
    # Check if we're in a valid source directory
    if [ ! -f "$SCRIPT_DIR/package.json" ]; then
        error "package.json not found in $SCRIPT_DIR. Please run this script from your project directory."
    fi
    
    log "Copying files from: $SCRIPT_DIR"
    log "To: $APP_DIR"
    
    # Preserve .env file
    local env_backup=""
    if [ -f "$APP_DIR/.env" ]; then
        env_backup=$(mktemp)
        sudo cp "$APP_DIR/.env" "$env_backup"
        log ".env file preserved in temporary location"
    fi
    
    # Stop the application before updating (if it's running)
    log "Stopping application if running..."
    if sudo -u $APP_USER pm2 describe $APP_NAME > /dev/null 2>&1; then
        sudo -u $APP_USER pm2 stop $APP_NAME
        log "Application stopped"
    else
        info "Application not running in PM2, skipping stop"
    fi
    
    # Copy all files except excluded ones
    log "Copying updated files..."
    sudo rsync -av \
        --exclude=node_modules \
        --exclude=dist \
        --exclude=.git \
        --exclude=.env \
        --exclude=*.log \
        --exclude=.env.* \
        --delete \
        "$SCRIPT_DIR/" "$APP_DIR/"
    
    # Restore .env file
    if [ -n "$env_backup" ] && [ -f "$env_backup" ]; then
        sudo cp "$env_backup" "$APP_DIR/.env"
        sudo chown $APP_USER:$APP_USER "$APP_DIR/.env"
        sudo rm -f "$env_backup"
        log ".env file restored after update"
    fi
    
    # Set correct ownership
    sudo chown -R $APP_USER:$APP_USER "$APP_DIR"
    
    log "Files copied successfully"
    return 0
}

# Install dependencies
install_dependencies() {
    log "Installing/updating dependencies..."
    
    cd "$APP_DIR"
    
    # Install all dependencies (including dev dependencies for build)
    sudo -u $APP_USER npm ci
    
    log "Dependencies installed successfully"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$APP_DIR"
    
    # Build the application
    sudo -u $APP_USER npm run build
    
    # Remove dev dependencies after build
    sudo -u $APP_USER npm prune --omit=dev
    
    log "Application built successfully"
}

# Restart application
restart_application() {
    log "Restarting application..."
    
    # Restart PM2 process
    sudo -u $APP_USER pm2 restart $APP_NAME --update-env
    
    # Wait a moment for the process to start
    sleep 5
    
    log "Application restarted"
}

# Rollback function
rollback() {
    warn "Rolling back to previous version..."
    
    # Find the most recent backup
    local latest_backup=$(sudo find "$BACKUP_DIR" -name "pre_update_backup_*.tar.gz" -type f | sort -r | head -n 1)
    
    if [ -z "$latest_backup" ]; then
        error "No backup found for rollback"
    fi
    
    log "Rolling back using backup: $latest_backup"
    
    # Stop the application
    sudo -u $APP_USER pm2 stop $APP_NAME || true
    
    # Extract backup
    sudo tar -xzf "$latest_backup" -C /var/www/
    sudo chown -R $APP_USER:$APP_USER "$APP_DIR"
    
    # Restart application
    sudo -u $APP_USER pm2 start $APP_NAME
    
    log "Rollback completed"
}

# Show application status
show_status() {
    log "Application Status:"
    echo "===================="
    
    # PM2 status
    sudo -u $APP_USER pm2 status $APP_NAME
    
    echo ""
    
    # Recent logs
    log "Recent logs:"
    sudo -u $APP_USER pm2 logs $APP_NAME --lines 10 --nostream
    
    echo ""
    
    # Health check
    if curl -f -s "http://localhost:5173/health" > /dev/null 2>&1; then
        log "✅ Application is healthy"
    else
        warn "❌ Application health check failed"
    fi
    
    # SSL check (get domain from .env or nginx config)
    local domain=$(grep -oP 'server_name \K[^;*\s]+' /etc/nginx/sites-available/$APP_NAME 2>/dev/null | head -n1)
    if [ -n "$domain" ] && curl -f -s "https://$domain/health" > /dev/null 2>&1; then
        log "✅ HTTPS is working (https://$domain)"
    else
        warn "❌ HTTPS health check failed"
    fi
}

# Main update function
main_update() {
    log "Starting application update..."
    
    check_user
    check_app_dir
    
    # Create backup
    create_backup
    
    # Update source code from local directory
    update_from_local
    
    # Install dependencies
    install_dependencies
    
    # Build application
    build_application
    
    # Restart application
    restart_application
    
    # Health check
    if ! check_health; then
        error "Health check failed after update. Consider rolling back."
    fi
    
    log "Update completed successfully!"
    log "=========================="
    
    # Show status
    show_status
}

# Command line interface
case "${1:-update}" in
    "update")
        main_update
        ;;
    "rollback")
        rollback
        ;;
    "status")
        show_status
        ;;
    "health")
        check_health
        ;;
    "logs")
        log "Showing recent logs:"
        sudo -u $APP_USER pm2 logs $APP_NAME --lines ${2:-50}
        ;;
    "restart")
        restart_application
        check_health
        ;;
    "backup")
        create_backup
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  update    - Update the application (default)"
        echo "  rollback  - Rollback to previous version"
        echo "  status    - Show application status"
        echo "  health    - Check application health"
        echo "  logs [n]  - Show recent logs (default: 50 lines)"
        echo "  restart   - Restart the application"
        echo "  backup    - Create a backup"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Update the application"
        echo "  $0 status            # Show status"
        echo "  $0 logs 100          # Show last 100 log lines"
        echo "  $0 rollback          # Rollback to previous version"
        ;;
    *)
        error "Unknown command: $1. Use '$0 help' for usage information."
        ;;
esac