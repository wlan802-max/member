#!/bin/bash

# SSL Helper Script - Diagnose and fix common wildcard SSL issues
# Usage: sudo ./ssl-helper.sh [check|renew|verify-dns|test-cert]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[*]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
fi

# Get domain from command line or prompt
DOMAIN="${2:-}"
if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain (e.g., example.com): " DOMAIN
fi

# Validate domain format (supports multi-level domains like member.ringing.org.uk)
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$ ]]; then
    error "Invalid domain format: $DOMAIN"
fi

# Command functions
check_system() {
    log "Checking SSL system health for $DOMAIN..."
    echo ""
    
    # 1. Check if certbot is installed
    info "1. Checking Certbot installation..."
    if command -v certbot &> /dev/null; then
        CERTBOT_VERSION=$(certbot --version 2>&1 | head -1)
        echo "   ✅ $CERTBOT_VERSION"
    else
        echo "   ❌ Certbot not installed"
        warn "Install with: sudo apt install certbot python3-certbot-nginx -y"
    fi
    echo ""
    
    # 2. Check DNS A record
    info "2. Checking DNS A record..."
    SERVER_IP=$(curl -s ifconfig.me)
    DNS_IP=$(dig +short "$DOMAIN" | head -1)
    
    if [ -n "$DNS_IP" ]; then
        echo "   Server IP: $SERVER_IP"
        echo "   DNS A record: $DNS_IP"
        if [ "$SERVER_IP" = "$DNS_IP" ]; then
            echo "   ✅ DNS A record points to this server"
        else
            echo "   ❌ DNS A record does NOT point to this server"
            warn "Update your DNS A record to point to $SERVER_IP"
        fi
    else
        echo "   ❌ No DNS A record found for $DOMAIN"
        warn "Add an A record pointing to $SERVER_IP"
    fi
    echo ""
    
    # 3. Check firewall ports
    info "3. Checking firewall configuration..."
    if command -v ufw &> /dev/null; then
        UFW_STATUS=$(ufw status | grep -E "80/tcp|443/tcp" || true)
        if echo "$UFW_STATUS" | grep -q "80/tcp.*ALLOW" && echo "$UFW_STATUS" | grep -q "443/tcp.*ALLOW"; then
            echo "   ✅ Ports 80 and 443 are open"
        else
            echo "   ❌ Ports 80 and/or 443 are not open"
            warn "Run: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
        fi
    else
        warn "UFW not installed, cannot check firewall"
    fi
    echo ""
    
    # 4. Check if ports are listening
    info "4. Checking if ports 80 and 443 are listening..."
    # Use ss instead of netstat (ss is standard on modern Ubuntu)
    if command -v ss &> /dev/null; then
        if ss -tlnp | grep -q ':80 '; then
            echo "   ✅ Port 80 is listening"
        else
            echo "   ❌ Port 80 is NOT listening"
        fi
        
        if ss -tlnp | grep -q ':443 '; then
            echo "   ✅ Port 443 is listening"
        else
            echo "   ⚠️  Port 443 is NOT listening (expected if no SSL cert yet)"
        fi
    elif command -v netstat &> /dev/null; then
        # Fallback to netstat if available
        if netstat -tlnp | grep -q ':80 '; then
            echo "   ✅ Port 80 is listening"
        else
            echo "   ❌ Port 80 is NOT listening"
        fi
        
        if netstat -tlnp | grep -q ':443 '; then
            echo "   ✅ Port 443 is listening"
        else
            echo "   ⚠️  Port 443 is NOT listening (expected if no SSL cert yet)"
        fi
    else
        warn "Neither ss nor netstat available - cannot check listening ports"
    fi
    echo ""
    
    # 5. Check Nginx status
    info "5. Checking Nginx..."
    if systemctl is-active --quiet nginx; then
        echo "   ✅ Nginx is running"
        
        # Test Nginx configuration
        if nginx -t &> /dev/null; then
            echo "   ✅ Nginx configuration is valid"
        else
            echo "   ❌ Nginx configuration has errors"
            warn "Run: sudo nginx -t"
        fi
    else
        echo "   ❌ Nginx is NOT running"
        warn "Run: sudo systemctl start nginx"
    fi
    echo ""
    
    # 6. Check existing certificates
    info "6. Checking existing SSL certificates..."
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        echo "   ✅ Certificate exists at /etc/letsencrypt/live/$DOMAIN"
        
        # Check certificate expiry
        EXPIRY=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ -n "$EXPIRY" ]; then
            echo "   📅 Expires: $EXPIRY"
            
            # Check if it's a wildcard certificate
            if openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -text -noout 2>/dev/null | grep -q "DNS:\*\.$DOMAIN"; then
                echo "   ✅ Wildcard certificate (*.$DOMAIN)"
            else
                echo "   ⚠️  NOT a wildcard certificate"
                warn "For multi-tenant support, you need a wildcard certificate"
            fi
        fi
    else
        echo "   ⚠️  No certificate found for $DOMAIN"
        info "Run: sudo ./ssl-helper.sh setup $DOMAIN"
    fi
    echo ""
    
    # 7. Test HTTPS accessibility
    info "7. Testing HTTPS accessibility..."
    if curl -sSf -o /dev/null "https://$DOMAIN" 2>/dev/null; then
        echo "   ✅ HTTPS is accessible on $DOMAIN"
    else
        echo "   ❌ HTTPS is NOT accessible on $DOMAIN"
    fi
    
    # Test subdomain (if wildcard cert exists)
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        if openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -text -noout 2>/dev/null | grep -q "DNS:\*\.$DOMAIN"; then
            if curl -sSf -o /dev/null "https://admin.$DOMAIN" 2>/dev/null; then
                echo "   ✅ HTTPS is accessible on admin.$DOMAIN (wildcard working)"
            else
                echo "   ⚠️  HTTPS is NOT accessible on admin.$DOMAIN"
            fi
        fi
    fi
    echo ""
    
    # Summary
    log "System check complete!"
    echo ""
    info "Next steps:"
    echo "   - If DNS is wrong: Update your DNS A record"
    echo "   - If firewall blocked: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
    echo "   - If no certificate: sudo ./ssl-helper.sh setup $DOMAIN"
    echo "   - For renewal: sudo ./ssl-helper.sh renew $DOMAIN"
    echo ""
}

