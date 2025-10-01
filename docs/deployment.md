# Deployment Guide

This guide covers the complete deployment process for the multi-tenant membership management system on Ubuntu/Debian servers.

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ server
- Domain name configured (e.g., member.ringing.org.uk)
- Supabase project set up and configured
- SSH access to server

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
sudo npm install -g pm2@latest
```

### 3. Install and Configure Nginx

```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Test Nginx
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
# Create directory
sudo mkdir -p /var/www
cd /var/www

# Clone repository
sudo git clone <your-repository-url> membership-system
cd membership-system

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 2. Environment Configuration

Edit `/var/www/membership-system/.env`:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Build Application

```bash
# Build the application
npm run build

# Verify build output
ls -la dist/
```

### 4. PM2 Configuration

The project includes `ecosystem.config.cjs` for PM2. Review and adjust if needed:

```javascript
module.exports = {
  apps: [{
    name: 'membership-system',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 5. Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.cjs

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
server {
    listen 80;
    server_name member.ringing.org.uk *.member.ringing.org.uk;

    root /var/www/membership-system/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main location
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security - deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
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
# Get certificate for main domain and wildcard subdomain
sudo certbot --nginx -d member.ringing.org.uk -d *.member.ringing.org.uk

# Follow the prompts
# Choose option 2: Redirect HTTP to HTTPS
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

### 1. PM2 Monitoring

```bash
# View logs
pm2 logs membership-system

# Monitor resources
pm2 monit

# View application info
pm2 info membership-system

# View all processes
pm2 list
```

### 2. Nginx Logs

```bash
# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### 3. System Monitoring

```bash
# Install htop
sudo apt install htop -y

# Monitor system resources
htop

# Check disk space
df -h

# Check memory usage
free -h
```

## Updates and Maintenance

### Updating Application

```bash
# Navigate to app directory
cd /var/www/membership-system

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Restart PM2
pm2 restart membership-system

# Check status
pm2 logs membership-system
```

### Database Migrations

```bash
# Run new migrations in Supabase SQL Editor
# Migrations are in: supabase/migrations/
```

## Backup Strategy

### 1. Application Backup

```bash
# Create backup directory
sudo mkdir -p /var/backups/membership-system

# Backup application files
sudo tar -czf /var/backups/membership-system/app_$(date +%Y%m%d).tar.gz \
    -C /var/www membership-system \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git

# Keep only last 7 days
find /var/backups/membership-system -name "app_*.tar.gz" -mtime +7 -delete
```

### 2. Database Backup

Supabase handles automatic backups. You can also:
- Download manual backups from Supabase dashboard
- Use Supabase CLI for programmatic backups

## Security Hardening

### 1. Firewall

```bash
# Check UFW status
sudo ufw status verbose

# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### 2. Fail2Ban (Optional)

```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Start service
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 3. Automatic Updates

```bash
# Enable unattended upgrades
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs membership-system --lines 100

# Check Node.js version
node --version

# Verify environment variables
cat .env

# Check build output
ls -la dist/
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Problems

```bash
# Check certificates
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check Nginx config for SSL
sudo nginx -t
```

### Cannot Access Application

1. Check DNS records are correct
2. Verify firewall allows ports 80/443
3. Check Nginx is running: `sudo systemctl status nginx`
4. Check PM2 app status: `pm2 status`
5. Review Nginx error logs
6. Verify SSL certificates are valid

## Performance Optimization

### 1. Enable Nginx Caching (Optional)

```nginx
# Add to nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=static_cache:10m max_size=1g inactive=60m use_temp_path=off;
```

### 2. PM2 Cluster Mode

Already configured in `ecosystem.config.cjs` for optimal performance.

### 3. Database Connection Pooling

Handled automatically by Supabase client.

## Health Checks

Create a simple health check endpoint:

```bash
# Test application
curl http://localhost:3000

# Test through Nginx
curl https://member.ringing.org.uk
```

## Support and Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)
- [Nginx Documentation](https://nginx.org/en/docs)
- Project README: `/var/www/membership-system/README.md`

## Next Steps

After deployment:
1. Test authentication flow
2. Create test organizations
3. Verify RLS policies
4. Set up monitoring alerts
5. Document custom configurations
6. Create backup schedule
