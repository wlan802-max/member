#!/bin/bash

# Automated Super Admin Setup Script
# This script sets up the super admin organization and user

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

log "Super Admin Setup"
log "=================="

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    error "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables"
fi

# Prompt for admin email and password
read -p "Enter super admin email (default: admin@member.ringing.org.uk): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@member.ringing.org.uk}

read -s -p "Enter super admin password: " ADMIN_PASSWORD
echo

if [ -z "$ADMIN_PASSWORD" ]; then
    error "Password cannot be empty"
fi

log "Creating super admin organization..."

# Create organization using Supabase REST API
ORG_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/organizations" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "slug": "admin",
    "name": "System Administration",
    "domain": "admin.member.ringing.org.uk",
    "contact_email": "'$ADMIN_EMAIL'",
    "primary_color": "#1E40AF",
    "secondary_color": "#3B82F6",
    "is_active": true
  }')

# Extract organization ID
ORG_ID=$(echo $ORG_RESPONSE | jq -r '.[0].id // .id // empty')

if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
    warn "Organization might already exist, trying to get existing one..."
    ORG_RESPONSE=$(curl -s "$SUPABASE_URL/rest/v1/organizations?slug=eq.admin" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
    ORG_ID=$(echo $ORG_RESPONSE | jq -r '.[0].id // empty')
fi

if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
    error "Failed to create or find admin organization"
fi

log "Organization created/found with ID: $ORG_ID"

log "Creating super admin user..."

# Create user using Supabase Auth Admin API
USER_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$ADMIN_EMAIL'",
    "password": "'$ADMIN_PASSWORD'",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "System",
      "last_name": "Administrator",
      "role": "super_admin"
    }
  }')

# Extract user ID
USER_ID=$(echo $USER_RESPONSE | jq -r '.id // empty')

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    error "Failed to create super admin user. Response: $USER_RESPONSE"
fi

log "User created with ID: $USER_ID"

log "Creating super admin profile..."

# Create profile
PROFILE_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/profiles" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "'$USER_ID'",
    "organization_id": "'$ORG_ID'",
    "email": "'$ADMIN_EMAIL'",
    "first_name": "System",
    "last_name": "Administrator",
    "role": "super_admin",
    "is_active": true
  }')

log "Super admin setup completed successfully!"
log "=================================="
log "Super Admin Details:"
log "Email: $ADMIN_EMAIL"
log "Organization: System Administration (admin)"
log "Access URL: https://admin.member.ringing.org.uk"
log ""
log "You can now sign in to the super admin portal!"