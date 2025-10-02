# Custom Domains Setup Guide

This guide explains how to configure custom domains for organizations in your membership management system.

## Overview

Organizations can use their own custom domains (e.g., `frps.org.uk`, `example.org`) instead of the default subdomain system (`org.member.ringing.org.uk`). This provides a more branded experience for members.

## Architecture

- **Tenant Detection**: The system checks if the current hostname is a verified custom domain before checking for subdomains
- **Database**: Custom domains are stored in the `organization_domains` table with verification status and SSL status
- **Nginx**: Each custom domain gets its own Nginx server block configuration
- **SSL**: Automatic HTTPS via Let's Encrypt (Certbot)

## Prerequisites

1. Server deployed with Nginx and the main application running
2. Custom domain DNS configured to point to your server
3. Ports 80 and 443 open in firewall
4. Certbot installed (automatically installed by `manage-custom-domain.sh`)

## Quick Start

### 1. Admin Adds Domain via UI

1. Login as organization admin
2. Navigate to **Dashboard → Settings → Custom Domains**
3. Click "Add Domain"
4. Enter domain name (e.g., `example.com`)
5. Copy the DNS verification token

### 2. Configure DNS Records

Add these DNS records for your domain:

#### A Record (Required)
```
Type: A
Name: @ (or your domain)
Value: [Your Server IP]
TTL: 3600
```

#### TXT Record (Required for Verification)
```
Type: TXT
Name: _verification.example.com
Value: [Token from step 1]
TTL: 3600
```

### 3. Verify Domain

1. Wait for DNS propagation (usually 5-10 minutes)
2. Click "Verify" button in the admin UI
3. System checks for TXT record and marks domain as verified

### 4. Generate Nginx Configuration

Run the management script on your server:

```bash
sudo manage-custom-domain add example.com
```

**Note**: After deployment, you can use the `manage-custom-domain` command from anywhere on your server.

This will:
- Create HTTP-only Nginx configuration from template
- Enable the site
- Test and reload Nginx
- Site will be accessible at `http://example.com`

### 5. Generate SSL Certificate

**Important**: Wait until DNS propagation is complete and domain verification succeeds before generating SSL.

```bash
sudo manage-custom-domain ssl example.com
```

This will:
- Request SSL certificate from Let's Encrypt using ACME HTTP-01 challenge
- Certbot automatically updates Nginx configuration to add HTTPS server block
- Configures automatic HTTP to HTTPS redirect
- Reloads Nginx with SSL enabled
- Site will be accessible at `https://example.com` with automatic redirect from HTTP

### 6. Test the Domain

Visit `https://example.com` - you should see your organization's login page!

## Management Scripts

### Add Custom Domain
```bash
sudo manage-custom-domain add example.com
```

### Generate SSL Certificate
```bash
sudo manage-custom-domain ssl example.com
```

### Remove Custom Domain
```bash
sudo manage-custom-domain remove example.com
```

### List All Custom Domains
```bash
sudo manage-custom-domain list
```

## Files

After running `deploy.sh`, the following files are deployed to your server:

### Template File
- **Deployed to**: `/opt/custom-domains/nginx-custom-domain-template.conf`
- **Purpose**: Template for generating custom domain Nginx configurations
- **Variables**: `{{DOMAIN}}` is replaced with actual domain name

### Management Script
- **Deployed to**: `/opt/custom-domains/manage-custom-domain.sh`
- **Symlink**: `/usr/local/bin/manage-custom-domain` (for easy access from anywhere)
- **Purpose**: Automate adding/removing custom domains and SSL certificates
- **Requirements**: Must run with sudo
- **Usage**: `sudo manage-custom-domain [add|remove|ssl|list] <domain>`

### Documentation
- **Deployed to**: `/opt/custom-domains/CUSTOM_DOMAINS_SETUP.md`
- **Purpose**: This setup guide

### Nginx Configurations
- **Location**: `/etc/nginx/sites-available/membership-system-<domain>`
- **Enabled**: `/etc/nginx/sites-enabled/membership-system-<domain>`

### SSL Certificates
- **Location**: `/etc/letsencrypt/live/<domain>/`
- **Renewal**: Automatic via Certbot systemd timer

## Troubleshooting

### Domain verification fails

**Problem**: DNS TXT record not found

**Solution**:
1. Check DNS propagation: `dig _verification.example.com TXT`
2. Wait longer (DNS can take up to 48 hours)
3. Verify you added the exact token from the UI

### SSL generation fails

**Problem**: Certbot cannot verify domain ownership

**Solution**:
1. Ensure DNS A record points to server: `dig example.com`
2. Check ports 80/443 are open: `sudo ufw status`
3. Verify Nginx is running: `sudo systemctl status nginx`
4. Check domain is accessible: `curl http://example.com`

### 502 Bad Gateway error

**Problem**: Nginx cannot reach application

**Solution**:
1. Check application is running: `sudo -u membership pm2 status`
2. Verify port 5000 is listening: `netstat -tlnp | grep 5000`
3. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### Domain shows wrong organization

**Problem**: Tenant detection not working

**Solution**:
1. Check domain is verified in database
2. Clear browser cache
3. Check browser console for errors
4. Verify `organization_domains` table has correct `organization_id`

## Security Considerations

### Domain Verification
- Only verified domains are used for tenant detection
- Verification uses DNS TXT records (ACME standard)
- Verification token is unique per domain

### SSL Certificates
- Automatic HTTPS redirect for all custom domains
- TLS 1.2+ only
- Strong cipher suites
- HSTS enabled (HTTP Strict Transport Security)

### Rate Limiting
- API endpoints: 10 requests/second per IP
- Auth endpoints: 5 requests/minute per IP
- Automatic ban via Fail2Ban for abuse

## Automation Opportunities

### Auto-SSL Generation
The backend API endpoint `/api/domains/ssl/generate` can automate SSL certificate generation. However, it currently uses `execFile` which requires:

1. Backend process running as root (not recommended)
2. OR sudoers configuration for specific Certbot commands
3. OR separate service handling SSL generation

**Recommended approach**: Keep SSL generation manual via `manage-custom-domain.sh` or implement a separate privileged service.

### Nginx Auto-Configuration
Consider creating a cron job or systemd service that:
1. Watches `organization_domains` table for verified domains
2. Auto-generates Nginx configurations
3. Reloads Nginx automatically

## Production Checklist

- [ ] DNS A record configured
- [ ] DNS TXT record configured
- [ ] Domain verified in admin UI
- [ ] Nginx configuration added
- [ ] SSL certificate generated
- [ ] HTTPS redirect working
- [ ] Application accessible via custom domain
- [ ] SSL auto-renewal enabled (Certbot timer)
- [ ] Monitoring configured for domain
- [ ] Backup SSL certificates regularly

## Support

For issues with:
- **Domain verification**: Check DNS records
- **SSL certificates**: Check Certbot logs (`/var/log/letsencrypt/`)
- **Nginx errors**: Check error logs (`/var/log/nginx/error.log`)
- **Application errors**: Check PM2 logs (`sudo -u membership pm2 logs`)

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [DNS TXT Record Standard](https://tools.ietf.org/html/rfc1035)
