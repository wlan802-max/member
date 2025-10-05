#!/bin/bash

# Production Deployment Script for Multi-Tenant Membership Management System
# Ubuntu/Debian Server - Multi-tenant with subdomain support

set -e

# Configuration
APP_NAME="membership-system"
APP_DIR="/var/www/$APP_NAME"
APP_USER="membership"
PORT="5000"  # Production port
NODE_VERSION="20"  # Node.js 20 LTS

# Prompt for domain if not set via environment variable
if [ -z "$DOMAIN" ]; then
    echo ""
    echo "=================================================="
    echo "  Multi-Tenant Membership Management System"
    echo "=================================================="
    echo ""
    echo "Enter your domain name (e.g., member.ringing.org.uk):"
    echo "This will be used for:"
    echo "  - Main domain: https://yourdomain.com"
    echo "  - Subdomains: https://*.yourdomain.com (admin, org1, org2, etc.)"
    echo "  - Custom org domains can be added later via the admin UI"
    echo ""
    read -p "Domain: " DOMAIN
    
    if [ -z "$DOMAIN" ]; then
        echo "Error: Domain is required"
        exit 1
    fi
    
    echo ""
    echo "Domain set to: $DOMAIN"
    echo "Subdomains will use wildcard: *.$DOMAIN"
    echo ""
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check if running as root or if user has sudo privileges
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run with sudo or as root. Please run as: bash deploy.sh"
    fi
    
  
}

# Update system packages
update_system() {
    log "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y curl wget git unzip software-properties-common build-essential
}

# Configure firewall
setup_firewall() {
    log "Configuring firewall..."
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
}

# Install Node.js
install_nodejs() {
    log "Installing Node.js $NODE_VERSION..."
    
    # Remove existing Node.js if present
    sudo apt remove -y nodejs npm || true
    
    # Install Node.js via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    log "Node.js installed: $node_version"
    log "npm installed: $npm_version"
    
    # Install global packages
    sudo npm install -g pm2@latest
}

# Create application user
create_app_user() {
    log "Creating application user..."
    if ! id "$APP_USER" &>/dev/null; then
        sudo adduser --system --group --home $APP_DIR $APP_USER
        sudo usermod -aG sudo $APP_USER
        log "Created user: $APP_USER"
    else
        log "User $APP_USER already exists"
    fi
}

