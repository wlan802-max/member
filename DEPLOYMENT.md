# Deployment and Update Guide

## Quick Update Commands

### Option 1: Using the Update Script (Recommended)

```bash
# Copy the update script to your server
scp update-app.sh user@your-server:/home/user/

# On your server, make it executable and run
chmod +x update-app.sh
./update-app.sh

# Other useful commands:
./update-app.sh status    # Check application status
./update-app.sh logs      # View recent logs
./update-app.sh rollback  # Rollback to previous version
./update-app.sh restart   # Restart the application
```

### Option 2: File-Based Updates

When you need to update specific files without Git:

```bash
# From your local development machine, copy files to server
scp -r src/ user@your-server:/tmp/membership-update/
scp update-files.sh user@your-server:/home/user/

# On your server
chmod +x update-files.sh
cd /tmp/membership-update
/home/user/update-files.sh
```

### Option 3: Manual Update Process

```bash
# 1. Create backup
sudo tar -czf /var/backups/membership-system/backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    --exclude=node_modules --exclude=dist -C /var/www membership-system

# 2. Copy your updated files to /var/www/membership-system/
# Make sure to preserve the .env file!

# 3. Set correct ownership
sudo chown -R membership:membership /var/www/membership-system

# 4. Build and restart
cd /var/www/membership-system
sudo -u membership npm ci
sudo -u membership npm run build
sudo -u membership npm prune --omit=dev
sudo -u membership pm2 restart membership-system --update-env

# 5. Check status
sudo -u membership pm2 status
sudo -u membership pm2 logs membership-system --lines 20
curl -I https://member.ringing.org.uk/health
```

## Git-Based Deployment (Recommended for Production)

### Initial Setup

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. On your server, initialize Git:

```bash
cd /var/www/membership-system
sudo -u membership git init
sudo -u membership git remote add origin https://github.com/your-username/membership-system.git
sudo -u membership git pull origin main
```

3. Update the `update-app.sh` script with your repository URL

### Using Git Updates

```bash
# Update the GIT_REPO variable in update-app.sh
sed -i 's|GIT_REPO=".*"|GIT_REPO="https://github.com/your-username/membership-system.git"|' update-app.sh

# Run updates
./update-app.sh
```

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 status
sudo -u membership pm2 status

# View detailed logs
sudo -u membership pm2 logs membership-system

# Check for build errors
cd /var/www/membership-system
sudo -u membership npm run build

# Restart PM2
sudo -u membership pm2 restart membership-system
```

### SSL Issues

```bash
# Check certificate status
sudo certbot certificates

# Test SSL
curl -I https://member.ringing.org.uk/health
curl -I https://admin.member.ringing.org.uk/health

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### Database Connection Issues

```bash
# Check environment variables
cd /var/www/membership-system
grep SUPABASE .env

# Test database connection (if you have a test script)
sudo -u membership node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
client.from('organizations').select('count').then(console.log).catch(console.error);
"
```

### Rollback Process

```bash
# Using the update script
./update-app.sh rollback

# Manual rollback
sudo tar -xzf /var/backups/membership-system/backup_YYYYMMDD_HHMMSS.tar.gz -C /var/www/
sudo chown -R membership:membership /var/www/membership-system
sudo -u membership pm2 restart membership-system
```

## Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:5173/health

# HTTPS health
curl https://member.ringing.org.uk/health

# PM2 monitoring
sudo -u membership pm2 monit
```

### Log Monitoring

```bash
# Real-time logs
sudo -u membership pm2 logs membership-system --follow

# Error logs only
sudo -u membership pm2 logs membership-system --err

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Maintenance

### Regular Tasks

```bash
# Weekly: Update system packages
sudo apt update && sudo apt upgrade

# Monthly: Clean up old backups
find /var/backups/membership-system -name "*.tar.gz" -mtime +30 -delete

# Check disk space
df -h

# Check SSL certificate expiry
sudo certbot certificates
```

### Performance Monitoring

```bash
# Check memory usage
free -h

# Check CPU usage
top

# Check application performance
sudo -u membership pm2 monit

# Check database performance (if accessible)
# Monitor slow queries in Supabase dashboard
```