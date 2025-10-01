# Multi-Tenant Membership Management System

## Overview

A comprehensive membership management system designed for multiple organizations with complete data isolation. The system uses URL parameter-based routing (`?org=slug`) to support multi-tenancy, making it easy to switch between organizations during development and production. Built with React and Vite on the frontend, Supabase (PostgreSQL) on the backend, with deployment via PM2 and Nginx.

**Key Features:**
- Multi-tenant architecture with organization-level data isolation
- Flexible routing: subdomain support (`org.member.ringing.org.uk`) or URL parameters (`?org=orgslug`)
- Super admin portal for cross-organization management (`?org=admin`)
- Role-based access control (Members, Admins, Super Admin)
- Organization selector for easy switching between tenants

## User Preferences

Preferred communication style: Simple, everyday language.

## Replit Environment Setup (October 2025)

This project has been configured to run in the Replit environment with the following setup:

### Development Configuration

**Vite Configuration (vite.config.ts):**
- Host: `0.0.0.0` (required for Replit)
- Port: `5000` (required for Replit webview)
- HMR configured for Replit's proxy (wss protocol on port 443)

**Workflow:**
- Name: "Start application"
- Command: `npm run dev`
- Runs Vite development server on port 5000

### Required Environment Variables

The application requires Supabase credentials to function:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

These should be configured via Replit Secrets (not .env file).

### Deployment Configuration

The project is configured for Replit deployment:
- Build command: `npm run build`
- Start command: `node server.js`
- Deployment type: Autoscale (stateless frontend)
- Production server runs on port 5000 using Express.js

### Key Changes Made for Replit

1. **Vite configuration updated** to bind to `0.0.0.0:5000` with HMR proxy settings
2. **Express added** as production dependency for serving built files
3. **Deployment configured** to use autoscale with build and start scripts
4. **LSP errors fixed** in App.tsx (removed unused imports)
5. **HTML sanitization** added using DOMPurify for email campaign content (XSS prevention)
6. **Alert() calls removed** - All 7 alert() popups replaced with disabled states and inline feedback

### Recent Implementation (October 2025)

**Super Admin Dashboard (src/components/admin/SuperAdminDashboard.tsx):**
- ✅ Full CRUD operations for organizations (Create, Edit, View Details, Delete/Deactivate)
- ✅ Organization stats overview with counts and metrics
- ✅ Search and filter functionality
- ✅ Uses real Supabase queries with proper RLS enforcement

**Organization Admin Panel (Embedded in src/components/dashboard/MemberDashboard.tsx):**
- ✅ Members management tabs for organization admins (MembersAdminView)
- ✅ View, add, edit, activate/deactivate members with real Supabase queries
- ✅ Organization Settings tab (SettingsAdminView) to update branding and contact info
- ✅ Security scoped to organization_id for data isolation
- Note: Embedded as tabs within MemberDashboard, not as separate file

**Member Dashboard Views:**
- ✅ Profile View: Edit personal information with proper security scoping (user_id + organization_id)
- ✅ Memberships: Real Supabase queries with proper filtering by organization_id and profile_id
- ✅ Events View: Real Supabase queries fetching upcoming published events with proper date filtering
- ✅ Messages View: Display announcements from email_campaigns with DOMPurify HTML sanitization

**Production Readiness Status:**
All critical limitations have been addressed (October 2025):

1. ✅ **Toast notification system** - Implemented Sonner (shadcn/ui recommended replacement) for user feedback
2. ✅ **Auth integration verified** - Using Supabase Auth properly with JWT tokens handled automatically by Supabase client
3. ✅ **Real memberships data** - Replaced mock data with actual Supabase queries, includes proper error handling and toast notifications
4. ✅ **Events functionality** - Added events table type definition and implemented EventsView with real Supabase queries to fetch/display upcoming published events
5. ✅ **Add member functionality** - Updated to work securely with existing Supabase Auth users (admin provides user_id from Supabase Auth dashboard)

**Remaining Considerations:**
- Events table must exist in Supabase database (schema provided in Database type)
- Add member requires user to sign up with Supabase Auth first (secure approach - no service role key exposure)
- RLS policies must be properly configured for multi-tenant data isolation

## System Architecture

### Frontend Architecture

**Framework & Build Tool:**
- **Vite + React + TypeScript** - Fast development server with hot module replacement
- Runs on port 5173 in development
- Static build output served via Express.js in production

**State Management:**
- React hooks for local state
- Custom hooks (`useAuth`, `useTenant`) for shared authentication and tenant context
- No global state library - keeps complexity low