# Install and configure Nginx
install_nginx() {
    log "Installing and configuring Nginx..."
    sudo apt install nginx -y
    sudo systemctl enable nginx
    
    # Stop nginx and clear any existing configurations
    sudo systemctl stop nginx || true
    sudo pkill -f nginx || true
    sleep 2
    
    # Remove ALL existing configurations to avoid conflicts
    sudo rm -f /etc/nginx/sites-enabled/$APP_NAME
    sudo rm -f /etc/nginx/sites-available/$APP_NAME
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo rm -f /etc/nginx/sites-enabled/*
    
    # Check for any remaining nginx processes and kill them
    sudo pkill -f nginx || true
    sleep 2
    
    # Remove any nginx temp files that might cause issues
    sudo rm -rf /var/lib/nginx/tmp/* || true
    sudo rm -rf /var/cache/nginx/* || true
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
# Rate limiting zones for $APP_NAME (using unique names)
limit_req_zone \$binary_remote_addr zone=${APP_NAME}_api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=${APP_NAME}_auth:10m rate=5r/m;

# Upstream configuration
upstream ${APP_NAME}_backend {
    least_conn;
    server 127.0.0.1:$PORT max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Main server block
server {
    listen 80;
    server_name $DOMAIN *.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.resend.com;" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri @proxy;
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=${APP_NAME}_api burst=20 nodelay;
        limit_req_status 429;
        try_files \$uri @proxy;
    }
    
    # Auth endpoints rate limiting
    location ~* /(api/auth/(signin|signup|callback)|auth) {
        limit_req zone=${APP_NAME}_auth burst=5 nodelay;
        limit_req_status 429;
        try_files \$uri @proxy;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        try_files \$uri @proxy;
    }
    
    # Main proxy configuration
    location / {
        try_files \$uri @proxy;
    }
    
    location @proxy {
        proxy_pass http://${APP_NAME}_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Security
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Block access to sensitive files
    location ~* \.(env|log|sql)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# Redirect www to non-www
server {
    listen 80;
    server_name www.$DOMAIN;
    return 301 https://$DOMAIN\$request_uri;
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration first
    if sudo nginx -t; then
        log "Nginx configuration test passed"
        # Start nginx service
        if sudo systemctl start nginx; then
            log "Nginx started successfully"
        else
            error "Failed to start Nginx service. Check logs with: journalctl -xeu nginx.service"
        fi
        log "Nginx configured successfully"
    else
        log "Nginx configuration test failed. Checking for errors..."
        sudo nginx -t
        error "Nginx configuration test failed. Please check the configuration above."
    fi
}

# Install SSL certificate
install_ssl() {
    log "Installing SSL certificate..."
    sudo apt install certbot python3-certbot-nginx -y
    
    log ""
    log "========================================="
    log "  SSL Certificate Setup"
    log "========================================="
    log ""
    log "The system supports two types of SSL certificates:"
    log "1. Main domain only: $DOMAIN"
    log "2. Wildcard (recommended): $DOMAIN and *.$DOMAIN (for subdomains)"
    log ""
    log "For multi-tenant with subdomains (admin.$DOMAIN, org1.$DOMAIN, etc.),"
    log "you MUST use wildcard SSL certificate."
    log ""
    
    # Ask user for SSL type
    echo "Choose SSL certificate type:"
    echo "1) Wildcard certificate (*.${DOMAIN} + ${DOMAIN}) - RECOMMENDED for multi-tenant"
    echo "2) Main domain only (${DOMAIN})"
    echo ""
    read -p "Enter choice [1 or 2] (default: 1): " ssl_choice
    ssl_choice=${ssl_choice:-1}
    
    if [ "$ssl_choice" = "1" ]; then
        log "Setting up wildcard SSL certificate..."
        log ""
        warn "IMPORTANT: Wildcard certificates require DNS validation."
        log "You will need to:"
        log "1. Add a TXT record to your DNS (_acme-challenge.$DOMAIN)"
        log "2. Wait for DNS propagation (usually 5-15 minutes)"
        log "3. Verify with: dig @8.8.8.8 _acme-challenge.$DOMAIN TXT"
        log "4. Press Enter in Certbot to continue verification"
        log ""
        log "Note: Certbot will pause and show you the exact TXT record value to add"
        log ""
        warn "TROUBLESHOOTING: If you encounter errors, see WILDCARD_SSL_SETUP.md"
        log ""
        read -p "Press Enter to start wildcard SSL setup (or Ctrl+C to cancel)..."
        
        # Request wildcard certificate with manual DNS validation
        log "Requesting wildcard SSL certificate for $DOMAIN and *.$DOMAIN..."
        log ""
        log "Follow the instructions below carefully:"
        log "1. Certbot will show you a TXT record value"
        log "2. Add this EXACT value to your DNS"
        log "3. Wait 5-15 minutes for DNS propagation"
        log "4. Verify DNS with: dig @8.8.8.8 _acme-challenge.$DOMAIN TXT"
        log "5. Only press Enter in Certbot once DNS shows the correct value"
        log ""
        
        if sudo certbot certonly --manual --preferred-challenges dns \
            -d $DOMAIN -d "*.$DOMAIN" \
            --agree-tos --email admin@$DOMAIN \
            --manual-public-ip-logging-ok; then
            
            log "Wildcard SSL certificate obtained successfully!"
            
            # Update Nginx configuration to use the wildcard certificate
            log "Updating Nginx configuration to use wildcard certificate..."
            
            # Check if SSL is already configured
            if grep -q "ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem" /etc/nginx/sites-available/$APP_NAME; then
                log "SSL already configured in Nginx, skipping SSL configuration update"
            else
                # Replace the main server block's "listen 80;" with HTTPS configuration
                # This targets the FIRST server block by replacing listen 80 before any other server blocks
                sudo sed -i "0,/listen 80;/{s|listen 80;|listen 443 ssl http2;\n    listen [::]:443 ssl http2;\n    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;\n    ssl_protocols TLSv1.2 TLSv1.3;\n    ssl_ciphers HIGH:!aNULL:!MD5;\n    ssl_prefer_server_ciphers on;|}" /etc/nginx/sites-available/$APP_NAME
                log "Updated main server block to use HTTPS"
            fi
            
            # Add HTTP to HTTPS redirect block (only if it doesn't already exist)
            if ! grep -q "# HTTP to HTTPS redirect" /etc/nginx/sites-available/$APP_NAME; then
                sudo tee -a /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN *.$DOMAIN;
    return 301 https://\$host\$request_uri;
}
EOF
                log "Added HTTP to HTTPS redirect block"
            else
                log "HTTP to HTTPS redirect block already exists, skipping"
            fi
            
            # Test and reload nginx
            if sudo nginx -t; then
                sudo systemctl reload nginx
                log "Nginx updated to use wildcard SSL certificate"
                log "All HTTP traffic will now redirect to HTTPS"
            else
                error "Nginx configuration test failed after SSL update. Please check the configuration."
            fi
        else
            warn "Wildcard SSL certificate setup failed."
            log ""
            log "Common reasons for failure:"
            log "  - DNS TXT record not added or incorrect value"
            log "  - DNS not fully propagated (wait longer)"
            log "  - Old _acme-challenge records still present (delete them)"
            log "  - Network/firewall blocking Certbot validation"
            log ""
            log "NEXT STEPS:"
            log "1. Review the error messages above"
            log "2. Check troubleshooting guide: cat WILDCARD_SSL_SETUP.md"
            log "3. Use diagnostic tool: sudo ./ssl-helper.sh check $DOMAIN"
            log "4. Verify DNS: sudo ./ssl-helper.sh verify-dns $DOMAIN"
            log ""
            log "To retry manually:"
            log "  sudo certbot certonly --manual --preferred-challenges dns -d $DOMAIN -d '*.$DOMAIN'"
            log "Or use the helper script:"
            log "  sudo ./ssl-helper.sh setup $DOMAIN"
        fi
    else
        log "Setting up SSL certificate for main domain only..."
        
        if sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect; then
            log "SSL certificate installed successfully for $DOMAIN"
            warn "Note: Subdomains will NOT work with this certificate."
            warn "For subdomain support, run wildcard SSL setup manually:"
            log "  sudo certbot certonly --manual --preferred-challenges dns -d $DOMAIN -d '*.$DOMAIN'"
        else
            warn "Automatic SSL certificate installation failed."
            log "You can install it manually later with: sudo certbot --nginx -d $DOMAIN"
        fi
    fi
    
    # Setup auto-renewal
    sudo systemctl enable certbot.timer
    log "SSL certificate auto-renewal enabled"
}

# Setup custom domain support
setup_custom_domains() {
    log "Setting up custom domain support..."
    
    # Create custom domains management directory
    sudo mkdir -p /opt/custom-domains
    
    # Copy custom domain management files if they exist
    if [ -f "nginx-custom-domain-template.conf" ]; then
        sudo cp nginx-custom-domain-template.conf /opt/custom-domains/
        log "Copied custom domain Nginx template"
    else
        warn "Custom domain template not found: nginx-custom-domain-template.conf"
    fi
    
    if [ -f "manage-custom-domain.sh" ]; then
        sudo cp manage-custom-domain.sh /opt/custom-domains/
        sudo chmod +x /opt/custom-domains/manage-custom-domain.sh
        
        # Create symlink for easy access
        sudo ln -sf /opt/custom-domains/manage-custom-domain.sh /usr/local/bin/manage-custom-domain
        log "Installed custom domain management script"
        log "You can now use: sudo manage-custom-domain [add|remove|ssl|list] <domain>"
    else
        warn "Custom domain management script not found: manage-custom-domain.sh"
    fi
    
    # Copy documentation if it exists
    if [ -f "CUSTOM_DOMAINS_SETUP.md" ]; then
        sudo cp CUSTOM_DOMAINS_SETUP.md /opt/custom-domains/
        log "Copied custom domain setup documentation to /opt/custom-domains/CUSTOM_DOMAINS_SETUP.md"
    fi
    
    # Copy SSL troubleshooting guide if it exists
    if [ -f "WILDCARD_SSL_SETUP.md" ]; then
        sudo cp WILDCARD_SSL_SETUP.md /opt/custom-domains/
        log "Copied SSL troubleshooting guide to /opt/custom-domains/WILDCARD_SSL_SETUP.md"
    fi
    
    # Copy SSL helper script if it exists
    if [ -f "ssl-helper.sh" ]; then
        sudo cp ssl-helper.sh /opt/custom-domains/
        sudo chmod +x /opt/custom-domains/ssl-helper.sh
        sudo ln -sf /opt/custom-domains/ssl-helper.sh /usr/local/bin/ssl-helper
        log "Installed SSL helper script"
        log "You can now use: sudo ssl-helper check|setup|renew|verify-dns|test-cert <domain>"
    fi
    
    # Create certbot webroot for ACME challenges
    sudo mkdir -p /var/www/certbot
    sudo chown www-data:www-data /var/www/certbot
    
    log "Custom domain support configured!"
    log ""
    log "To add a custom domain:"
    log "1. Have organization admin add domain in UI (Dashboard → Settings → Custom Domains)"
    log "2. Point domain DNS to this server"
    log "3. Run: sudo manage-custom-domain add <domain>"
    log "4. Run: sudo manage-custom-domain ssl <domain>"
    log "5. Documentation: /opt/custom-domains/CUSTOM_DOMAINS_SETUP.md"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Create application directory
    sudo mkdir -p $APP_DIR
    sudo chown $APP_USER:$APP_USER $APP_DIR
    
    # Clone or copy application files
    if [ -d ".git" ]; then
        log "Copying application files from current directory..."
        sudo cp -r . $APP_DIR/
        sudo chown -R $APP_USER:$APP_USER $APP_DIR
    else
        error "No git repository found. Please run this script from your project directory or provide a git repository URL."
    fi
    
    # Create environment file with interactive prompts
    if [ ! -f "$APP_DIR/.env" ]; then
        log ""
        log "========================================="
        log "  Environment Configuration"
        log "========================================="
        log ""
        log "Please provide your service credentials."
        log "These are required for the application to function."
        log ""
        
        # Prompt for Supabase URL
        echo "1. Supabase Configuration"
        echo "   Get your credentials from: https://app.supabase.com/project/_/settings/api"
        echo ""
        read -p "   Enter your Supabase URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
        while [ -z "$SUPABASE_URL" ]; do
            warn "   Supabase URL is required!"
            read -p "   Enter your Supabase URL: " SUPABASE_URL
        done
        
        # Prompt for Supabase Anon Key (hidden input)
        echo ""
        read -s -p "   Enter your Supabase Anon Key (hidden): " SUPABASE_ANON_KEY
        echo ""
        while [ -z "$SUPABASE_ANON_KEY" ]; do
            warn "   Supabase Anon Key is required!"
            read -s -p "   Enter your Supabase Anon Key (hidden): " SUPABASE_ANON_KEY
            echo ""
        done
        
        # Prompt for Resend API Key (hidden input)
        echo ""
        echo "2. Resend Email Configuration"
        echo "   Get your API key from: https://resend.com/api-keys"
        echo ""
        read -s -p "   Enter your Resend API Key (hidden, or press Enter to skip): " RESEND_KEY
        echo ""
        
        # Set default if not provided
        if [ -z "$RESEND_KEY" ]; then
            RESEND_KEY="your_resend_api_key_here"
            warn "   Resend API key not provided - email features will not work until configured"
        fi
        
        log ""
        log "Creating environment file with your configuration..."
        
        sudo -u $APP_USER tee $APP_DIR/.env > /dev/null <<EOF
# Application Configuration
NODE_ENV=production
PORT=$PORT

# Supabase Configuration
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Resend Email Configuration
RESEND_API_KEY=$RESEND_KEY

# Replit Connectors (if using Replit integrations)
REPLIT_CONNECTORS_HOSTNAME=connectors.replit.com
EOF
        
        log "Environment file created successfully at $APP_DIR/.env"
    else
        log "Environment file already exists at $APP_DIR/.env, skipping"
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    sudo -u $APP_USER bash -c "cd $APP_DIR && npm ci"
    
    # Install production server dependencies
    sudo -u $APP_USER bash -c "cd $APP_DIR && npm install express --save"
    
    # Build application
    log "Building application..."
    sudo -u $APP_USER bash -c "cd $APP_DIR && npm run build"
    
    # Clean up dev dependencies after build
    log "Cleaning up dev dependencies..."
    sudo -u $APP_USER bash -c "cd $APP_DIR && npm prune --omit=dev"
}

# Setup PM2 configuration
setup_pm2() {
    log "Setting up PM2 configuration..."
    
    # Create PM2 ecosystem file
    sudo -u $APP_USER tee $APP_DIR/ecosystem.config.cjs > /dev/null <<EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'server.js',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    // Logging
    error_file: '/var/log/$APP_NAME/err.log',
    out_file: '/var/log/$APP_NAME/out.log',
    log_file: '/var/log/$APP_NAME/combined.log',
    time: true,
    
    // Memory and CPU limits
    max_memory_restart: '1G',
    
    // Process management
    listen_timeout: 30000,
    kill_timeout: 10000,
    
    // Auto restart configuration
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    
    // Watch files (disabled in production)
    watch: false,
    
    // Advanced options
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Monitoring
    pmx: false
  }]
};
EOF

    # Create log directory
    sudo mkdir -p /var/log/$APP_NAME
    sudo chown $APP_USER:$APP_USER /var/log/$APP_NAME
    
    # Start application with PM2
    log "Starting application with PM2..."
    sudo -u $APP_USER bash -c "cd $APP_DIR && pm2 start ecosystem.config.cjs"
    sudo -u $APP_USER bash -c "cd $APP_DIR && pm2 save"
    
    # Setup PM2 startup script
    sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $APP_USER --hp $APP_DIR
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    sudo tee /etc/logrotate.d/$APP_NAME > /dev/null <<EOF
/var/log/$APP_NAME/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        sudo -u $APP_USER pm2 reloadLogs
    endscript
}
EOF
}

# Setup monitoring and health checks
setup_monitoring() {
    log "Setting up monitoring and health checks..."
    
    # Create health check script
    sudo tee /usr/local/bin/${APP_NAME}-health-check > /dev/null <<EOF
#!/bin/bash
HEALTH_URL="http://localhost:$PORT/health"
LOG_FILE="/var/log/$APP_NAME/health-check.log"

response=\$(curl -s -o /dev/null -w "%{http_code}" \$HEALTH_URL)

if [ \$response -eq 200 ]; then
    echo "\$(date): Health check passed" >> \$LOG_FILE
else
    echo "\$(date): Health check failed with status \$response" >> \$LOG_FILE
    sudo -u $APP_USER pm2 restart $APP_NAME
    echo "\$(date): Application restarted" >> \$LOG_FILE
fi
EOF

    sudo chmod +x /usr/local/bin/${APP_NAME}-health-check
    
    # Add to crontab (run every 5 minutes)
    (sudo -u $APP_USER crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/${APP_NAME}-health-check") | sudo -u $APP_USER crontab -
}

# Setup backup scripts
setup_backups() {
    log "Setting up backup scripts..."
    
    # Create backup directory
    sudo mkdir -p /var/backups/$APP_NAME
    sudo chown $APP_USER:$APP_USER /var/backups/$APP_NAME
    
    # Create application backup script
    sudo tee /usr/local/bin/${APP_NAME}-backup > /dev/null <<EOF
#!/bin/bash
BACKUP_DIR="/var/backups/$APP_NAME"
DATE=\$(date +%Y%m%d_%H%M%S)
APP_DIR="$APP_DIR"

# Create backup directory
mkdir -p \$BACKUP_DIR

# Backup application files (excluding node_modules and dist)
tar -czf \$BACKUP_DIR/app_backup_\$DATE.tar.gz \\
    --exclude=node_modules \\
    --exclude=dist \\
    --exclude=.git \\
    -C /var/www $APP_NAME

# Keep only last 7 days of app backups
find \$BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: app_backup_\$DATE.tar.gz"
EOF

    sudo chmod +x /usr/local/bin/${APP_NAME}-backup
    
    # Add to crontab (run daily at 3 AM)
    (sudo -u $APP_USER crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/${APP_NAME}-backup") | sudo -u $APP_USER crontab -
}

# Install additional security tools
install_security_tools() {
    log "Installing security tools..."
    
    # Install Fail2Ban
    sudo apt install fail2ban -y
    
    # Create custom Fail2Ban configuration
    sudo tee /etc/fail2ban/jail.d/nginx.conf > /dev/null <<EOF
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600
EOF

    sudo systemctl restart fail2ban
    
    # Enable automatic security updates
    sudo apt install unattended-upgrades -y
    sudo dpkg-reconfigure -plow unattended-upgrades
}

# Main deployment function
main() {
    log "Starting deployment of $APP_NAME..."
    
    check_root
    update_system
    setup_firewall
    install_nodejs
    create_app_user
    install_nginx
    deploy_application
    setup_pm2
    setup_log_rotation
    setup_monitoring
    setup_backups
    install_security_tools
    install_ssl
    setup_custom_domains
    
    log ""
    log "=================================================="
    log "  Deployment Completed Successfully!"
    log "=================================================="
    log ""
    log "📋 NEXT STEPS:"
    log ""
    log "1. Setup Supabase Database"
    log "   Run migrations in Supabase SQL Editor in this order:"
    log "   a) supabase/migrations/20251001063749_20250929231345_bitter_cake.sql"
    log "   b) supabase/migrations/20251001063812_20250930111734_violet_valley.sql"
    log "   c) supabase/migrations/20251001063830_20250930115029_restless_fog.sql"
    log "   d) supabase_migration_events_table.sql"
    log "   e) supabase_migration_mailing_lists.sql"
    log "   f) supabase_migration_event_registrations_committees.sql"
    log "   g) supabase_migration_phase3_advanced_features.sql"
    log "   h) supabase_migration_phase1_quick_wins.sql"
    log ""
    log "2. Configure DNS"
    log "   Point A records to this server:"
    log "   - $DOMAIN → $(curl -s ifconfig.me)"
    log "   - *.$DOMAIN → $(curl -s ifconfig.me) (wildcard for subdomains)"
    log ""
    log "3. Access Your Application"
    log "   - Main site: https://$DOMAIN"
    log "   - Super Admin: https://admin.$DOMAIN"
    log "   - Organization: https://orgslug.$DOMAIN"
    log "   - Or use: https://$DOMAIN?org=orgslug"
    log ""
    log "📁 IMPORTANT FILES:"
    log "   - App directory: $APP_DIR"
    log "   - Environment: $APP_DIR/.env (✅ configured during deployment)"
    log "   - Nginx config: /etc/nginx/sites-available/$APP_NAME"
    log "   - PM2 config: $APP_DIR/ecosystem.config.cjs"
    log "   - Logs: /var/log/$APP_NAME/"
    log ""
    log "🔧 USEFUL COMMANDS:"
    log "   - Restart app: sudo -u $APP_USER pm2 restart $APP_NAME"
    log "   - View logs: sudo -u $APP_USER pm2 logs $APP_NAME"
    log "   - App status: sudo -u $APP_USER pm2 status"
    log "   - Reload Nginx: sudo systemctl reload nginx"
    log "   - Check SSL: sudo certbot certificates"
    log "   - Renew SSL: sudo certbot renew --dry-run"
    log ""
    log "🌐 CUSTOM DOMAINS (Optional):"
    log "   Organizations can use their own domains (e.g., frps.org.uk)"
    log "   - Add via: Dashboard → Settings → Custom Domains"
    log "   - Manage: sudo manage-custom-domain [add|remove|ssl|list] <domain>"
    log "   - Docs: /opt/custom-domains/CUSTOM_DOMAINS_SETUP.md"
    log ""
    log "✅ Deployment complete! Your application is configured and ready to use."
    log ""
    log "⚠️  IMPORTANT: Run the Supabase migrations before accessing the application!"
    log ""
}

# Run main function
main "$@"
