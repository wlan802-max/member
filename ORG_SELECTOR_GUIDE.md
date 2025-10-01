# Organization Selector Guide

## Quick Access to Super Admin Portal

The login page now includes an **Organization Selector** - no subdomain configuration needed!

### How to Access Super Admin

**Method 1: Use the Organization Selector**
1. Visit `http://localhost:5173` (no ?org= parameter)
2. You'll see "Select Organization" page
3. Click **"System Administration"**
4. Log in with super admin credentials

**Method 2: Direct URL**
```
http://localhost:5173?org=admin
```

**Method 3: Switch from Another Organization**
1. On any login page, scroll to bottom
2. Click **"Switch Organization"** button
3. Select **"System Administration"**

## Features

### Organization Selector Page
- Appears when visiting site without ?org= parameter
- Shows all active organizations from database
- Building icon for each organization
- Shows organization name and slug (e.g., @admin, @demo)
- Hover effects for better UX

### Switch Organization Button
- Appears at bottom of login forms
- Only shows when 2+ organizations exist
- Opens modal with all organizations
- Current organization highlighted in blue

## Setup

### 1. Create Organizations in Database

Run `setup-organizations.sql` in Supabase SQL Editor:

```sql
-- This creates:
-- admin - System Administration (super admin portal)
-- demo  - Demo Organization (for testing)
```

### 2. Verify Organizations

```sql
SELECT slug, name, is_active FROM organizations ORDER BY name;
```

You should see both organizations with `is_active = true`.

### 3. Access the App

Visit `http://localhost:5173` and you'll see the organization selector!

## Adding More Organizations

```sql
INSERT INTO organizations (slug, name, contact_email, is_active)
VALUES ('myorg', 'My Organization', 'contact@myorg.com', true);
```

New organizations appear immediately in the selector.

## URL Patterns

### Development
```
http://localhost:5173              → Organization Selector
http://localhost:5173?org=admin    → Super Admin Portal
http://localhost:5173?org=demo     → Demo Organization
http://localhost:5173?org=myorg    → Your Organization
```

### Production
```
https://member.ringing.org.uk             → Organization Selector
https://admin.member.ringing.org.uk       → Super Admin Portal (subdomain)
http://localhost:5173?org=admin           → Alternative access
```

## Troubleshooting

### "No organizations loading"

Check database:
```sql
SELECT * FROM organizations WHERE is_active = true;
```

If empty, run `setup-organizations.sql`.

### "Switch Organization" button not showing

This is normal - it only appears when there are 2+ organizations.

### Organization not found after clicking

Organization may be deactivated:
```sql
SELECT slug, is_active FROM organizations WHERE slug = 'your-slug';
```

Make sure `is_active = true`.

### Can't access admin portal

1. Verify admin organization exists:
```sql
SELECT * FROM organizations WHERE slug = 'admin';
```

2. If missing, run `setup-organizations.sql`

3. Try direct URL: `http://localhost:5173?org=admin`

## How It Works

1. **On Page Load** - LoginForm fetches all active organizations from Supabase
2. **No Organization** - Shows selector page with all organizations
3. **Click Organization** - Redirects to `?org=slug` URL
4. **Tenant Detection** - `useTenant()` hook reads `?org=` parameter
5. **Login Page** - Shows organization-specific login form

## Developer Notes

- Organizations loaded via Supabase client
- Filtered by `is_active = true`
- Sorted alphabetically by name
- Uses URL parameters for tenant routing
- Modal built with existing Card/Button components
- Fully responsive design
