# Multi-Tenant Membership Management System

A comprehensive membership management system supporting multiple organizations with flexible URL-based routing, Supabase backend, and modern React frontend.

## 🚀 Features

- **Multi-Tenant Architecture**: Complete data isolation per organization
- **Organization Selector**: Easy switching between organizations via URL parameter (?org=)
- **URL Parameter Routing**: Works with subdomains (org.member.ringing.org.uk) or URL parameters (?org=orgslug)
- **Flexible Development**: Supports localhost, IP addresses, and production domains
- **Super Admin Portal**: System administration via ?org=admin
- **Role-Based Access**: Members, Admins, Super-Admin roles
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Supabase Integration**: PostgreSQL with Row Level Security (RLS)

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

In Supabase Dashboard → SQL Editor, run migrations in order:
1. `supabase/migrations/20251001063749_20250929231345_bitter_cake.sql`
2. `supabase/migrations/20251001063812_20250930111734_violet_valley.sql`
3. `supabase/migrations/20251001063830_20250930115029_restless_fog.sql`

Then create organizations:
```bash
# Run setup-organizations.sql in Supabase SQL Editor
```

### 4. Development

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

- [ ] Email campaign management
- [ ] Digital wallet integration (Google/Apple Wallet)
- [ ] Payment processor integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Multi-language support
- [ ] API rate limiting
- [ ] Enhanced security features
