#!/bin/bash

# Custom Domain Management Script
# This script helps add, update, or remove custom domain Nginx configurations
# Usage: bash manage-custom-domain.sh [add|remove|ssl] [domain]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory (works with symlinks)
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0" || realpath "$0")")" && pwd)"

# Configuration
APP_NAME="membership-system"
TEMPLATE_FILE="${SCRIPT_DIR}/nginx-custom-domain-template.conf"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
CERTBOT_WEBROOT="/var/www/certbot"

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

# Check if running with proper permissions
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run with sudo. Usage: sudo bash $0 [command] [domain]"
    fi
}

# Validate domain format
validate_domain() {
    local domain=$1
    
    # Basic domain validation regex
    if [[ ! $domain =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$ ]]; then
        error "Invalid domain format: $domain"
    fi
}

# Add custom domain Nginx configuration
add_domain() {
    local domain=$1
    
    validate_domain "$domain"
    
    log "Adding Nginx configuration for custom domain: $domain"
    
    # Check if template exists
    if [ ! -f "$TEMPLATE_FILE" ]; then
        error "Template file not found: $TEMPLATE_FILE"
    fi
    
    # Create certbot webroot directory
    mkdir -p $CERTBOT_WEBROOT
    
    # Generate Nginx configuration from template
    local config_file="${NGINX_SITES_AVAILABLE}/${APP_NAME}-${domain}"
    
    # Replace {{DOMAIN}} in template
    sed "s/{{DOMAIN}}/${domain}/g" "$TEMPLATE_FILE" > "$config_file"
    
    log "Created Nginx configuration: $config_file"
    
    # Enable the site
    ln -sf "$config_file" "${NGINX_SITES_ENABLED}/${APP_NAME}-${domain}"
    
    log "Enabled site: ${APP_NAME}-${domain}"
    
    # Test Nginx configuration
    if nginx -t; then
        log "Nginx configuration test passed"
        systemctl reload nginx
        log "Nginx reloaded successfully"
    else
        error "Nginx configuration test failed. Removing configuration..."
        rm -f "$config_file"
        rm -f "${NGINX_SITES_ENABLED}/${APP_NAME}-${domain}"
    fi
    
    log "Custom domain $domain configured successfully!"
    log "Next steps:"
    log "1. Point $domain DNS A record to this server's IP address"
    log "2. Run: sudo bash $0 ssl $domain"
}

# Remove custom domain configuration
remove_domain() {
    local domain=$1
    
    validate_domain "$domain"
    
    log "Removing Nginx configuration for custom domain: $domain"
    
    # Remove enabled site
    rm -f "${NGINX_SITES_ENABLED}/${APP_NAME}-${domain}"
    
    # Remove available site
    rm -f "${NGINX_SITES_AVAILABLE}/${APP_NAME}-${domain}"
    
    log "Removed Nginx configuration for $domain"
    
    # Test and reload Nginx
    if nginx -t; then
        systemctl reload nginx
        log "Nginx reloaded successfully"
    else
        warn "Nginx configuration test failed. Please check manually."
    fi
    
    log "To remove SSL certificates, run: sudo certbot delete --cert-name $domain"
}

# Generate SSL certificate for custom domain
generate_ssl() {
    local domain=$1
    
    validate_domain "$domain"
    
    log "Generating SSL certificate for custom domain: $domain"
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log "Installing Certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Check if Nginx config exists
    local config_file="${NGINX_SITES_AVAILABLE}/${APP_NAME}-${domain}"
    if [ ! -f "$config_file" ]; then
        error "Nginx configuration not found for $domain. Run 'add' command first."
    fi
    
    # Request SSL certificate
    log "Requesting SSL certificate from Let's Encrypt..."
    log "Note: Certbot will automatically update the Nginx configuration to enable HTTPS"
    
    if certbot --nginx -d "$domain" --non-interactive --agree-tos --email "admin@${domain}" --redirect; then
        log "✅ SSL certificate generated successfully for $domain"
        log "✅ Certbot has automatically configured HTTPS redirect"
        log "✅ Your site is now accessible at: https://$domain"
        log ""
        log "SSL certificate details:"
        certbot certificates -d "$domain" 2>/dev/null || true
    else
        error "SSL certificate generation failed. Please check:"
        echo "1. DNS A record is pointing to this server: dig $domain"
        echo "2. Ports 80 and 443 are open: sudo ufw status"
        echo "3. Domain is accessible from internet: curl http://$domain"
        echo "4. Nginx is running: sudo systemctl status nginx"
    fi
}

# List all custom domains
list_domains() {
    log "Custom domain configurations:"
    
    for config in ${NGINX_SITES_AVAILABLE}/${APP_NAME}-*; do
        if [ -f "$config" ]; then
            local domain=$(basename "$config" | sed "s/${APP_NAME}-//")
            local enabled="❌ Disabled"
            
            if [ -L "${NGINX_SITES_ENABLED}/${APP_NAME}-${domain}" ]; then
                enabled="✅ Enabled"
            fi
            
            local ssl="❌ No SSL"
            if [ -d "/etc/letsencrypt/live/${domain}" ]; then
                ssl="✅ SSL Active"
            fi
            
            echo "  $domain - $enabled - $ssl"
        fi
    done
}

# Show usage
usage() {
    cat <<EOF
Custom Domain Management Script for $APP_NAME

Usage:
  sudo bash $0 add <domain>       Add a new custom domain
  sudo bash $0 remove <domain>    Remove a custom domain
  sudo bash $0 ssl <domain>       Generate SSL certificate for domain
  sudo bash $0 list               List all custom domains

Examples:
  sudo bash $0 add example.com
  sudo bash $0 ssl example.com
  sudo bash $0 remove example.com
  sudo bash $0 list

Requirements:
  - Nginx must be installed and running
  - Domain DNS must point to this server before generating SSL
  - Template file must exist: $TEMPLATE_FILE
EOF
}

# Main function
main() {
    check_permissions
    
    local command=$1
    local domain=$2
    
    case $command in
        add)
            if [ -z "$domain" ]; then
                error "Domain name required. Usage: sudo bash $0 add <domain>"
            fi
            add_domain "$domain"
            ;;
        remove)
            if [ -z "$domain" ]; then
                error "Domain name required. Usage: sudo bash $0 remove <domain>"
            fi
            remove_domain "$domain"
            ;;
        ssl)
            if [ -z "$domain" ]; then
                error "Domain name required. Usage: sudo bash $0 ssl <domain>"
            fi
            generate_ssl "$domain"
            ;;
        list)
            list_domains
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
