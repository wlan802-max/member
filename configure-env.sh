#!/bin/bash

# Configuration Helper Script for Membership System
# This script helps you set up the environment variables properly

set -e

APP_DIR="/var/www/membership-system"
ENV_FILE="$APP_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root."
fi

log "Membership System Configuration Helper"
log "======================================"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    error "Environment file not found at $ENV_FILE. Please run the deployment script first."
fi

log "Current environment file location: $ENV_FILE"
echo ""

# Function to update environment variable
update_env_var() {
    local var_name=$1
    local var_description=$2
    local current_value=$(grep "^$var_name=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
    
    echo -e "${BLUE}$var_description${NC}"
    echo "Current value: $current_value"
    read -p "Enter new value (or press Enter to keep current): " new_value
    
    if [ ! -z "$new_value" ]; then
        # Escape special characters for sed
        escaped_value=$(printf '%s\n' "$new_value" | sed 's/[[\.*^$()+?{|]/\\&/g')
        sudo sed -i "s|^$var_name=.*|$var_name=$new_value|" "$ENV_FILE"
        log "Updated $var_name"
    fi
    echo ""
}

# Supabase Configuration
log "Supabase Configuration"
log "======================"
echo "You need to get these values from your Supabase project dashboard:"
echo "1. Go to https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Go to Settings > API"
echo ""

update_env_var "NEXT_PUBLIC_SUPABASE_URL" "Supabase Project URL (e.g., https://your-project.supabase.co)"
update_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase Anon/Public Key (starts with 'eyJ...')"
update_env_var "SUPABASE_SERVICE_ROLE_KEY" "Supabase Service Role Key (starts with 'eyJ...')"

# Email Configuration
log "Email Configuration (Optional)"
log "============================="
echo "For email functionality, you need a Resend API key:"
echo "1. Go to https://resend.com"
echo "2. Create an account and get your API key"
echo ""

update_env_var "RESEND_API_KEY" "Resend API Key (starts with 're_')"

# Show current configuration
log "Current Configuration Summary"
log "============================"
echo "Supabase URL: $(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d'=' -f2-)"
echo "Supabase Anon Key: $(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d'=' -f2- | cut -c1-20)..."
echo "Resend API Key: $(grep '^RESEND_API_KEY=' "$ENV_FILE" | cut -d'=' -f2- | cut -c1-10)..."
echo ""

# Restart application
read -p "Do you want to restart the application now? (y/N): " restart_app
if [[ $restart_app =~ ^[Yy]$ ]]; then
    log "Rebuilding application with new environment variables..."
    cd "$APP_DIR"
    
    # Install dev dependencies temporarily for build
    sudo -u membership npm install
    
    # Rebuild the application with new env vars
    sudo -u membership npm run build
    
    # Remove dev dependencies again
    sudo -u membership npm prune --omit=dev
    
    log "Restarting application..."
    sudo -u membership pm2 restart membership-system --update-env
    log "Application restarted successfully!"
    echo ""
    log "You can check the application status with:"
    echo "sudo -u membership pm2 status"
    echo "sudo -u membership pm2 logs membership-system"
else
    warn "Remember to restart the application after making changes:"
    echo "cd $APP_DIR"
    echo "sudo -u membership npm install"
    echo "sudo -u membership npm run build"
    echo "sudo -u membership npm prune --omit=dev"
    echo "sudo -u membership pm2 restart membership-system --update-env"
fi

log "Configuration complete!"
log "======================"
echo "Next steps:"
echo "1. Make sure your Supabase database is set up with the required tables"
echo "2. Configure DNS to point your domain to this server"
echo "3. Set up SSL certificates for subdomains if needed"
echo "4. Test the application at https://member.ringing.org.uk"