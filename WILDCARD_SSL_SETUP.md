# Wildcard SSL Certificate Setup & Troubleshooting Guide

This guide helps you set up and troubleshoot wildcard SSL certificates for the multi-tenant membership management system.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Common Errors & Solutions](#common-errors--solutions)
- [Manual Setup](#manual-setup)
- [Renewal & Automation](#renewal--automation)
- [Verification Commands](#verification-commands)

## Overview

### Why Wildcard Certificates?

For a multi-tenant system with subdomains like:
- `admin.yourdomain.com`
- `org1.yourdomain.com`
- `org2.yourdomain.com`

A **wildcard certificate** (`*.yourdomain.com`) covers all subdomains with a single certificate.

### Important Facts

1. **DNS-01 Challenge Required**: Wildcard certificates MUST use DNS validation (HTTP-01 doesn't work)
2. **Two Domains Needed**: Request both `*.yourdomain.com` AND `yourdomain.com` (wildcard doesn't cover base domain)
3. **Manual Intervention**: Using `--manual` flag requires human intervention for renewals every 90 days
4. **DNS Propagation Time**: Wait 5-15 minutes after adding TXT records before continuing

## Prerequisites

- Domain name with DNS management access
- Server with public IP address
- Ports 80 and 443 open in firewall
- Certbot installed (`sudo apt install certbot python3-certbot-nginx -y`)

## Quick Start

### Option 1: Using deploy.sh (Recommended)

The `deploy.sh` script handles wildcard SSL setup automatically:

```bash
# During deployment, choose option 1 when prompted
./deploy.sh

# Choose SSL certificate type:
# 1) Wildcard certificate (*.yourdomain.com + yourdomain.com) - RECOMMENDED
# Enter: 1
```

The script will:
1. Prompt you for DNS TXT record
2. Wait for you to add the record
3. Verify DNS propagation
4. Install certificate
5. Update Nginx configuration

### Option 2: Manual Setup

```bash
# Request wildcard certificate
sudo certbot certonly --manual --preferred-challenges dns \
  -d yourdomain.com -d "*.yourdomain.com" \
  --agree-tos --email admin@yourdomain.com \
  --manual-public-ip-logging-ok
```

**Follow the prompts**:
1. Certbot will show a TXT record value
2. Add this record to your DNS as `_acme-challenge.yourdomain.com`
3. Wait 5-10 minutes
4. Verify with: `dig _acme-challenge.yourdomain.com TXT`
5. Press Enter in Certbot to continue

## Common Errors & Solutions

### Error 1: "Let's Encrypt doesn't support issuing Wildcard-Certificates via HTTP-Challenge"

**Problem**: Trying to use HTTP-01 challenge or `--nginx` plugin

**Solution**: Use DNS-01 challenge with `--manual` flag:
```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d yourdomain.com -d "*.yourdomain.com"
```

### Error 2: "No TXT record found at _acme-challenge.yourdomain.com"

**Problem**: DNS record not added or not propagated

**Solution**:
```bash
# 1. Verify you added the TXT record
dig _acme-challenge.yourdomain.com TXT

# 2. Check with Google DNS (no cache)
dig @8.8.8.8 _acme-challenge.yourdomain.com TXT

# 3. Use online checker
# Visit: https://dns.google.com/resolve?name=_acme-challenge.yourdomain.com&type=TXT

# 4. Wait longer (up to 15 minutes) and try again
```

**Common mistakes**:
- Used wrong record type (CNAME instead of TXT)
- Added extra quotes around the value
- Old TXT records still present from previous attempts (delete them first)
- DNS provider has caching issues (wait longer)

### Error 3: "Incorrect TXT record found" or "Type: unauthorized"

**Problem**: Old TXT records interfering or wrong value

**Solution**:
```bash
# 1. Delete ALL existing _acme-challenge TXT records in your DNS
# 2. Add only the NEW value from current Certbot run
# 3. Wait for propagation
# 4. Verify the exact value matches:
dig _acme-challenge.yourdomain.com TXT +short
```

### Error 4: "Some challenges have failed"

**Problem**: DNS propagation incomplete or wrong domain format

**Solution**:
```bash
# Check DNS propagation across multiple servers
dig _acme-challenge.yourdomain.com TXT @8.8.8.8
dig _acme-challenge.yourdomain.com TXT @1.1.1.1
dig _acme-challenge.yourdomain.com TXT

# All should return the same TXT record value
# If different, wait longer for propagation
```

### Error 5: Certificate obtained but Nginx shows errors

**Problem**: Nginx configuration not updated correctly

**Solution**:
```bash
# 1. Check certificate exists
sudo ls -la /etc/letsencrypt/live/yourdomain.com/

# 2. Manually update Nginx configuration
sudo nano /etc/nginx/sites-available/membership-system

# Add to server block:
# listen 443 ssl http2;
# listen [::]:443 ssl http2;
# ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
# ssl_protocols TLSv1.2 TLSv1.3;
# ssl_ciphers HIGH:!aNULL:!MD5;

# 3. Test configuration
sudo nginx -t

# 4. Reload Nginx
sudo systemctl reload nginx
```

### Error 6: "NET::ERR_CERT_COMMON_NAME_INVALID" in browser

**Problem**: Certificate doesn't match subdomain OR wrong certificate loaded

**Solution**:
```bash
# 1. Verify certificate covers wildcard
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout | grep -A2 "Subject Alternative Name"

# Should show: DNS:yourdomain.com, DNS:*.yourdomain.com

# 2. Check Nginx is loading correct certificate
sudo nginx -T | grep ssl_certificate

# 3. Ensure server_name matches
sudo nginx -T | grep server_name

# Should include: server_name yourdomain.com *.yourdomain.com;
```

### Error 7: "Certificates obtained with --manual cannot be renewed automatically"

**Problem**: Manual method requires intervention every 90 days

**Solutions**:

**Option A**: Use DNS provider plugin (if supported)
```bash
# Cloudflare example
sudo apt install python3-certbot-dns-cloudflare
echo "dns_cloudflare_api_token = YOUR_TOKEN" > ~/.secrets/cloudflare.ini
chmod 600 ~/.secrets/cloudflare.ini

sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d yourdomain.com -d "*.yourdomain.com"
```

**Option B**: Set up renewal reminder
```bash
# Add to crontab (60 days before expiry)
0 0 * * 0 [ $(sudo certbot certificates | grep "VALID" | grep -o "[0-9]* days" | grep -o "[0-9]*") -lt 30 ] && echo "SSL cert expires soon! Renew manually." | mail -s "SSL Renewal Needed" admin@yourdomain.com
```

**Option C**: Accept manual renewal (simple but requires intervention)
- Mark calendar for every 80 days
- Re-run the certbot command
- Add new TXT record when prompted

## Manual Setup (Step-by-Step)

### Step 1: Prepare DNS Access

Ensure you can add TXT records to your DNS. You'll need this during the process.

### Step 2: Start Certificate Request

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d yourdomain.com -d "*.yourdomain.com" \
  --agree-tos --email admin@yourdomain.com \
  --manual-public-ip-logging-ok
```

### Step 3: Add DNS TXT Record

Certbot will display something like:
```
Please deploy a DNS TXT record under the name:
_acme-challenge.yourdomain.com

with the following value:
abc123def456ghi789jkl012mno345pqr

Before continuing, verify the record is deployed.
```

**Action**:
1. Go to your DNS provider
2. Add a TXT record:
   - **Name**: `_acme-challenge` (or `_acme-challenge.yourdomain.com` depending on provider)
   - **Type**: `TXT`
   - **Value**: `abc123def456ghi789jkl012mno345pqr` (exact value from Certbot)
   - **TTL**: 300 (5 minutes) or minimum allowed

### Step 4: Wait for DNS Propagation

**Critical**: Don't press Enter in Certbot yet!

```bash
# Wait 5-10 minutes, then verify:
dig _acme-challenge.yourdomain.com TXT +short

# Should return: "abc123def456ghi789jkl012mno345pqr"

# Check with external DNS servers too:
dig @8.8.8.8 _acme-challenge.yourdomain.com TXT +short
dig @1.1.1.1 _acme-challenge.yourdomain.com TXT +short
```

### Step 5: Complete Verification

Once DNS is propagated (all `dig` commands return the correct value):
- Press Enter in Certbot
- Certbot will verify and issue certificate

### Step 6: Update Nginx Configuration

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/membership-system

# Update server block to include:
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com *.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of config
}

# Add HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com *.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

### Step 7: Test and Reload

```bash
# Test configuration
sudo nginx -t

# If OK, reload
sudo systemctl reload nginx

# Verify HTTPS works
curl -I https://yourdomain.com
curl -I https://admin.yourdomain.com
```

## Renewal & Automation

### Check Certificate Expiry

```bash
# View all certificates
sudo certbot certificates

# Check specific certificate expiry
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -noout -enddate
```

### Manual Renewal Process

Since wildcard certificates use `--manual`, they require manual renewal:

```bash
# 1. Start renewal (same command as initial setup)
sudo certbot certonly --manual --preferred-challenges dns \
  -d yourdomain.com -d "*.yourdomain.com" \
  --force-renewal

# 2. Add new TXT record when prompted
# 3. Verify DNS propagation
# 4. Complete verification
# 5. Nginx will automatically use new certificate (no reload needed if using same paths)
```

### Test Renewal (Dry Run)

```bash
# This won't actually renew, but checks the process
sudo certbot renew --dry-run
```

**Note**: This will fail for manual certificates with a warning. This is expected.

### Automated Renewal with DNS Plugin

If you want automatic renewal, use a DNS provider plugin:

**Supported providers**: Cloudflare, Route53, DigitalOcean, Google Cloud DNS, Azure, and 20+ more.

**Example with Cloudflare**:
```bash
# Install plugin
sudo apt install python3-certbot-dns-cloudflare

# Create credentials file
mkdir -p ~/.secrets
echo "dns_cloudflare_api_token = YOUR_API_TOKEN" > ~/.secrets/cloudflare.ini
chmod 600 ~/.secrets/cloudflare.ini

# Request certificate with plugin
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d yourdomain.com -d "*.yourdomain.com" \
  --deploy-hook "systemctl reload nginx"

# Test auto-renewal
sudo certbot renew --dry-run
```

## Verification Commands

### Check DNS Configuration

```bash
# Verify A record points to your server
dig yourdomain.com A

# Check subdomain wildcard resolution
dig admin.yourdomain.com A
dig org1.yourdomain.com A

# Verify TXT record during setup
dig _acme-challenge.yourdomain.com TXT
```

### Check Certificate Details

```bash
# List all certificates
sudo certbot certificates

# View certificate details
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Check certificate covers wildcard
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout | grep -A2 "Subject Alternative Name"
```

### Check Nginx Configuration

```bash
# Test Nginx config syntax
sudo nginx -t

# View full Nginx configuration
sudo nginx -T

# Check SSL configuration
sudo nginx -T | grep -A10 ssl_certificate
```

### Check HTTPS Accessibility

```bash
# Test HTTPS on base domain
curl -I https://yourdomain.com

# Test HTTPS on subdomain
curl -I https://admin.yourdomain.com

# Check SSL certificate from browser perspective
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Test SSL Labs (opens in browser)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

### Check Firewall and Ports

```bash
# Check firewall status
sudo ufw status

# Ensure ports 80 and 443 are open
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verify ports are listening
sudo netstat -tlnp | grep ':80\|:443'
```

### Check Logs

```bash
# Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

## Best Practices

1. **DNS Propagation**: Always wait 5-15 minutes after adding TXT records
2. **Verification First**: Verify DNS with `dig` before pressing Enter in Certbot
3. **Clean Old Records**: Delete old `_acme-challenge` TXT records before new attempts
4. **Use External DNS**: Test with `@8.8.8.8` or `@1.1.1.1` to avoid cache
5. **Document API Keys**: If using DNS plugin, securely store API credentials
6. **Set Renewal Reminders**: Wildcard certs with `--manual` need manual renewal every 80 days
7. **Test First**: Use `--dry-run` to test without hitting rate limits
8. **Backup Certificates**: Keep copies in secure location

## DNS Provider Examples

### TXT Record Format

Different providers have slightly different formats:

**Cloudflare**:
- Name: `_acme-challenge`
- Type: `TXT`
- Content: `abc123...` (from Certbot)
- TTL: Auto or 300

**AWS Route53**:
- Name: `_acme-challenge.yourdomain.com.`
- Type: `TXT`
- Value: `"abc123..."` (with quotes)
- TTL: 300

**DigitalOcean**:
- Hostname: `_acme-challenge`
- Type: `TXT`
- Value: `abc123...`
- TTL: 300

**Google Domains**:
- Host name: `_acme-challenge`
- Type: `TXT`
- Data: `abc123...`
- TTL: 300

## Troubleshooting Checklist

When SSL setup fails, check these in order:

- [ ] DNS A record points to correct server IP
- [ ] Ports 80 and 443 are open in firewall
- [ ] Nginx is running (`sudo systemctl status nginx`)
- [ ] TXT record added with exact value from Certbot
- [ ] Waited 5-15 minutes for DNS propagation
- [ ] Verified with `dig @8.8.8.8 _acme-challenge.yourdomain.com TXT`
- [ ] No old `_acme-challenge` TXT records exist
- [ ] Using correct domain format in command
- [ ] Using DNS-01 challenge (not HTTP-01)
- [ ] Requesting both base domain and wildcard
- [ ] Email address is valid

## Getting Help

### Check Certbot Logs

```bash
sudo cat /var/log/letsencrypt/letsencrypt.log | tail -100
```

### Test with Dry Run

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d yourdomain.com -d "*.yourdomain.com" \
  --dry-run
```

### Community Resources

- Let's Encrypt Community: https://community.letsencrypt.org/
- Certbot Documentation: https://eff-certbot.readthedocs.io/
- SSL Labs Test: https://www.ssllabs.com/ssltest/

## Quick Reference

### Request Wildcard Certificate

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d yourdomain.com -d "*.yourdomain.com" \
  --agree-tos --email admin@yourdomain.com \
  --manual-public-ip-logging-ok
```

### Verify DNS Propagation

```bash
dig @8.8.8.8 _acme-challenge.yourdomain.com TXT +short
```

### Check Certificate Expiry

```bash
sudo certbot certificates
```

### Renew Certificate

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d yourdomain.com -d "*.yourdomain.com" \
  --force-renewal
```

### Reload Nginx After Renewal

```bash
sudo nginx -t && sudo systemctl reload nginx
```
