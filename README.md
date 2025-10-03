# Multi-Tenant Membership Management System

A comprehensive membership management system supporting multiple organizations with flexible URL-based routing, Supabase backend, and modern React frontend.

## 🚀 Features

### Core Features
- **Multi-Tenant Architecture**: Complete data isolation per organization using URL parameters or subdomains
- **Custom Domain Support**: Organizations can use their own domains (e.g., frps.org.uk) with automatic SSL
- **Organization Selector**: Easy switching between organizations via URL parameter (?org=)
- **URL Parameter Routing**: Works with subdomains, custom domains, or URL parameters (?org=orgslug)
- **Flexible Development**: Supports localhost, IP addresses, and production domains
- **Super Admin Portal**: System administration via ?org=admin or admin.yourdomain.com
- **Role-Based Access**: Members, Admins, Super-Admin roles with granular permissions
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### Membership Management
- **Custom Signup Forms**: Dynamic form fields per organization
- **Membership Types**: Flexible pricing and duration options
- **Member Notes & History**: Color-coded admin notes on member profiles (general, admin, support, payment, behavior)
- **Automated Reminders**: Email reminders for expiring memberships and upcoming events
- **Member Badges/Achievements**: Manual and automatic award system with criteria
- **CSV Export**: Export members, memberships, events, registrations, committees, and subscribers

### Communications
- **Email Templates Library**: Pre-built templates with variable system ({{first_name}}, {{last_name}}, etc.)
- **Email Campaigns**: Integrated mailing list management via Resend
- **In-App Notifications**: Real-time notification center with bell icon and unread counts
- **Automated Workflows**: Welcome emails, renewal reminders, expiry notices

### Events & Groups
- **Event Registration**: RSVP system with capacity limits and waitlist
- **Attendance Tracking**: Check-in functionality and attendance reports
- **Committee/Group Management**: Roles and automatic mailing list synchronization
- **Event Analytics**: Registration stats and attendance tracking

### Analytics & Reporting
- **Advanced Dashboard**: Charts and visualizations using Recharts
- **Custom Report Builder**: Flexible filters and criteria
- **Export Capabilities**: CSV export across all data views
- **Member Analytics**: Membership trends and engagement metrics

### Document Management
- **Document Library**: Upload and share files (external URLs from Google Drive, Dropbox, etc.)
- **Categories**: General, policy, form, guide, legal, financial, other
- **Public/Private Visibility**: Control document access per organization
- **Download Tracking**: Monitor document usage

### Technical Features
- **Supabase Integration**: PostgreSQL with Row Level Security (RLS)
- **DNS Verification**: TXT record verification for custom domains (ACME standard)
- **SSL Automation**: Certbot integration for automatic HTTPS via Let's Encrypt
- **Priority Tenant Detection**: Custom domain → subdomain → URL parameter

## 🛠 Technology Stack

- **Frontend**: Vite, React, Tailwind CSS, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Node.js, PM2, Nginx

## 📋 Prerequisites

- Node.js 18+
- Supabase account and project
- Ubuntu/Debian server for deployment (optional)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd membership-system
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get credentials from: https://app.supabase.com/project/_/settings/api

### 3. Database Setup

**Important**: Run migrations in the correct order in Supabase Dashboard → SQL Editor:

1. **Core Schema** (Base tables, auth, organizations, memberships):
   ```sql
   -- Copy and run: supabase/migrations/20251001063749_20250929231345_bitter_cake.sql
   ```

2. **Email & Subscribers** (Email campaigns, mailing lists):
   ```sql
   -- Copy and run: supabase/migrations/20251001063812_20250930111734_violet_valley.sql
   ```

3. **Custom Domains** (Organization custom domain support):
   ```sql
   -- Copy and run: supabase/migrations/20251001063830_20250930115029_restless_fog.sql
   ```

4. **Events Table** (Base events table - REQUIRED before registrations):
   ```sql
   -- Copy and run: supabase_migration_events_table.sql
   ```

5. **Mailing Lists** (Multiple mailing list support - REQUIRED for committees):
   ```sql
   -- Copy and run: supabase_migration_mailing_lists.sql
   ```

6. **Events & Committees** (Event registration, RSVP, committees, groups):
   ```sql
   -- Copy and run: supabase_migration_event_registrations_committees.sql
   ```

7. **Phase 3 Advanced Features** (Analytics, badges, reports, automated reminders):
   ```sql
   -- Copy and run: supabase_migration_phase3_advanced_features.sql
   ```

