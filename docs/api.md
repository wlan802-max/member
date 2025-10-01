# API Documentation

This document provides comprehensive API documentation for the multi-tenant membership management system.

## Base URL

```
https://member.ringing.org.uk/api
```

## Authentication

The API uses JWT-based authentication via Supabase Auth. Include the authorization header in all authenticated requests:

```
Authorization: Bearer <jwt_token>
```

## Multi-Tenant Context

All API requests are automatically scoped to the organization based on the subdomain:
- `bellringers.member.ringing.org.uk` → Organization: bellringers
- `towerbells.member.ringing.org.uk` → Organization: towerbells

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## Rate Limiting

- General API: 100 requests per minute per IP
- Authentication endpoints: 10 requests per minute per IP
- Email sending: 50 requests per hour per organization

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Organizations API

### Get Current Organization

```http
GET /api/organizations/current
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Bell Ringers Association",
    "slug": "bellringers",
    "domain": "bellringers.member.ringing.org.uk",
    "logo_url": "https://...",
    "primary_color": "#3B82F6",
    "secondary_color": "#1E40AF",
    "contact_email": "admin@bellringers.org",
    "contact_phone": "+44 123 456 7890",
    "address": {
      "street": "123 Bell Tower Lane",
      "city": "London",
      "postcode": "SW1A 1AA",
      "country": "UK"
    },
    "settings": {
      "membership_year_start": "04-01",
      "membership_year_end": "03-31",
      "default_membership_type": "standard",
      "enable_digital_cards": true,
      "enable_email_campaigns": true
    }
  }
}
```

### Update Organization

```http
PUT /api/organizations/current
```

**Request Body:**
```json
{
  "name": "Updated Organization Name",
  "logo_url": "https://new-logo-url.com/logo.png",
  "primary_color": "#FF6B6B",
  "contact_email": "new-admin@org.com",
  "settings": {
    "membership_year_start": "01-01",
    "membership_year_end": "12-31"
  }
}
```

**Permissions:** Organization admin or super admin

## Users & Profiles API

### Get Current User Profile

```http
GET /api/profiles/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "organization_id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+44 123 456 7890",
    "address": {
      "street": "456 Member Street",
      "city": "London",
      "postcode": "SW1A 2BB",
      "country": "UK"
    },
    "role": "member",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### Update User Profile

```http
PUT /api/profiles/me
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+44 987 654 3210",
  "address": {
    "street": "789 New Address",
    "city": "Manchester",
    "postcode": "M1 1AA",
    "country": "UK"
  }
}
```

### List Organization Members

```http
GET /api/profiles?page=1&limit=20&search=john&role=member&status=active
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by name or email
- `role` (optional): Filter by role (member, admin)
- `status` (optional): Filter by status (active, inactive)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "member@example.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "role": "member",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "current_membership": {
        "id": "uuid",
        "status": "active",
        "membership_year": 2024,
        "end_date": "2025-03-31"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Permissions:** Organization admin or super admin

### Create Member

```http
POST /api/profiles
```

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "first_name": "New",
  "last_name": "Member",
  "phone": "+44 123 456 7890",
  "role": "member",
  "send_welcome_email": true
}
```

**Permissions:** Organization admin or super admin

### Update Member

```http
PUT /api/profiles/:id
```

**Request Body:**
```json
{
  "first_name": "Updated",
  "last_name": "Name",
  "role": "admin",
  "is_active": false
}
```

**Permissions:** Organization admin or super admin

## Memberships API

### Get User Memberships

```http
GET /api/memberships/me?year=2024
```

**Query Parameters:**
- `year` (optional): Filter by membership year

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "membership_year": 2024,
      "start_date": "2024-04-01",
      "end_date": "2025-03-31",
      "status": "active",
      "membership_type": "standard",
      "amount_paid": 50.00,
      "payment_date": "2024-03-15T10:00:00Z",
      "payment_reference": "PAY-2024-001",
      "benefits": [
        "Access to all events",
        "Monthly newsletter",
        "Digital membership card"
      ],
      "digital_cards": [
        {
          "id": "uuid",
          "card_type": "google_wallet",
          "pass_url": "https://pay.google.com/gp/v/save/...",
          "is_active": true
        },
        {
          "id": "uuid",
          "card_type": "apple_wallet",
          "pass_url": "https://example.com/passes/...",
          "is_active": true
        }
      ]
    }
  ]
}
```

