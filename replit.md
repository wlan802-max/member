# Multi-Tenant Membership Management System

## Overview

A comprehensive membership management system for multiple organizations with complete data isolation using URL parameter-based routing (`?org=slug`). It features a multi-tenant architecture, flexible routing (subdomain or URL parameters), a super admin portal, role-based access control, and an organization selector. The system supports custom signup forms with dynamic fields, membership types, and integrated mailing list management with email campaigns via Resend. The project is built with React, Vite, TypeScript, and Supabase (PostgreSQL), deployed via PM2 and Nginx.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **Vite + React + TypeScript** for fast development and hot module replacement. State management primarily uses React hooks, with custom hooks for authentication and tenant context. Multi-tenancy is implemented via tenant detection (`src/lib/tenant.ts`) that checks URL parameters or subdomains, and an organization selector for easy switching. Routing is handled by conditional rendering within `App.tsx` without a client-side router. Authentication integrates with Supabase Auth, guiding users through organization-specific logins based on tenant detection.

### Backend Architecture

The backend is centered around **Supabase PostgreSQL**, utilizing core tables like `organizations`, `profiles`, `memberships`, `events`, `subscribers`, and `email_campaigns`. **Row Level Security (RLS)** is critical, enforcing organization-level data isolation. Super admins are uniquely identified by `organization_id = NULL` in their profiles, allowing them cross-organization access via `SECURITY DEFINER` functions, bypassing standard RLS policies. Supabase Auth manages user authentication, with a custom profile table extending user data with organization context.

### Design Patterns & Key Decisions

-   **URL Parameter over Subdomain-Only Routing**: Offers flexibility across all environments (localhost, IP, production) for easier development.
-   **Super Admin as Null Organization**: Prevents RLS circular dependencies and simplifies cross-organization access for super admins.
-   **Vite over Next.js**: Chosen for faster development builds, HMR, and simpler deployment of static files.
-   **Custom Hooks over Context API**: Used for simpler component logic, debugging, and direct Supabase integration.

### Deployment Architecture

The production stack runs on **Ubuntu 20.04+ LTS** with **Node.js 20**, managed by **PM2** in cluster mode. **Nginx** acts as a reverse proxy for subdomain routing, handling static file caching, compression, and security headers. SSL/TLS is managed by **Certbot** (Let's Encrypt) with wildcard support. An **Express.js** server serves the built Vite static files. The `deploy.sh` script automates server setup, application deployment, SSL configuration, and security measures like UFW and Fail2Ban.

## External Dependencies

### Third-Party Services

-   **Supabase**: Primary backend for PostgreSQL database (RLS), authentication, and potential storage. Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
-   **Resend**: For transactional emails, marketing campaigns, and audience management. Integrated via `RESEND_API_KEY`.

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

-   **Node.js 18+**: Runtime environment.
-   **PostgreSQL**: Managed by Supabase.
-   **PM2**: Process manager for production.
-   **Nginx**: Web server and reverse proxy.
-   **Certbot**: SSL certificate management.