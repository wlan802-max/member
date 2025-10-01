# Multi-Tenant Membership Management System
## Technical Specification

### System Overview
A comprehensive membership management system for multiple organizations using subdomain-based multi-tenancy, deployed on Ubuntu/Debian servers with Supabase backend.

**Domain**: member.ringing.org.uk
**Architecture**: Next.js frontend with Supabase backend
**Multi-tenancy**: Subdomain-based routing with data isolation

### Technology Stack

#### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI / Radix UI
- **State Management**: React Query + Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

#### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Email**: Resend API
- **Digital Wallets**: Google Wallet API + Apple Wallet PassKit

#### Infrastructure
- **Server**: Ubuntu/Debian
- **Web Server**: Nginx
- **Process Manager**: PM2
- **SSL**: Let's Encrypt (Certbot)
- **Monitoring**: PM2 Monitoring + Custom health checks

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx)                    │
├─────────────────────────────────────────────────────────────┤
│  Subdomain Routing:                                         │
│  • org1.member.ringing.org.uk → Tenant: org1              │
│  • org2.member.ringing.org.uk → Tenant: org2              │
│  • admin.member.ringing.org.uk → Super Admin               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                      │
├─────────────────────────────────────────────────────────────┤
│  Middleware:                                                │
│  • Tenant Detection                                         │
│  • Authentication                                           │
│  • Authorization                                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
├─────────────────────────────────────────────────────────────┤
│  • PostgreSQL Database with RLS                            │
│  • Authentication & User Management                         │
│  • File Storage                                             │
│  • Real-time Subscriptions                                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
├─────────────────────────────────────────────────────────────┤
│  • Resend (Email Delivery)                                 │
│  • Google Wallet API                                        │
│  • Apple Wallet PassKit                                     │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Data Model

#### Core Entities
1. **Organizations** - Tenant isolation
2. **Users** - Organization-specific members
3. **Memberships** - Annual membership records
4. **Digital Cards** - Wallet-compatible membership cards
5. **Email Campaigns** - Organization mailing lists
6. **Renewal Workflows** - Automated renewal processes

#### Row Level Security (RLS)
All tables implement RLS policies to ensure complete data isolation between organizations.

### Key Features

#### 1. Multi-Tenant Architecture
- Subdomain-based tenant detection
- Complete data isolation using RLS
- Organization-specific branding and configuration
- Independent admin panels per organization

#### 2. User Management
- Organization-specific user registration
- Role-based access control (member, admin, super-admin)
- Secure authentication with Supabase Auth
- Profile management and preferences

#### 3. Membership Management
- Annual membership cycles
- Configurable renewal periods
- Automated renewal notifications
- Payment tracking and history

#### 4. Digital Membership Cards
- Google Wallet integration
- Apple Wallet integration
- QR code generation for verification
- Organization branding and customization
- Automatic expiry date management

#### 5. Email Campaign System
- Resend API integration
- Mailing list management
- Campaign creation and scheduling
- Email templates and personalization
- Delivery tracking and analytics

#### 6. Admin Dashboard
- Organization management
- Member management
- Campaign management
- Analytics and reporting
- System configuration

### Security Implementation

#### Authentication & Authorization
- JWT-based authentication via Supabase
- Role-based access control (RBAC)
- Multi-factor authentication support
- Session management and security

#### Data Protection
- Row Level Security (RLS) for tenant isolation
- Data encryption at rest and in transit
- GDPR compliance features
- Audit logging for sensitive operations

#### API Security
- Rate limiting
- CORS configuration
- Input validation and sanitization
- SQL injection prevention

### Performance Considerations

#### Database Optimization
- Proper indexing strategy
- Query optimization
- Connection pooling
- Read replicas for scaling

#### Caching Strategy
- Redis for session storage
- CDN for static assets
- Application-level caching
- Database query caching

#### Monitoring & Logging
- Application performance monitoring
- Error tracking and alerting
- Database performance monitoring
- Security event logging

### Deployment Strategy

#### Server Requirements
- Ubuntu 20.04+ or Debian 11+
- Node.js 18+
- Nginx
- PM2
- SSL certificates

#### CI/CD Pipeline
- Automated testing
- Build optimization
- Zero-downtime deployments
- Rollback capabilities

#### Backup & Recovery
- Automated database backups
- File storage backups
- Disaster recovery procedures
- Data retention policies

### Integration Specifications

#### Resend Email API
- Transactional emails
- Bulk email campaigns
- Email templates
- Delivery webhooks
- Analytics integration

#### Digital Wallet APIs
- Google Wallet Pass creation
- Apple Wallet Pass generation
- QR code integration
- Pass updates and notifications
- Branding customization

### Testing Strategy

#### Unit Testing
- Component testing with Jest
- API endpoint testing
- Database function testing
- Utility function testing

#### Integration Testing
- End-to-end user flows
- API integration testing
- Email delivery testing
- Wallet integration testing

#### Performance Testing
- Load testing
- Stress testing
- Database performance testing
- API response time testing

### Maintenance & Support

#### Regular Maintenance
- Security updates
- Dependency updates
- Database maintenance
- Performance optimization

#### Monitoring & Alerting
- Uptime monitoring
- Performance monitoring
- Error rate monitoring
- Security event monitoring

#### Support Procedures
- Issue tracking
- Bug reporting
- Feature requests
- User support documentation