### List Organization Memberships

```http
GET /api/memberships?page=1&limit=20&year=2024&status=active&search=john
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `year`: Filter by membership year
- `status`: Filter by status (active, expired, cancelled, pending)
- `search`: Search by member name or email

**Permissions:** Organization admin or super admin

### Create Membership

```http
POST /api/memberships
```

**Request Body:**
```json
{
  "profile_id": "uuid",
  "membership_year": 2024,
  "start_date": "2024-04-01",
  "end_date": "2025-03-31",
  "membership_type": "premium",
  "amount_paid": 75.00,
  "payment_reference": "PAY-2024-002",
  "benefits": [
    "Access to all events",
    "Priority booking",
    "Digital membership card"
  ],
  "generate_digital_cards": true
}
```

**Permissions:** Organization admin or super admin

### Update Membership

```http
PUT /api/memberships/:id
```

**Request Body:**
```json
{
  "status": "active",
  "amount_paid": 50.00,
  "payment_date": "2024-03-15T10:00:00Z",
  "payment_reference": "PAY-2024-001-UPDATED"
}
```

**Permissions:** Organization admin or super admin

### Renew Membership

```http
POST /api/memberships/:id/renew
```

**Request Body:**
```json
{
  "membership_year": 2025,
  "membership_type": "standard",
  "amount_paid": 55.00,
  "payment_reference": "PAY-2025-001"
}
```

**Permissions:** Organization admin or super admin

## Digital Cards API

### Get Membership Digital Cards

```http
GET /api/digital-cards/membership/:membershipId
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "card_type": "google_wallet",
      "card_id": "google_wallet_id",
      "pass_url": "https://pay.google.com/gp/v/save/...",
      "qr_code_data": "https://member.ringing.org.uk/verify/...",
      "is_active": true,
      "issued_at": "2024-04-01T00:00:00Z",
      "expires_at": "2025-03-31T23:59:59Z"
    }
  ]
}
```

### Generate Digital Card

```http
POST /api/digital-cards
```

**Request Body:**
```json
{
  "membership_id": "uuid",
  "card_type": "google_wallet"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "card_type": "google_wallet",
    "pass_url": "https://pay.google.com/gp/v/save/...",
    "qr_code_data": "https://member.ringing.org.uk/verify/..."
  }
}
```

**Permissions:** Organization admin or super admin

### Verify Digital Card

```http
GET /api/digital-cards/verify/:token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "membership": {
      "member_name": "John Doe",
      "organization": "Bell Ringers Association",
      "membership_year": 2024,
      "status": "active",
      "expires_at": "2025-03-31"
    }
  }
}
```

**Note:** This endpoint is public and doesn't require authentication

## Email Campaigns API

### List Email Campaigns

```http
GET /api/email/campaigns?page=1&limit=20&status=sent
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status (draft, scheduled, sending, sent, cancelled)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Monthly Newsletter - March 2024",
      "subject": "March Newsletter: Upcoming Events",
      "status": "sent",
      "scheduled_at": "2024-03-01T09:00:00Z",
      "sent_at": "2024-03-01T09:05:00Z",
      "recipient_count": 150,
      "delivered_count": 148,
      "opened_count": 89,
      "clicked_count": 23,
      "bounced_count": 2,
      "created_at": "2024-02-28T15:00:00Z"
    }
  ]
}
```

**Permissions:** Organization admin or super admin

### Create Email Campaign

```http
POST /api/email/campaigns
```

**Request Body:**
```json
{
  "name": "Welcome Campaign",
  "subject": "Welcome to our organization!",
  "content": "<html><body><h1>Welcome!</h1><p>Thank you for joining us.</p></body></html>",
  "template_id": "welcome_template",
  "recipient_list": "all_members", // or "active_members", "expired_members", or array of email addresses
  "scheduled_at": "2024-04-01T10:00:00Z" // optional, if not provided, campaign is saved as draft
}
```

**Permissions:** Organization admin or super admin

### Send Campaign

```http
POST /api/email/campaigns/:id/send
```

**Request Body:**
```json
{
  "send_immediately": true // or provide scheduled_at timestamp
}
```

**Permissions:** Organization admin or super admin

### Get Campaign Analytics

```http
GET /api/email/campaigns/:id/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaign_id": "uuid",
    "total_sent": 150,
    "delivered": 148,
    "bounced": 2,
    "opened": 89,
    "clicked": 23,
    "unsubscribed": 1,
    "open_rate": 0.601,
    "click_rate": 0.155,
    "bounce_rate": 0.013,
    "delivery_timeline": [
      {
        "timestamp": "2024-03-01T09:05:00Z",
        "delivered": 50
      }
    ],
    "engagement_timeline": [
      {
        "timestamp": "2024-03-01T09:30:00Z",
        "opens": 15,
        "clicks": 3
      }
    ]
  }
}
```

**Permissions:** Organization admin or super admin

## Email Subscribers API

### List Subscribers

```http
GET /api/email/subscribers?page=1&limit=20&status=subscribed&search=john
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status (subscribed, unsubscribed, bounced)
- `search`: Search by email or name
- `tags`: Filter by tags (comma-separated)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "subscriber@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "status": "subscribed",
      "subscription_date": "2024-01-15T10:00:00Z",
      "tags": ["member", "newsletter"],
      "metadata": {
        "source": "website_signup",
        "preferences": {
          "newsletter": true,
          "events": true,
          "reminders": false
        }
      }
    }
  ]
}
```

**Permissions:** Organization admin or super admin

### Add Subscriber

```http
POST /api/email/subscribers
```

**Request Body:**
```json
{
  "email": "newsubscriber@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "tags": ["member", "newsletter"],
  "metadata": {
    "source": "admin_import"
  }
}
```

**Permissions:** Organization admin or super admin

### Update Subscriber

```http
PUT /api/email/subscribers/:id
```

**Request Body:**
```json
{
  "first_name": "Updated",
  "last_name": "Name",
  "tags": ["member", "newsletter", "events"],
  "status": "subscribed"
}
```

**Permissions:** Organization admin or super admin

### Bulk Import Subscribers

```http
POST /api/email/subscribers/bulk-import
```

**Request Body:**
```json
{
  "subscribers": [
    {
      "email": "user1@example.com",
      "first_name": "User",
      "last_name": "One",
      "tags": ["member"]
    },
    {
      "email": "user2@example.com",
      "first_name": "User",
      "last_name": "Two",
      "tags": ["member", "newsletter"]
    }
  ],
  "update_existing": true // Whether to update existing subscribers
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 2,
    "updated": 0,
    "skipped": 0,
    "errors": []
  }
}
```

**Permissions:** Organization admin or super admin

## Renewal Workflows API

### List Renewal Workflows

```http
GET /api/renewals/workflows
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "2024 Membership Renewal",
      "renewal_period_start": "2024-04-01",
      "renewal_period_end": "2025-03-31",
      "reminder_schedule": [
        {
          "days_before_expiry": 60,
          "email_template": "renewal_reminder_60",
          "subject": "Membership Renewal - 2 Months Remaining"
        },
        {
          "days_before_expiry": 30,
          "email_template": "renewal_reminder_30",
          "subject": "Membership Renewal - 1 Month Remaining"
        },
        {
          "days_before_expiry": 7,
          "email_template": "renewal_reminder_7",
          "subject": "Membership Renewal - 1 Week Remaining"
        }
      ],
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Permissions:** Organization admin or super admin