verify_dns() {
    log "Verifying DNS TXT record for wildcard SSL challenge..."
    echo ""
    
    TXT_DOMAIN="_acme-challenge.$DOMAIN"
    
    info "Checking TXT record: $TXT_DOMAIN"
    echo ""
    
    # Check local DNS
    echo "1. Local DNS resolver:"
    LOCAL_TXT=$(dig +short "$TXT_DOMAIN" TXT 2>/dev/null || echo "")
    if [ -n "$LOCAL_TXT" ]; then
        echo "   ✅ $LOCAL_TXT"
    else
        echo "   ❌ No TXT record found"
    fi
    echo ""
    
    # Check Google DNS (no cache)
    echo "2. Google DNS (8.8.8.8) - no cache:"
    GOOGLE_TXT=$(dig @8.8.8.8 +short "$TXT_DOMAIN" TXT 2>/dev/null || echo "")
    if [ -n "$GOOGLE_TXT" ]; then
        echo "   ✅ $GOOGLE_TXT"
    else
        echo "   ❌ No TXT record found"
    fi
    echo ""
    
    # Check Cloudflare DNS
    echo "3. Cloudflare DNS (1.1.1.1):"
    CF_TXT=$(dig @1.1.1.1 +short "$TXT_DOMAIN" TXT 2>/dev/null || echo "")
    if [ -n "$CF_TXT" ]; then
        echo "   ✅ $CF_TXT"
    else
        echo "   ❌ No TXT record found"
    fi
    echo ""
    
    # Summary
    if [ -n "$LOCAL_TXT" ] && [ -n "$GOOGLE_TXT" ] && [ -n "$CF_TXT" ]; then
        log "✅ DNS TXT record is fully propagated!"
        echo ""
        info "You can now press Enter in Certbot to complete verification"
    elif [ -n "$LOCAL_TXT" ] || [ -n "$GOOGLE_TXT" ] || [ -n "$CF_TXT" ]; then
        warn "⚠️  DNS TXT record is partially propagated"
        echo ""
        info "Wait 5-10 more minutes and run this command again:"
        echo "   sudo ./ssl-helper.sh verify-dns $DOMAIN"
    else
        error "❌ DNS TXT record not found on any DNS server"
        echo ""
        info "Please add the TXT record as instructed by Certbot and wait 5-10 minutes"
    fi
    echo ""
}

