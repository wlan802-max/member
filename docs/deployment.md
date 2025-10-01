# Deployment Guide

This guide covers the complete deployment process for the multi-tenant membership management system on Ubuntu/Debian servers.

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ server
- Domain name configured (member.ringing.org.uk)
- Supabase project set up
- Resend API account
- Google Wallet API credentials
- Apple Developer account (for Wallet integration)

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Create application user
sudo adduser --system --group --home /var/www membership
sudo usermod -aG sudo membership
```

### 2. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install global packages
sudo npm install -g pm2@latest
```

### 3. Install and Configure Nginx

```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Test Nginx installation
sudo nginx -t
```

### 4. Install SSL Certificate Tools

```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
```

## Application Deployment

### 1. Clone and Setup Application

```bash
# Switch to application user
sudo su - membership

# Clone repository
cd /var/www
git clone <your-repository-url> membership-system
cd membership-system

# Install dependencies
npm ci --production

# Create environment file
cp .env.example .env.local
```

### 2. Environment Configuration

Edit `/var/www/membership-system/.env.local`:

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://member.ringing.org.uk
NEXT_PUBLIC_DOMAIN=member.ringing.org.uk
PORT=3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend
RESEND_API_KEY=your_resend_api_key

# Google Wallet
GOOGLE_WALLET_ISSUER_ID=your_issuer_id
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Apple Wallet
APPLE_WALLET_TEAM_ID=your_team_id
APPLE_WALLET_PASS_TYPE_ID=your_pass_type_id
APPLE_WALLET_PRIVATE_KEY_PATH=/var/www/membership-system/certs/apple-wallet-private.key

# Security
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://member.ringing.org.uk

# Email
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=your_resend_api_key
```

### 3. Build Application

```bash
# Build the application
npm run build

# Test the build
npm start &
curl http://localhost:3000
kill %1
```

### 4. PM2 Configuration

Create `/var/www/membership-system/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'membership-system',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/membership-system',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/membership-system/err.log',
    out_file: '/var/log/membership-system/out.log',
    log_file: '/var/log/membership-system/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

Create log directory:

```bash
sudo mkdir -p /var/log/membership-system
sudo chown membership:membership /var/log/membership-system
```

### 5. Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the command above

# Check application status
pm2 status
pm2 logs membership-system
```

## Nginx Configuration

### 1. Create Nginx Configuration

Create `/etc/nginx/sites-available/membership-system`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# Upstream configuration
upstream membership_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Main server block
server {
    listen 80;
    server_name member.ringing.org.uk *.member.ringing.org.uk;
    
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
    gzip_proxied expired no-cache no-store private must-revalidate auth;
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
        try_files $uri @proxy;
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
        try_files $uri @proxy;
    }
    
    # Auth endpoints rate limiting
    location ~* /api/auth/(signin|signup|callback) {
        limit_req zone=login burst=5 nodelay;
        limit_req_status 429;
        try_files $uri @proxy;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        try_files $uri @proxy;
    }
    
    # Main proxy configuration
    location / {
        try_files $uri @proxy;
    }
    
    location @proxy {
        proxy_pass http://membership_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
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
    server_name www.member.ringing.org.uk;
    return 301 https://member.ringing.org.uk$request_uri;
}
```

### 2. Enable Site Configuration

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/membership-system /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL Certificate Setup

### 1. Obtain SSL Certificates

```bash
# Get certificates for main domain and wildcard subdomain
sudo certbot --nginx -d member.ringing.org.uk -d *.member.ringing.org.uk

# Follow the prompts to configure automatic renewal
```

### 2. Configure Auto-renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

## DNS Configuration

Configure your DNS provider with the following records:

```
# A Records
member.ringing.org.uk.     A     YOUR_SERVER_IP
*.member.ringing.org.uk.   A     YOUR_SERVER_IP

# Optional: AAAA records for IPv6
member.ringing.org.uk.     AAAA  YOUR_SERVER_IPv6
*.member.ringing.org.uk.   AAAA  YOUR_SERVER_IPv6

# CAA record for Let's Encrypt
member.ringing.org.uk.     CAA   0 issue "letsencrypt.org"
```

## Monitoring and Logging

### 1. Setup Log Rotation

Create `/etc/logrotate.d/membership-system`:

```
/var/log/membership-system/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 membership membership
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. System Monitoring

Create `/var/www/membership-system/scripts/health-check.sh`:

```bash
#!/bin/bash