### Create Renewal Workflow

```http
POST /api/renewals/workflows
```

**Request Body:**
```json
{
  "name": "2025 Membership Renewal",
  "renewal_period_start": "2025-04-01",
  "renewal_period_end": "2026-03-31",
  "reminder_schedule": [
    {
      "days_before_expiry": 60,
      "email_template": "renewal_reminder_60",
      "subject": "Time to Renew Your Membership!"
    }
  ],
  "email_template_id": "renewal_form_template"
}
```

**Permissions:** Organization admin or super admin

### Get Renewal Candidates

```http
GET /api/renewals/candidates?year=2024&status=pending
```

**Query Parameters:**
- `year`: Renewal year
- `status`: Filter by renewal status (pending, completed, overdue)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "profile_id": "uuid",
      "email": "member@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "last_membership_end": "2024-03-31",
      "days_since_expiry": 15,
      "renewal_status": "pending",
      "reminders_sent": 2,
      "last_reminder_sent": "2024-03-15T10:00:00Z"
    }
  ]
}
```

**Permissions:** Organization admin or super admin

### Send Renewal Reminders

```http
POST /api/renewals/send-reminders
```

**Request Body:**
```json
{
  "workflow_id": "uuid",
  "reminder_type": "60_days", // or "30_days", "7_days", "overdue"
  "profile_ids": ["uuid1", "uuid2"] // optional, if not provided, sends to all eligible members
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": 25,
    "failed": 1,
    "skipped": 3,
    "errors": [
      {
        "profile_id": "uuid",
        "error": "Invalid email address"
      }
    ]
  }
}
```

**Permissions:** Organization admin or super admin

## Analytics API

### Organization Dashboard Stats

```http
GET /api/analytics/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "members": {
      "total": 250,
      "active": 230,
      "new_this_month": 15,
      "growth_rate": 0.065
    },
    "memberships": {
      "current_year": 220,
      "renewal_rate": 0.88,
      "pending_renewals": 25,
      "overdue": 5
    },
    "digital_cards": {
      "total_issued": 440,
      "google_wallet": 280,
      "apple_wallet": 160,
      "active": 420
    },
    "email_campaigns": {
      "sent_this_month": 3,
      "average_open_rate": 0.65,
      "average_click_rate": 0.12,
      "total_subscribers": 245
    }
  }
}
```

**Permissions:** Organization admin or super admin

### Membership Analytics

```http
GET /api/analytics/memberships?year=2024&period=monthly
```

**Query Parameters:**
- `year`: Analysis year
- `period`: Grouping period (daily, weekly, monthly, yearly)

**Response:**
```json
{
  "success": true,
  "data": {
    "membership_trends": [
      {
        "period": "2024-01",
        "new_memberships": 45,
        "renewals": 180,
        "cancellations": 5,
        "net_growth": 40
      }
    ],
    "membership_types": {
      "standard": 180,
      "premium": 40,
      "student": 30
    },
    "renewal_patterns": {
      "early_renewals": 120,
      "on_time_renewals": 80,
      "late_renewals": 20
    }
  }
}
```

**Permissions:** Organization admin or super admin

## Webhooks API

### List Webhooks

```http
GET /api/webhooks
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "url": "https://your-app.com/webhooks/membership",
      "events": ["membership.created", "membership.renewed", "membership.expired"],
      "is_active": true,
      "secret": "whsec_...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Permissions:** Organization admin or super admin

