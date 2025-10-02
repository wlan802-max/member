# Multi-Tenant Membership Management System

## Overview

A comprehensive membership management system for multiple organizations with complete data isolation using URL parameter-based routing (`?org=slug`). It features a multi-tenant architecture, flexible routing (subdomain, URL parameters, or custom domains), a super admin portal, role-based access control, and an organization selector. The system supports custom signup forms with dynamic fields, membership types, integrated mailing list management with email campaigns via Resend, and **custom domain support** allowing organizations to use their own domains (e.g., `frps.org.uk`). The project is built with React, Vite, TypeScript, and Supabase (PostgreSQL), deployed via PM2 and Nginx with automatic SSL certificate management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **Vite + React + TypeScript** for fast development and hot module replacement. State management primarily uses React hooks, with custom hooks for authentication and tenant context. Multi-tenancy is implemented via tenant detection (`src/lib/tenant.ts`) that checks **custom domains first**, then falls back to URL parameters or subdomains, and an organization selector for easy switching. Routing is handled by conditional rendering within `App.tsx` without a client-side router. Authentication integrates with Supabase Auth, guiding users through organization-specific logins based on tenant detection.

### Custom Domains Architecture

Organizations can use their own custom domains (e.g., `example.org`) instead of subdomains. The system includes:
- **Database Schema**: `organization_domains` table with DNS verification tokens, SSL status, and primary domain support
- **Tenant Detection**: Priority-based detection (custom domain → subdomain → URL parameter)
- **Admin UI**: Complete domain management interface in organization settings (add/verify/delete/SSL)
- **DNS Verification**: TXT record verification using ACME standard
- **Nginx Integration**: Per-domain server blocks with security headers and rate limiting
- **SSL Automation**: Certbot integration for automatic HTTPS via Let's Encrypt
- **Management Tools**: Shell script (`manage-custom-domain.sh`) for server-side domain operations

### Backend Architecture

The backend is centered around **Supabase PostgreSQL**, utilizing core tables like `organizations`, `profiles`, `memberships`, `events`, `subscribers`, `email_campaigns`, and **`organization_domains`**. **Row Level Security (RLS)** is critical, enforcing organization-level data isolation. Super admins are uniquely identified by `organization_id = NULL` in their profiles, allowing them cross-organization access via `SECURITY DEFINER` functions, bypassing standard RLS policies. Supabase Auth manages user authentication, with a custom profile table extending user data with organization context.

The backend includes Express.js API endpoints for custom domain management:
- **Domain Verification**: `/api/domains/verify` - Checks DNS TXT records using native DNS resolution
- **SSL Generation**: `/api/domains/ssl/generate` - Triggers Certbot for SSL certificate issuance (production only)

### Design Patterns & Key Decisions

-   **Priority-Based Tenant Detection**: Custom domains checked first, then subdomains, then URL parameters - provides flexibility while supporting branded experiences
-   **URL Parameter over Subdomain-Only Routing**: Offers flexibility across all environments (localhost, IP, production) for easier development
-   **Super Admin as Null Organization**: Prevents RLS circular dependencies and simplifies cross-organization access for super admins
-   **Vite over Next.js**: Chosen for faster development builds, HMR, and simpler deployment of static files
-   **Custom Hooks over Context API**: Used for simpler component logic, debugging, and direct Supabase integration
-   **DNS-Based Domain Verification**: Uses TXT records (ACME standard) for cryptographic proof of domain ownership
-   **Certbot Nginx Plugin**: Automates SSL certificate issuance and Nginx configuration updates

### Deployment Architecture

The production stack runs on **Ubuntu 20.04+ LTS** with **Node.js 20**, managed by **PM2** in cluster mode. **Nginx** acts as a reverse proxy for subdomain routing and custom domains, handling static file caching, compression, and security headers. SSL/TLS is managed by **Certbot** (Let's Encrypt) with wildcard support for subdomains and per-domain certificates for custom domains. An **Express.js** server serves the built Vite static files. 

The `deploy.sh` script automates:
- Server setup and security configuration (UFW, Fail2Ban)
- Application deployment and PM2 process management
- SSL configuration for main domain and wildcard subdomains
- **Custom domain infrastructure** (management script, templates, documentation)
- Monitoring, backups, and log rotation

**Custom Domain Management** is handled via `/usr/local/bin/manage-custom-domain` script that:
- Generates Nginx configurations from templates
- Requests SSL certificates via Certbot
- Validates domain format and DNS configuration
- Lists and removes custom domains

## External Dependencies

### Third-Party Services

-   **Supabase**: Primary backend for PostgreSQL database (RLS), authentication, and potential storage. Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
-   **Resend**: For transactional emails, marketing campaigns, and audience management. Integrated via `RESEND_API_KEY`.
-   **Let's Encrypt**: SSL certificate authority for HTTPS (via Certbot). Provides free SSL certificates with automatic renewal.

### Frontend Libraries

-   `@supabase/supabase-js`: Supabase client library.
-   `tailwind-merge` + `clsx`: For CSS utility management.
-   `lucide-react`: Icon library.
-   `react-dom`: React rendering library.

### Build & Development Tools

-   `vite`: Build tool and development server.
-   `typescript`: For type safety.
-   `tailwindcss`: Utility-first CSS framework.
-   `eslint`: Code linting.
-   `express`: Production static file server.

### Infrastructure Dependencies

-   **Node.js 18+**: Runtime environment
-   **PostgreSQL**: Managed by Supabase
-   **PM2**: Process manager for production
-   **Nginx**: Web server and reverse proxy (with per-domain configuration support)
-   **Certbot**: SSL certificate management (automatic renewal via systemd timer)
-   **DNS Provider**: Required for custom domain verification (must support A and TXT records)