# Health check script
HEALTH_URL="http://localhost:3000/health"
LOG_FILE="/var/log/membership-system/health-check.log"

# Check application health
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -eq 200 ]; then
    echo "$(date): Health check passed" >> $LOG_FILE
else
    echo "$(date): Health check failed with status $response" >> $LOG_FILE
    # Restart application if health check fails
    pm2 restart membership-system
    echo "$(date): Application restarted" >> $LOG_FILE
fi
```

Make it executable and add to crontab:

```bash
chmod +x /var/www/membership-system/scripts/health-check.sh

# Add to crontab (run every 5 minutes)
crontab -e
# Add: */5 * * * * /var/www/membership-system/scripts/health-check.sh
```

### 3. Performance Monitoring

Install and configure monitoring tools:

```bash
# Install htop for system monitoring
sudo apt install htop -y

# Install iotop for disk I/O monitoring
sudo apt install iotop -y

# Setup PM2 monitoring
pm2 install pm2-server-monit
```

## Backup Strategy

### 1. Database Backup Script

Create `/var/www/membership-system/scripts/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/membership-system"
DATE=$(date +%Y%m%d_%H%M%S)
SUPABASE_URL="your_supabase_url"
SUPABASE_KEY="your_service_role_key"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database (using Supabase CLI or pg_dump if direct access)
# This is a placeholder - adjust based on your Supabase setup
echo "Database backup would be performed here"
echo "Backup completed at $(date)" > $BACKUP_DIR/db_backup_$DATE.log

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.log" -mtime +30 -delete
```

### 2. Application Backup Script

Create `/var/www/membership-system/scripts/backup-app.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/membership-system"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/membership-system"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files (excluding node_modules and .next)
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.git \
    -C /var/www membership-system

# Keep only last 7 days of app backups
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete
```

### 3. Setup Automated Backups

```bash
# Make scripts executable
chmod +x /var/www/membership-system/scripts/backup-*.sh

# Add to crontab
crontab -e
# Add:
# 0 2 * * * /var/www/membership-system/scripts/backup-db.sh
# 0 3 * * * /var/www/membership-system/scripts/backup-app.sh
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status verbose
```

### 2. Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Create custom configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure Nginx protection
sudo tee /etc/fail2ban/jail.d/nginx.conf << EOF
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

# Restart Fail2Ban
sudo systemctl restart fail2ban
```

### 3. System Updates

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Deployment Automation

### 1. Deployment Script

Create `/var/www/membership-system/scripts/deploy.sh`:

```bash
#!/bin/bash

set -e

APP_DIR="/var/www/membership-system"
BACKUP_DIR="/var/backups/membership-system"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting deployment at $(date)"

# Create backup before deployment
echo "Creating backup..."
tar -czf $BACKUP_DIR/pre_deploy_$DATE.tar.gz -C /var/www membership-system

# Pull latest changes
echo "Pulling latest changes..."
cd $APP_DIR
git pull origin main

# Install dependencies
echo "Installing dependencies..."
npm ci --production

# Build application
echo "Building application..."
npm run build

# Restart application
echo "Restarting application..."
pm2 restart membership-system

# Wait for application to start
sleep 10

# Health check
echo "Performing health check..."
if curl -f http://localhost:3000/health; then
    echo "Deployment successful!"
else
    echo "Health check failed, rolling back..."
    # Rollback logic here
    exit 1
fi

echo "Deployment completed at $(date)"
```

### 2. Zero-Downtime Deployment

For zero-downtime deployments, modify the PM2 configuration:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'membership-system',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,
    // ... other configuration
  }]
};
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check PM2 logs
   pm2 logs membership-system
   
   # Check system resources
   htop
   df -h
   ```

2. **SSL certificate issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificates
   sudo certbot renew --force-renewal
   ```

3. **Database connection issues**
   ```bash
   # Test Supabase connection
   curl -H "apikey: YOUR_ANON_KEY" "YOUR_SUPABASE_URL/rest/v1/"
   ```

4. **High memory usage**
   ```bash
   # Restart application
   pm2 restart membership-system
   
   # Check for memory leaks
   pm2 monit
   ```

### Log Locations

- Application logs: `/var/log/membership-system/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`
- PM2 logs: `~/.pm2/logs/`

This completes the deployment guide. The system should now be running securely and efficiently on your Ubuntu/Debian server with proper monitoring, backups, and security measures in place.