8. **Phase 1 Quick Wins** (Email templates, member notes, notifications, documents):
   ```sql
   -- Copy and run: supabase_migration_phase1_quick_wins.sql
   ```

**⚠️ Migration Order is Critical**: Each migration depends on tables from previous migrations. Run them in the exact order above.

### 4. Create Test Organizations (Optional)

For testing and development:
```bash
# Run setup-organizations.sql in Supabase SQL Editor
# This creates sample organizations with slug-based access
```

### 5. Development

```bash
npm run dev
```

Visit one of the following:
- `http://localhost:5173` - Shows organization selector
- `http://localhost:5173?org=orgslug` - Load specific organization
- `http://localhost:5173?org=admin` - Access super admin portal

**✨ Organization Selector:** Without an org parameter, you'll see a list of all organizations to choose from.

## 📁 Project Structure

```
├── src/
│   ├── components/         # React components
│   │   ├── admin/         # Admin dashboard components
│   │   ├── auth/          # Authentication components
│   │   ├── dashboard/     # Member dashboard
│   │   ├── layout/        # Layout components
│   │   └── ui/            # Base UI components
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.ts     # Authentication hook
│   │   └── useTenant.ts   # Multi-tenant hook
│   ├── lib/               # Utilities and configurations
│   │   ├── supabase/      # Supabase client
│   │   ├── api/           # API utilities
│   │   ├── auth.ts        # Auth utilities
│   │   ├── tenant.ts      # Tenant utilities
│   │   └── utils.ts       # Helper functions
│   ├── App.tsx            # Main app component
│   └── main.tsx           # App entry point
├── supabase/
│   └── migrations/        # Database migrations
├── docs/                  # Documentation
├── server.js              # Production server
└── ecosystem.config.cjs   # PM2 configuration
```

## 🏗 Architecture Overview

### Multi-Tenancy
The system uses flexible URL parameter-based multi-tenancy with complete data isolation:
- `example.com?org=org1` - Organization 1
- `org1.member.ringing.org.uk` - Organization 1 (subdomain)
- `87.106.199.5?org=org1` - Organization 1 (IP address)
- `localhost:5173?org=admin` - Super Admin (development)
- `admin.member.ringing.org.uk` - Super Admin (production)

### Data Isolation
- Row Level Security (RLS) policies ensure complete data separation
- Each organization has independent user bases and configurations
- Shared infrastructure with isolated data access

### Authentication Flow
1. User visits site with ?org= parameter or organization subdomain
2. System detects tenant from URL parameter or subdomain
3. Authentication scoped to organization
4. RLS policies enforce data access

## 📚 Documentation

- [Database Setup](./docs/database-setup.md) - Supabase schema and migrations
- [Deployment Guide](./docs/deployment.md) - Production deployment instructions

## 🚀 Deployment

### Production Deployment

1. **Server Setup** (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

2. **Application Deployment**
```bash
# Clone repository
git clone <repository-url> /var/www/membership-system
cd /var/www/membership-system

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

3. **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name *.member.ringing.org.uk member.ringing.org.uk;

    root /var/www/membership-system/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

4. **SSL Setup**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d member.ringing.org.uk -d *.member.ringing.org.uk
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type check
npm run typecheck
```

## 🔒 Security

- Row Level Security (RLS) for data isolation
- JWT-based authentication via Supabase
- HTTPS enforcement
- Input validation and sanitization
- Security headers
- CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Create an issue on GitHub
- Contact the development team

## 🗺 Roadmap

### Completed ✅
- [✅] Custom signup forms with dynamic fields
- [✅] Membership types with pricing
- [✅] Email campaign management via Resend
- [✅] Event registration with RSVP & waitlist
- [✅] Committee/group management
- [✅] Advanced analytics dashboard with charts
- [✅] Automated email reminders
- [✅] Member badges/achievements system
- [✅] Custom report builder with CSV export
- [✅] Email templates library
- [✅] Member notes & history
- [✅] In-app notifications
- [✅] Document library
- [✅] Custom domain support with SSL
- [✅] Multi-tenant architecture
- [✅] API rate limiting (via Nginx)

### Planned 🚀
- [ ] Digital wallet integration (Google/Apple Wallet)
- [ ] Payment processor integration (Stripe/PayPal)
- [ ] QR code check-ins for events
- [ ] Mobile app development (React Native)
- [ ] Multi-language support (i18n)
- [ ] Two-factor authentication (2FA)
- [ ] Advanced member directory with search
- [ ] Public member profiles (optional)
- [ ] Attendance certificates/reports