test_certificate() {
    log "Testing SSL certificate for $DOMAIN..."
    echo ""
    
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        error "No certificate found at /etc/letsencrypt/live/$DOMAIN"
    fi
    
    CERT_FILE="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    
    # 1. Check certificate validity
    info "1. Certificate Validity:"
    if openssl x509 -in "$CERT_FILE" -noout -checkend 0 2>/dev/null; then
        echo "   ✅ Certificate is valid"
    else
        echo "   ❌ Certificate is EXPIRED or invalid"
    fi
    echo ""
    
    # 2. Check expiry date
    info "2. Expiry Date:"
    EXPIRY=$(openssl x509 -in "$CERT_FILE" -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "   📅 $EXPIRY"
    
    # Calculate days until expiry
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
    
    if [ $DAYS_LEFT -lt 30 ]; then
        warn "⚠️  Certificate expires in $DAYS_LEFT days - renewal recommended"
    else
        echo "   ✅ $DAYS_LEFT days until expiry"
    fi
    echo ""
    
    # 3. Check domains covered
    info "3. Domains Covered:"
    SANS=$(openssl x509 -in "$CERT_FILE" -text -noout 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/DNS://g' | sed 's/,//g')
    echo "$SANS" | tr ' ' '\n' | while read -r san; do
        if [ -n "$san" ]; then
            echo "   - $san"
        fi
    done
    
    # Check if wildcard
    if echo "$SANS" | grep -q "\*\.$DOMAIN"; then
        echo "   ✅ Wildcard certificate (*.$DOMAIN)"
    else
        warn "⚠️  NOT a wildcard certificate"
    fi
    echo ""
    
    # 4. Check certificate chain
    info "4. Certificate Chain:"
    CHAIN_LENGTH=$(openssl crl2pkcs7 -nocrl -certfile "$CERT_FILE" 2>/dev/null | openssl pkcs7 -print_certs -noout 2>/dev/null | grep subject | wc -l)
    echo "   📊 Chain length: $CHAIN_LENGTH certificates"
    if [ $CHAIN_LENGTH -ge 2 ]; then
        echo "   ✅ Full certificate chain present"
    else
        warn "⚠️  Incomplete certificate chain"
    fi
    echo ""
    
    # 5. Test HTTPS connections
    info "5. HTTPS Connectivity:"
    
    # Test base domain
    if curl -sSf -o /dev/null "https://$DOMAIN" 2>/dev/null; then
        echo "   ✅ https://$DOMAIN is accessible"
    else
        echo "   ❌ https://$DOMAIN is NOT accessible"
    fi
    
    # Test subdomain (if wildcard)
    if echo "$SANS" | grep -q "\*\.$DOMAIN"; then
        if curl -sSf -o /dev/null "https://admin.$DOMAIN" 2>/dev/null; then
            echo "   ✅ https://admin.$DOMAIN is accessible (wildcard working)"
        else
            echo "   ❌ https://admin.$DOMAIN is NOT accessible"
        fi
    fi
    echo ""
    
    # 6. SSL Labs grade (optional - just provide link)
    info "6. Detailed SSL Analysis:"
    echo "   Run SSL Labs test at:"
    echo "   https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo ""
    
    log "Certificate test complete!"
    echo ""
}

setup_wildcard() {
    log "Setting up wildcard SSL certificate for $DOMAIN..."
    echo ""
    
    warn "IMPORTANT: This requires DNS access to add TXT records"
    echo ""
    
    read -p "Do you have access to add TXT records to $DOMAIN DNS? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "DNS access required to set up wildcard SSL certificate"
    fi
    
    echo ""
    info "Starting wildcard SSL setup..."
    echo "   This will request certificates for:"
    echo "   - $DOMAIN (base domain)"
    echo "   - *.$DOMAIN (all subdomains)"
    echo ""
    
    read -p "Press Enter to continue or Ctrl+C to cancel..."
    
    # Run certbot with manual DNS challenge
    certbot certonly --manual --preferred-challenges dns \
        -d "$DOMAIN" -d "*.$DOMAIN" \
        --agree-tos --email "admin@$DOMAIN" \
        --manual-public-ip-logging-ok
    
    if [ $? -eq 0 ]; then
        log "✅ Wildcard SSL certificate obtained successfully!"
        echo ""
        info "Next steps:"
        echo "   1. Update Nginx configuration to use the certificate"
        echo "   2. Test configuration: sudo nginx -t"
        echo "   3. Reload Nginx: sudo systemctl reload nginx"
        echo "   4. Test SSL: sudo ./ssl-helper.sh test-cert $DOMAIN"
        echo ""
    else
        error "❌ Certificate setup failed. Check the errors above."
    fi
}

renew_certificate() {
    log "Renewing SSL certificate for $DOMAIN..."
    echo ""
    
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        error "No existing certificate found for $DOMAIN"
    fi
    
    # Check if it's a wildcard certificate
    CERT_FILE="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    if openssl x509 -in "$CERT_FILE" -text -noout 2>/dev/null | grep -q "DNS:\*\.$DOMAIN"; then
        warn "This is a wildcard certificate - requires manual DNS challenge"
        echo ""
        info "You will need to add a NEW TXT record when prompted"
        echo ""
        
        read -p "Press Enter to continue or Ctrl+C to cancel..."
        
        # Force renewal with manual challenge
        certbot certonly --manual --preferred-challenges dns \
            -d "$DOMAIN" -d "*.$DOMAIN" \
            --force-renewal \
            --manual-public-ip-logging-ok
    else
        # Non-wildcard can use automatic renewal
        certbot renew --cert-name "$DOMAIN"
    fi
    
    if [ $? -eq 0 ]; then
        log "✅ Certificate renewed successfully!"
        echo ""
        info "Reloading Nginx..."
        if nginx -t &> /dev/null; then
            systemctl reload nginx
            log "✅ Nginx reloaded"
        else
            error "Nginx configuration test failed"
        fi
    else
        error "❌ Certificate renewal failed"
    fi
}

show_help() {
    echo "SSL Helper Script - Wildcard SSL Certificate Management"
    echo ""
    echo "Usage: sudo $0 COMMAND [DOMAIN]"
    echo ""
    echo "Commands:"
    echo "  check [domain]       Check SSL system health and configuration"
    echo "  setup [domain]       Set up new wildcard SSL certificate"
    echo "  renew [domain]       Renew existing SSL certificate"
    echo "  verify-dns [domain]  Verify DNS TXT record propagation"
    echo "  test-cert [domain]   Test existing SSL certificate"
    echo "  help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  sudo $0 check example.com"
    echo "  sudo $0 setup example.com"
    echo "  sudo $0 verify-dns example.com"
    echo "  sudo $0 renew example.com"
    echo ""
    echo "For detailed troubleshooting, see: WILDCARD_SSL_SETUP.md"
    echo ""
}

# Main command dispatcher
COMMAND="${1:-help}"

case "$COMMAND" in
    check)
        check_system
        ;;
    setup)
        setup_wildcard
        ;;
    renew)
        renew_certificate
        ;;
    verify-dns)
        verify_dns
        ;;
    test-cert|test)
        test_certificate
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