**Multi-Tenancy Implementation:**
- **Tenant Detection** (`src/lib/tenant.ts`):
  - Checks URL parameter `?org=` first (works everywhere)
  - Falls back to subdomain parsing for production domains
  - Detects localhost, IP addresses, and production domains
  - Special handling for super admin portal (`?org=admin`)
  
- **Organization Selector** (`src/components/auth/LoginForm.tsx`):
  - Shows when no organization is selected (no `?org=` parameter)
  - Lists all active organizations from database
  - Redirects to `?org=slug` when organization chosen

**Routing Strategy:**
- Single-page application (SPA) with conditional rendering
- No client-side router (React Router) - uses `App.tsx` conditional logic
- Server-side: Nginx handles subdomains, Express serves static files

**Authentication Flow:**
1. User visits site → tenant detection runs
2. If no org selected → show organization selector
3. If `?org=admin` → show super admin login
4. If org selected → show organization-specific login
5. After authentication → load user profile with organization context

### Backend Architecture

**Supabase PostgreSQL Database:**

**Core Tables:**
- `organizations` - Tenant definitions with slug, domain, branding
- `profiles` - User profiles linked to organizations via `organization_id`
- `memberships` - Membership records (future feature)

**Row Level Security (RLS):**
- **Critical Design Decision**: Super admins have `organization_id = NULL`
- Regular users can only access data within their organization
- Super admins bypass organization restrictions via `SECURITY DEFINER` functions
- RLS policies use `is_super_admin()` function to avoid infinite recursion

**Authentication:**
- Supabase Auth handles user authentication
- Custom profile table extends auth users with organization context
- Profile loading uses LEFT JOIN for super admins (no organization requirement)

**Data Isolation:**
- Enforced at database level via RLS policies
- Each query automatically filtered by organization_id
- Super admin portal has cross-organization access

### Design Patterns & Key Decisions

**1. URL Parameter over Subdomain-Only Routing**
- **Rationale**: Works in all environments (localhost, IP, production)
- Simplifies development workflow
- No DNS configuration needed for testing
- Still supports subdomains in production via Nginx routing

**2. Super Admin as Null Organization**
- **Rationale**: Avoids circular dependencies in RLS policies
- Super admins don't belong to any single organization
- `SECURITY DEFINER` functions bypass RLS for cross-org access
- Prevents infinite recursion when checking super admin status

**3. Organization Selector vs. Error Page**
- **Rationale**: Better UX for multi-org users
- No configuration needed to access different organizations
- Self-service organization discovery
- Reduces support burden

**4. Vite over Next.js**
- **Rationale**: Despite some documentation mentioning Next.js, the actual implementation uses Vite
- Faster development builds and HMR
- Simpler deployment (static files + Express)
- No server-side rendering complexity needed

**5. Custom Hooks over Context API**
- **Rationale**: Keeps component logic simple
- Easier to debug and test
- No provider nesting complexity
- Direct Supabase integration

### Deployment Architecture

**Production Stack:**
- **Process Manager**: PM2 for Node.js process management
- **Web Server**: Nginx for reverse proxy and subdomain routing
- **SSL**: Let's Encrypt (Certbot) for HTTPS
- **Server**: Ubuntu/Debian Linux

**Nginx Configuration:**
- Routes subdomains to appropriate org parameter
- Handles SSL termination
- Serves static files with caching
- Proxies API requests to Express backend

**PM2 Configuration:**
- Single instance (fork mode) sufficient for current scale
- Auto-restart on failure
- Log rotation configured
- Health check endpoint at `/health`

## External Dependencies

### Third-Party Services

**Supabase (Primary Backend):**
- **PostgreSQL Database**: Multi-tenant data storage with RLS
- **Authentication**: User management and session handling
- **Storage**: Future file upload support (logos, documents)
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Future Integrations (Documented but Not Implemented):**
- **Resend API**: Email notifications
- **Google Wallet API**: Digital membership cards
- **Apple Wallet PassKit**: Digital membership cards

### Frontend Libraries

- `@supabase/supabase-js` - Supabase client
- `tailwind-merge` + `clsx` - CSS utility management
- `lucide-react` - Icon library
- `react-dom` - React rendering

### Build & Development Tools

- `vite` - Build tool and dev server
- `typescript` - Type safety
- `tailwindcss` - Utility-first CSS
- `eslint` - Code linting
- `express` - Production static file server

### Infrastructure Dependencies

- **Node.js 18+**: Runtime environment
- **PostgreSQL**: Via Supabase (managed)
- **PM2**: Process management in production
- **Nginx**: Web server and reverse proxy
- **Certbot**: SSL certificate management