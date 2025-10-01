#!/bin/bash

# Production Deployment Script for Multi-Tenant Membership Management System
# Ubuntu/Debian Server - Port 5173 - member.ringing.org.uk

set -e

# Configuration
APP_NAME="membership-system"
APP_DIR="/var/www/$APP_NAME"
APP_USER="membership"
DOMAIN="member.ringing.org.uk"
PORT="5173"
NODE_VERSION="18"

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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
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
    
    # Get certificate for main domain first
    log "Requesting SSL certificate for $DOMAIN"
    
    # Try to get certificate automatically
    if sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect; then
        log "SSL certificate installed successfully for $DOMAIN"
    else
        warn "Automatic SSL certificate installation failed."
        log "You can install it manually later with: sudo certbot --nginx -d $DOMAIN"
    fi
    
    # For wildcard certificates (subdomains), you'll need DNS validation
    log "For subdomain support (admin.$DOMAIN, org1.$DOMAIN, etc.), you'll need to:"
    log "1. Get a wildcard certificate using DNS validation:"
    log "   sudo certbot certonly --manual --preferred-challenges dns -d $DOMAIN -d *.$DOMAIN"
    log "2. Update the Nginx configuration to use the wildcard certificate"
    
    # Setup auto-renewal
    sudo systemctl enable certbot.timer
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
    
    # Switch to app user and directory
    cd $APP_DIR
    
    # Create environment file
    if [ ! -f ".env" ]; then
        log "Creating environment file..."
        sudo -u $APP_USER tee .env > /dev/null <<EOF
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://$DOMAIN
NEXT_PUBLIC_DOMAIN=$DOMAIN
PORT=$PORT

# Supabase Configuration (REPLACE WITH YOUR VALUES)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Configuration (REPLACE WITH YOUR VALUES)
RESEND_API_KEY=re_your_resend_api_key

# Security
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://$DOMAIN

# Cron Secret
CRON_SECRET=$(openssl rand -base64 32)
EOF
        warn "IMPORTANT: Please edit $APP_DIR/.env with your actual Supabase configuration values!"
        warn "The application will not work until you set the correct NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    sudo -u $APP_USER npm ci
    
    # Install production server dependencies
    sudo -u $APP_USER npm install express --save
    
    # Build application
    log "Building application..."
    sudo -u $APP_USER npm run build
    
    # Clean up dev dependencies after build
    log "Cleaning up dev dependencies..."
    sudo -u $APP_USER npm prune --omit=dev
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
    cd $APP_DIR
    sudo -u $APP_USER pm2 start ecosystem.config.cjs
    sudo -u $APP_USER pm2 save
    
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
    
    log "Deployment completed successfully!"
    log ""
    log "Next steps:"
    log "1. Edit $APP_DIR/.env with your Supabase and other service credentials"
    log "2. Restart the application: sudo -u $APP_USER pm2 restart $APP_NAME"
    log "3. Check application status: sudo -u $APP_USER pm2 status"
    log "4. View logs: sudo -u $APP_USER pm2 logs $APP_NAME"
    log "5. Configure DNS to point $DOMAIN and *.$DOMAIN to this server"
    log "6. Access your application at: https://$DOMAIN"
    log "7. Access super admin portal at: https://admin.$DOMAIN"
    log ""
    log "Important files:"
    log "- Application: $APP_DIR"
    log "- Environment: $APP_DIR/.env"
    log "- Nginx config: /etc/nginx/sites-available/$APP_NAME"
    log "- PM2 config: $APP_DIR/ecosystem.config.js"
    log "- Logs: /var/log/$APP_NAME/"
    log ""
    log "Useful commands:"
    log "- Restart app: sudo -u $APP_USER pm2 restart $APP_NAME"
    log "- View logs: sudo -u $APP_USER pm2 logs $APP_NAME"
    log "- Reload Nginx: sudo systemctl reload nginx"
    log "- Check SSL: sudo certbot certificates"
}

# Run main function
main "$@"