### Create Webhook

```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/membership",
  "events": ["membership.created", "membership.renewed"],
  "description": "Membership events webhook"
}
```

**Permissions:** Organization admin or super admin

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `ORGANIZATION_NOT_FOUND` | Organization not found for subdomain |
| `MEMBERSHIP_EXISTS` | Membership already exists for this year |
| `INVALID_MEMBERSHIP_YEAR` | Invalid membership year |
| `EMAIL_SEND_FAILED` | Failed to send email |
| `DIGITAL_CARD_GENERATION_FAILED` | Failed to generate digital card |
| `PAYMENT_REQUIRED` | Payment required for this action |
| `SUBSCRIPTION_EXPIRED` | Organization subscription expired |

## Webhook Events

The system sends webhooks for the following events:

### Membership Events
- `membership.created` - New membership created
- `membership.updated` - Membership details updated
- `membership.renewed` - Membership renewed
- `membership.expired` - Membership expired
- `membership.cancelled` - Membership cancelled

### User Events
- `user.created` - New user registered
- `user.updated` - User profile updated
- `user.deactivated` - User account deactivated

### Email Events
- `email.campaign_sent` - Email campaign sent
- `email.delivered` - Email delivered
- `email.opened` - Email opened
- `email.clicked` - Email link clicked
- `email.bounced` - Email bounced
- `email.unsubscribed` - User unsubscribed

### Digital Card Events
- `digital_card.created` - Digital card generated
- `digital_card.updated` - Digital card updated
- `digital_card.verified` - Digital card verified

## SDK and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @membership-system/sdk
```

```typescript
import { MembershipClient } from '@membership-system/sdk';

const client = new MembershipClient({
  baseUrl: 'https://bellringers.member.ringing.org.uk/api',
  apiKey: 'your-api-key'
});

// Get current user profile
const profile = await client.profiles.me();

// Create membership
const membership = await client.memberships.create({
  profile_id: 'uuid',
  membership_year: 2024,
  // ...
});
```

This completes the API documentation. The API provides comprehensive functionality for managing multi-tenant membership systems with proper authentication, authorization, and data isolation.