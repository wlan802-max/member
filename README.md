# Multi-Tenant Membership Management System

A comprehensive membership management system supporting multiple organizations with subdomain-based routing, digital membership cards, and email campaign management.

## 🚀 Features

- **Multi-Tenant Architecture**: Complete data isolation per organization
- **Organization Selector**: Easy switching between organizations and super admin portal
- **Subdomain Routing**: org.member.ringing.org.uk
- **Digital Membership Cards**: Google Wallet & Apple Wallet integration (optional)
- **Email Campaigns**: Resend API integration with campaign management (optional)
- **Automated Renewals**: Configurable renewal workflows
- **Role-Based Access**: Members, Admins, Super-Admin roles
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## 🛠 Technology Stack

- **Frontend**: Vite, React, Tailwind CSS, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Email**: Resend API (optional)
- **Digital Wallets**: Google Wallet API, Apple PassKit (optional)
- **Deployment**: Ubuntu/Debian, Nginx, PM2

## 📋 Prerequisites

- Node.js 18+
- Supabase account and project
- Resend API account
- Google Wallet API credentials
- Apple Developer account (for Wallet integration)
- Ubuntu/Debian server for deployment

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
1. `supabase/migrations/20250929231345_bitter_cake.sql`
2. `supabase/migrations/20250930111734_violet_valley.sql`
3. `supabase/migrations/20250930115029_restless_fog.sql`

Then create organizations:
```bash
# Run setup-organizations.sql in Supabase SQL Editor
```

### 4. Development

```bash
npm run dev
```

Visit `http://localhost:5173`

**✨ Organization Selector:** You'll see a list of organizations - click **"System Administration"** to access the super admin portal!

## 📁 Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (admin)/        # Admin dashboard routes
│   │   ├── (auth)/         # Authentication routes
│   │   ├── (member)/       # Member portal routes
│   │   └── api/            # API routes
│   ├── components/         # Reusable components
│   │   ├── ui/            # Base UI components
│   │   ├── forms/         # Form components
│   │   └── layout/        # Layout components
│   ├── lib/               # Utilities and configurations
│   │   ├── supabase/      # Supabase client and types
│   │   ├── email/         # Email service
│   │   ├── wallet/        # Digital wallet services
│   │   └── utils/         # Helper functions
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   └── middleware.ts      # Next.js middleware
├── supabase/
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge functions
├── docs/                  # Documentation
└── deployment/           # Deployment configurations
```

## 🏗 Architecture Overview

### Multi-Tenancy
The system uses subdomain-based multi-tenancy with complete data isolation:
- `org1.member.ringing.org.uk` - Organization 1
- `org2.member.ringing.org.uk` - Organization 2
- `admin.member.ringing.org.uk` - Super Admin

### Data Isolation
- Row Level Security (RLS) policies ensure complete data separation
- Each organization has independent user bases and configurations
- Shared infrastructure with isolated data access

### Authentication Flow
1. User visits organization subdomain
2. Middleware detects tenant from subdomain
3. Authentication scoped to organization
4. RLS policies enforce data access

## 🔧 Configuration

### Organization Setup
1. Super admin creates new organization
2. System generates subdomain
3. Organization admin configures branding
4. Members can register and access services

### Email Configuration
- Configure Resend API credentials
- Set up organization-specific email templates
- Configure SMTP settings for transactional emails

### Digital Wallet Setup
- Configure Google Wallet API credentials
- Set up Apple Wallet certificates
- Customize pass templates per organization

## 📚 Documentation

- [Database Setup](./docs/database-setup.md)
- [Deployment Guide](./docs/deployment.md)
- [API Documentation](./docs/api.md)
- [Digital Wallet Integration](./docs/wallet-integration.md)
- [Email System](./docs/email-system.md)

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
npm ci --production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name *.member.ringing.org.uk member.ringing.org.uk;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 🔒 Security

- Row Level Security (RLS) for data isolation
- JWT-based authentication
- HTTPS enforcement
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Security headers

## 📊 Monitoring

- Application performance monitoring
- Database performance tracking
- Email delivery monitoring
- Error tracking and alerting
- Uptime monitoring

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

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Integration with payment processors
- [ ] Multi-language support
- [ ] Advanced email automation
- [ ] API rate limiting improvements
- [ ] Enhanced security features