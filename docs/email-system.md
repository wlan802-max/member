# Email System Documentation

This guide covers the comprehensive email system implementation using Resend API for transactional emails and campaign management.

## Overview

The email system provides:
- **Transactional Emails**: Welcome emails, renewal reminders, notifications
- **Campaign Management**: Bulk email campaigns with analytics
- **Subscriber Management**: Mailing list management with segmentation
- **Template System**: Reusable email templates with personalization
- **Analytics**: Delivery tracking, open rates, click tracking
- **Automation**: Automated renewal workflows and drip campaigns

## Resend API Integration

### Setup

#### 1. Environment Configuration

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_APP_URL=https://member.ringing.org.uk
```

#### 2. Resend Client Setup

Create `src/lib/email/resend-client.ts`:

```typescript
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
  tags?: { name: string; value: string }[];
  headers?: Record<string, string>;
}

export interface BulkEmailOptions {
  from: string;
  subject: string;
  html: string;
  text?: string;
  to: Array<{
    email: string;
    name?: string;
  }>;
  tags?: { name: string; value: string }[];
}

export class EmailService {
  private defaultFrom: string;

  constructor(organizationDomain?: string) {
    this.defaultFrom = organizationDomain 
      ? `noreply@${organizationDomain}`
      : 'noreply@member.ringing.org.uk';
  }

  async sendEmail(options: EmailOptions) {
    try {
      const result = await resend.emails.send({
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        reply_to: options.reply_to,
        tags: options.tags,
        headers: options.headers,
      });

      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendBulkEmails(options: BulkEmailOptions) {
    try {
      const emails = options.to.map(recipient => ({
        from: options.from,
        to: [recipient.email],
        subject: options.subject,
        html: this.personalizeContent(options.html, recipient),
        text: options.text ? this.personalizeContent(options.text, recipient) : undefined,
        tags: options.tags,
      }));

      const result = await resend.batch.send(emails);
      return result;
    } catch (error) {
      console.error('Failed to send bulk emails:', error);
      throw error;
    }
  }

  private personalizeContent(content: string, recipient: { email: string; name?: string }): string {
    return content
      .replace(/\{\{name\}\}/g, recipient.name || recipient.email.split('@')[0])
      .replace(/\{\{email\}\}/g, recipient.email);
  }

  async createContact(email: string, firstName?: string, lastName?: string) {
    try {
      const result = await resend.contacts.create({
        email,
        firstName,
        lastName,
        unsubscribed: false,
      });
      return result;
    } catch (error) {
      console.error('Failed to create contact:', error);
      throw error;
    }
  }

  async removeContact(email: string) {
    try {
      const result = await resend.contacts.remove({ email });
      return result;
    } catch (error) {
      console.error('Failed to remove contact:', error);
      throw error;
    }
  }
}
```

## Email Templates

### Template System

Create `src/lib/email/templates/index.ts`:

```typescript
export interface TemplateData {
  [key: string]: any;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailTemplateService {
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates() {
    // Welcome email template
    this.templates.set('welcome', {
      subject: 'Welcome to {{organizationName}}!',
      html: this.getWelcomeHtmlTemplate(),
      text: this.getWelcomeTextTemplate(),
    });

    // Renewal reminder template
    this.templates.set('renewal_reminder', {
      subject: 'Membership Renewal Reminder - {{organizationName}}',
      html: this.getRenewalReminderHtmlTemplate(),
      text: this.getRenewalReminderTextTemplate(),
    });

    // Membership confirmation template
    this.templates.set('membership_confirmation', {
      subject: 'Membership Confirmed - {{organizationName}}',
      html: this.getMembershipConfirmationHtmlTemplate(),
      text: this.getMembershipConfirmationTextTemplate(),
    });

    // Password reset template
    this.templates.set('password_reset', {
      subject: 'Reset Your Password - {{organizationName}}',
      html: this.getPasswordResetHtmlTemplate(),
      text: this.getPasswordResetTextTemplate(),
    });
  }

  getTemplate(templateId: string): EmailTemplate | null {
    return this.templates.get(templateId) || null;
  }

  renderTemplate(templateId: string, data: TemplateData): EmailTemplate | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    return {
      subject: this.interpolate(template.subject, data),
      html: this.interpolate(template.html, data),
      text: this.interpolate(template.text, data),
    };
  }

  private interpolate(template: string, data: TemplateData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private getWelcomeHtmlTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{organizationName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: {{primaryColor}}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to {{organizationName}}!</h1>
        </div>
        <div class="content">
            <h2>Hello {{memberName}},</h2>
            <p>Welcome to {{organizationName}}! We're excited to have you as a member.</p>
            
            <p>Your membership details:</p>
            <ul>
                <li><strong>Membership Year:</strong> {{membershipYear}}</li>
                <li><strong>Membership Type:</strong> {{membershipType}}</li>
                <li><strong>Valid Until:</strong> {{expiryDate}}</li>
            </ul>
            
            <p>You can access your member portal and digital membership card using the link below:</p>
            <a href="{{memberPortalUrl}}" class="button">Access Member Portal</a>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>The {{organizationName}} Team</p>
        </div>
        <div class="footer">
            <p>{{organizationName}}<br>
            {{organizationAddress}}<br>
            <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  private getWelcomeTextTemplate(): string {
    return `
Welcome to {{organizationName}}!

Hello {{memberName}},

Welcome to {{organizationName}}! We're excited to have you as a member.

Your membership details:
- Membership Year: {{membershipYear}}
- Membership Type: {{membershipType}}
- Valid Until: {{expiryDate}}

You can access your member portal and digital membership card at:
{{memberPortalUrl}}

If you have any questions, please don't hesitate to contact us.

Best regards,
The {{organizationName}} Team

{{organizationName}}
{{organizationAddress}}

Unsubscribe: {{unsubscribeUrl}}
`;
  }

  private getRenewalReminderHtmlTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Membership Renewal Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: {{primaryColor}}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Membership Renewal Reminder</h1>
        </div>
        <div class="content">
            <h2>Hello {{memberName}},</h2>
            
            <div class="warning">
                <strong>Your membership expires in {{daysUntilExpiry}} days!</strong>
            </div>
            
            <p>Your {{organizationName}} membership is set to expire on {{expiryDate}}. Don't miss out on your member benefits!</p>
            
            <p>Current membership details:</p>
            <ul>
                <li><strong>Membership Year:</strong> {{currentMembershipYear}}</li>
                <li><strong>Membership Type:</strong> {{membershipType}}</li>
                <li><strong>Expires:</strong> {{expiryDate}}</li>
            </ul>
            
            <p>Renew now for {{renewalYear}} to continue enjoying:</p>
            <ul>
                {{#each benefits}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
            
            <a href="{{renewalUrl}}" class="button">Renew Membership</a>
            
            <p>Questions about renewal? Contact us at {{contactEmail}} or {{contactPhone}}.</p>
            
            <p>Best regards,<br>The {{organizationName}} Team</p>
        </div>
        <div class="footer">
            <p>{{organizationName}}<br>
            {{organizationAddress}}<br>
            <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  private getRenewalReminderTextTemplate(): string {
    return `
Membership Renewal Reminder

Hello {{memberName}},

Your membership expires in {{daysUntilExpiry}} days!

Your {{organizationName}} membership is set to expire on {{expiryDate}}. Don't miss out on your member benefits!

Current membership details:
- Membership Year: {{currentMembershipYear}}
- Membership Type: {{membershipType}}
- Expires: {{expiryDate}}

Renew now for {{renewalYear}} to continue enjoying all member benefits.

Renew your membership: {{renewalUrl}}

Questions about renewal? Contact us at {{contactEmail}} or {{contactPhone}}.

Best regards,
The {{organizationName}} Team

{{organizationName}}
{{organizationAddress}}

Unsubscribe: {{unsubscribeUrl}}
`;
  }

  private getMembershipConfirmationHtmlTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Membership Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: {{primaryColor}}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Membership Confirmed!</h1>
        </div>
        <div class="content">
            <h2>Hello {{memberName}},</h2>
            
            <div class="success">
                <strong>Your membership has been confirmed!</strong>
            </div>
            
            <p>Thank you for renewing your membership with {{organizationName}}. Your membership is now active.</p>
            
            <p>Membership details:</p>
            <ul>
                <li><strong>Membership Year:</strong> {{membershipYear}}</li>
                <li><strong>Membership Type:</strong> {{membershipType}}</li>
                <li><strong>Valid From:</strong> {{startDate}}</li>
                <li><strong>Valid Until:</strong> {{expiryDate}}</li>
                <li><strong>Payment Reference:</strong> {{paymentReference}}</li>
            </ul>
            
            <p>Your digital membership card is ready:</p>
            <a href="{{digitalCardUrl}}" class="button">Get Digital Card</a>
            
            <p>You can access your member portal anytime:</p>
            <a href="{{memberPortalUrl}}" class="button">Member Portal</a>
            
            <p>Thank you for being a valued member!</p>
            
            <p>Best regards,<br>The {{organizationName}} Team</p>
        </div>
        <div class="footer">
            <p>{{organizationName}}<br>
            {{organizationAddress}}<br>
            <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  private getMembershipConfirmationTextTemplate(): string {
    return `
Membership Confirmed!

Hello {{memberName}},

Your membership has been confirmed!

Thank you for renewing your membership with {{organizationName}}. Your membership is now active.

Membership details:
- Membership Year: {{membershipYear}}
- Membership Type: {{membershipType}}
- Valid From: {{startDate}}
- Valid Until: {{expiryDate}}
- Payment Reference: {{paymentReference}}

Get your digital membership card: {{digitalCardUrl}}
Access your member portal: {{memberPortalUrl}}

Thank you for being a valued member!

Best regards,
The {{organizationName}} Team

{{organizationName}}
{{organizationAddress}}

Unsubscribe: {{unsubscribeUrl}}
`;
  }

  private getPasswordResetHtmlTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: {{primaryColor}}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
        </div>
        <div class="content">
            <h2>Hello {{memberName}},</h2>
            
            <p>We received a request to reset your password for your {{organizationName}} account.</p>
            
            <p>Click the button below to reset your password:</p>
            <a href="{{resetUrl}}" class="button">Reset Password</a>
            
            <div class="warning">
                <strong>This link will expire in 24 hours.</strong>
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>For security reasons, this link can only be used once.</p>
            
            <p>If you have any questions, please contact us at {{contactEmail}}.</p>
            
            <p>Best regards,<br>The {{organizationName}} Team</p>
        </div>
        <div class="footer">
            <p>{{organizationName}}<br>
            {{organizationAddress}}</p>
        </div>
    </div>
</body>
</html>`;
  }

  private getPasswordResetTextTemplate(): string {
    return `
Reset Your Password

Hello {{memberName}},

We received a request to reset your password for your {{organizationName}} account.

Reset your password using this link: {{resetUrl}}

This link will expire in 24 hours.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

For security reasons, this link can only be used once.

If you have any questions, please contact us at {{contactEmail}}.

Best regards,
The {{organizationName}} Team

{{organizationName}}
{{organizationAddress}}
`;
  }
}
```

## Campaign Management

### Campaign Service

Create `src/lib/email/campaign-service.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { EmailService } from './resend-client';
import { EmailTemplateService } from './templates';

export interface CampaignData {
  name: string;
  subject: string;
  content: string;
  template_id?: string;
  recipient_list: string | string[];
  scheduled_at?: string;
  organization_id: string;
  created_by: string;
}

export interface CampaignRecipient {
  email: string;
  first_name?: string;
  last_name?: string;
  metadata?: Record<string, any>;
}

export class EmailCampaignService {
  private supabase = createClient();
  private emailService: EmailService;
  private templateService: EmailTemplateService;

  constructor(organizationDomain?: string) {
    this.emailService = new EmailService(organizationDomain);
    this.templateService = new EmailTemplateService();
  }

  async createCampaign(campaignData: CampaignData) {
    const { data: campaign, error } = await this.supabase
      .from('email_campaigns')
      .insert({
        name: campaignData.name,
        subject: campaignData.subject,
        content: campaignData.content,
        template_id: campaignData.template_id,
        status: campaignData.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: campaignData.scheduled_at,
        organization_id: campaignData.organization_id,
        created_by: campaignData.created_by,
      })
      .select()
      .single();

    if (error) throw error;

    // Calculate recipient count
    const recipients = await this.getRecipients(campaignData.recipient_list, campaignData.organization_id);
    
    await this.supabase
      .from('email_campaigns')
      .update({ recipient_count: recipients.length })
      .eq('id', campaign.id);

    return { ...campaign, recipient_count: recipients.length };
  }

  async sendCampaign(campaignId: string) {
    // Get campaign details
    const { data: campaign, error: campaignError } = await this.supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Campaign cannot be sent in current status');
    }

    // Update campaign status
    await this.supabase
      .from('email_campaigns')
      .update({ 
        status: 'sending',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    try {
      // Get recipients
      const recipients = await this.getRecipients(
        campaign.recipient_list || 'all_members',
        campaign.organization_id
      );

      // Get organization details for branding
      const { data: organization } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', campaign.organization_id)
        .single();

      // Send emails in batches
      const batchSize = 100;
      let deliveredCount = 0;
      let bouncedCount = 0;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        try {
          const emailData = {
            from: `${organization?.name || 'Organization'} <noreply@${organization?.domain || 'member.ringing.org.uk'}>`,
            subject: campaign.subject,
            html: this.personalizeContent(campaign.content, organization),
            to: batch.map(r => ({ email: r.email, name: r.first_name })),
            tags: [
              { name: 'campaign_id', value: campaignId },
              { name: 'organization_id', value: campaign.organization_id }
            ]
          };

          const result = await this.emailService.sendBulkEmails(emailData);
          deliveredCount += batch.length;

        } catch (error) {
          console.error('Batch send failed:', error);
          bouncedCount += batch.length;
        }

        // Add delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update campaign with final stats
      await this.supabase
        .from('email_campaigns')
        .update({
          status: 'sent',
          delivered_count: deliveredCount,
          bounced_count: bouncedCount,
        })
        .eq('id', campaignId);

      return {
        campaignId,
        totalRecipients: recipients.length,
        delivered: deliveredCount,
        bounced: bouncedCount,
      };

    } catch (error) {
      // Update campaign status to failed
      await this.supabase
        .from('email_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaignId);

      throw error;
    }
  }

  private async getRecipients(recipientList: string | string[], organizationId: string): Promise<CampaignRecipient[]> {
    if (Array.isArray(recipientList)) {
      // Custom email list
      return recipientList.map(email => ({ email }));
    }

    // Predefined recipient lists
    switch (recipientList) {
      case 'all_members':
        const { data: allMembers } = await this.supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('organization_id', organizationId)
          .eq('is_active', true);
        return allMembers || [];

      case 'active_members':
        const { data: activeMembers } = await this.supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .in('id', 
            this.supabase
              .from('memberships')
              .select('profile_id')
              .eq('status', 'active')
              .gte('end_date', new Date().toISOString().split('T')[0])
          );
        return activeMembers || [];

      case 'expired_members':
        const { data: expiredMembers } = await this.supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .in('id',
            this.supabase
              .from('memberships')
              .select('profile_id')
              .eq('status', 'expired')
              .lt('end_date', new Date().toISOString().split('T')[0])
          );
        return expiredMembers || [];

      case 'subscribers':
        const { data: subscribers } = await this.supabase
          .from('email_subscribers')
          .select('email, first_name, last_name')
          .eq('organization_id', organizationId)
          .eq('status', 'subscribed');
        return subscribers || [];

      default:
        return [];
    }
  }

  private personalizeContent(content: string, organization: any): string {
    return content
      .replace(/\{\{organizationName\}\}/g, organization?.name || 'Organization')
      .replace(/\{\{organizationAddress\}\}/g, this.formatAddress(organization?.address))
      .replace(/\{\{primaryColor\}\}/g, organization?.primary_color || '#3B82F6')
      .replace(/\{\{secondaryColor\}\}/g, organization?.secondary_color || '#1E40AF')
      .replace(/\{\{contactEmail\}\}/g, organization?.contact_email || 'contact@example.com')
      .replace(/\{\{contactPhone\}\}/g, organization?.contact_phone || '');
  }

  private formatAddress(address: any): string {
    if (!address) return '';
    
    const parts = [
      address.street,
      address.city,
      address.postcode,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  async getCampaignAnalytics(campaignId: string) {
    const { data: campaign, error } = await this.supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      throw new Error('Campaign not found');
    }

    // Calculate rates
    const openRate = campaign.recipient_count > 0 
      ? campaign.opened_count / campaign.recipient_count 
      : 0;
    
    const clickRate = campaign.opened_count > 0 
      ? campaign.clicked_count / campaign.opened_count 
      : 0;
    
    const bounceRate = campaign.recipient_count > 0 
      ? campaign.bounced_count / campaign.recipient_count 
      : 0;

    return {
      campaign_id: campaignId,
      total_sent: campaign.recipient_count,
      delivered: campaign.delivered_count,
      bounced: campaign.bounced_count,
      opened: campaign.opened_count,
      clicked: campaign.clicked_count,
      open_rate: openRate,
      click_rate: clickRate,
      bounce_rate: bounceRate,
      sent_at: campaign.sent_at,
    };
  }

  async scheduleCampaign(campaignId: string, scheduledAt: string) {
    const { data: campaign, error } = await this.supabase
      .from('email_campaigns')
      .update({
        scheduled_at: scheduledAt,
        status: 'scheduled'
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }

  async cancelCampaign(campaignId: string) {
    const { data: campaign, error } = await this.supabase
      .from('email_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }
}
```

## Renewal Automation

### Renewal Workflow Service

Create `src/lib/email/renewal-service.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { EmailService } from './resend-client';
import { EmailTemplateService } from './templates';

export interface RenewalWorkflow {
  id: string;
  name: string;
  renewal_period_start: string;
  renewal_period_end: string;
  reminder_schedule: ReminderConfig[];
  is_active: boolean;
}

export interface ReminderConfig {
  days_before_expiry: number;
  email_template: string;
  subject: string;
}

export class RenewalWorkflowService {
  private supabase = createClient();
  private emailService: EmailService;
  private templateService: EmailTemplateService;

  constructor(organizationDomain?: string) {
    this.emailService = new EmailService(organizationDomain);
    this.templateService = new EmailTemplateService();
  }

  async processRenewalReminders() {
    // Get all active renewal workflows
    const { data: workflows, error } = await this.supabase
      .from('renewal_workflows')
      .select('*')
      .eq('is_active', true);

    if (error || !workflows) {
      console.error('Failed to fetch renewal workflows:', error);
      return;
    }

    for (const workflow of workflows) {
      await this.processWorkflowReminders(workflow);
    }
  }

  private async processWorkflowReminders(workflow: RenewalWorkflow) {
    const currentDate = new Date();
    
    for (const reminder of workflow.reminder_schedule) {
      const targetDate = new Date();
      targetDate.setDate(currentDate.getDate() + reminder.days_before_expiry);

      // Get members whose memberships expire on the target date
      const candidates = await this.getRenewalCandidates(
        workflow.id,
        targetDate.toISOString().split('T')[0]
      );

      for (const candidate of candidates) {
        await this.sendRenewalReminder(candidate, reminder, workflow);
      }
    }
  }

  private async getRenewalCandidates(workflowId: string, expiryDate: string) {
    const { data: candidates, error } = await this.supabase
      .rpc('get_renewal_candidates', {
        p_workflow_id: workflowId,
        p_expiry_date: expiryDate
      });

    if (error) {
      console.error('Failed to get renewal candidates:', error);
      return [];
    }

    return candidates || [];
  }

  private async sendRenewalReminder(candidate: any, reminder: ReminderConfig, workflow: RenewalWorkflow) {
    try {
      // Get organization details
      const { data: organization } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', candidate.organization_id)
        .single();

      if (!organization) return;

      // Prepare template data
      const templateData = {
        memberName: `${candidate.first_name} ${candidate.last_name}`,
        organizationName: organization.name,
        currentMembershipYear: candidate.current_membership_year,
        membershipType: candidate.membership_type,
        expiryDate: new Date(candidate.expiry_date).toLocaleDateString(),
        daysUntilExpiry: reminder.days_before_expiry,
        renewalYear: new Date().getFullYear() + 1,
        renewalUrl: `https://${organization.domain}/renew?token=${candidate.renewal_token}`,
        contactEmail: organization.contact_email,
        contactPhone: organization.contact_phone,
        organizationAddress: this.formatAddress(organization.address),
        primaryColor: organization.primary_color,
        secondaryColor: organization.secondary_color,
        unsubscribeUrl: `https://${organization.domain}/unsubscribe?email=${candidate.email}`,
        benefits: [
          'Access to all events and activities',
          'Monthly newsletter and updates',
          'Digital membership card',
          'Member-only discounts and offers'
        ]
      };

      // Render email template
      const renderedTemplate = this.templateService.renderTemplate(
        reminder.email_template,
        templateData
      );

      if (!renderedTemplate) {
        console.error('Failed to render email template:', reminder.email_template);
        return;
      }

      // Send email
      await this.emailService.sendEmail({
        to: candidate.email,
        from: `${organization.name} <noreply@${organization.domain}>`,
        subject: renderedTemplate.subject,
        html: renderedTemplate.html,
        text: renderedTemplate.text,
        tags: [
          { name: 'type', value: 'renewal_reminder' },
          { name: 'workflow_id', value: workflow.id },
          { name: 'days_before_expiry', value: reminder.days_before_expiry.toString() }
        ]
      });

      // Log the reminder
      await this.supabase
        .from('renewal_reminder_logs')
        .insert({
          workflow_id: workflow.id,
          profile_id: candidate.profile_id,
          reminder_type: `${reminder.days_before_expiry}_days`,
          sent_at: new Date().toISOString(),
          email_address: candidate.email
        });

      console.log(`Renewal reminder sent to ${candidate.email} (${reminder.days_before_expiry} days)`);

    } catch (error) {
      console.error('Failed to send renewal reminder:', error);
    }
  }

  private formatAddress(address: any): string {
    if (!address) return '';
    
    const parts = [
      address.street,
      address.city,
      address.postcode,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  async createRenewalWorkflow(organizationId: string, workflowData: {
    name: string;
    renewal_period_start: string;
    renewal_period_end: string;
    reminder_schedule: ReminderConfig[];
  }) {
    const { data: workflow, error } = await this.supabase
      .from('renewal_workflows')
      .insert({
        organization_id: organizationId,
        name: workflowData.name,
        renewal_period_start: workflowData.renewal_period_start,
        renewal_period_end: workflowData.renewal_period_end,
        reminder_schedule: workflowData.reminder_schedule,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return workflow;
  }

  async updateRenewalWorkflow(workflowId: string, updates: Partial<RenewalWorkflow>) {
    const { data: workflow, error } = await this.supabase
      .from('renewal_workflows')
      .update(updates)
      .eq('id', workflowId)
      .select()
      .single();

    if (error) throw error;
    return workflow;
  }

  async sendManualRenewalReminder(profileId: string, reminderType: string) {
    // Get profile and membership details
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select(`
        *,
        organizations!inner(*),
        memberships!inner(*)
      `)
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Get active renewal workflow
    const { data: workflow } = await this.supabase
      .from('renewal_workflows')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single();

    if (!workflow) {
      throw new Error('No active renewal workflow found');
    }

    // Find reminder configuration
    const reminderConfig = workflow.reminder_schedule.find(
      (r: ReminderConfig) => `${r.days_before_expiry}_days` === reminderType
    );

    if (!reminderConfig) {
      throw new Error('Reminder configuration not found');
    }

    // Send reminder
    await this.sendRenewalReminder(
      {
        ...profile,
        current_membership_year: profile.memberships[0]?.membership_year,
        membership_type: profile.memberships[0]?.membership_type,
        expiry_date: profile.memberships[0]?.end_date,
        renewal_token: 'manual_' + Date.now()
      },
      reminderConfig,
      workflow
    );
  }
}
```

## Webhook Handling

### Resend Webhooks

Create `src/app/api/webhooks/resend/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('resend-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET!;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    
    await handleResendWebhook(event);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleResendWebhook(event: any) {
  const supabase = createClient();
  
  switch (event.type) {
    case 'email.delivered':
      await updateCampaignStats(supabase, event.data, 'delivered');
      break;
      
    case 'email.opened':
      await updateCampaignStats(supabase, event.data, 'opened');
      break;
      
    case 'email.clicked':
      await updateCampaignStats(supabase, event.data, 'clicked');
      break;
      
    case 'email.bounced':
      await updateCampaignStats(supabase, event.data, 'bounced');
      await handleBounce(supabase, event.data);
      break;
      
    case 'email.complained':
      await handleComplaint(supabase, event.data);
      break;
      
    default:
      console.log('Unhandled webhook event:', event.type);
  }
}

async function updateCampaignStats(supabase: any, data: any, eventType: string) {
  const campaignId = data.tags?.campaign_id;
  if (!campaignId) return;

  const field = `${eventType}_count`;
  
  await supabase.rpc('increment_campaign_stat', {
    campaign_id: campaignId,
    stat_field: field
  });
}

async function handleBounce(supabase: any, data: any) {
  // Mark email as bounced in subscribers table
  await supabase
    .from('email_subscribers')
    .update({ 
      status: 'bounced',
      updated_at: new Date().toISOString()
    })
    .eq('email', data.to);
}

async function handleComplaint(supabase: any, data: any) {
  // Mark email as unsubscribed due to complaint
  await supabase
    .from('email_subscribers')
    .update({ 
      status: 'unsubscribed',
      unsubscription_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('email', data.to);
}
```

## Scheduled Jobs

### Cron Jobs for Email Automation

Create `src/lib/cron/email-jobs.ts`:

```typescript
import { RenewalWorkflowService } from '@/lib/email/renewal-service';
import { EmailCampaignService } from '@/lib/email/campaign-service';
import { createClient } from '@/lib/supabase/server';

export async function processScheduledEmails() {
  console.log('Processing scheduled emails...');
  
  const supabase = createClient();
  
  // Get scheduled campaigns that should be sent now
  const { data: campaigns, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString());

  if (error) {
    console.error('Failed to fetch scheduled campaigns:', error);
    return;
  }

  for (const campaign of campaigns || []) {
    try {
      const campaignService = new EmailCampaignService();
      await campaignService.sendCampaign(campaign.id);
      console.log(`Sent scheduled campaign: ${campaign.name}`);
    } catch (error) {
      console.error(`Failed to send campaign ${campaign.id}:`, error);
    }
  }
}

export async function processRenewalReminders() {
  console.log('Processing renewal reminders...');
  
  try {
    const renewalService = new RenewalWorkflowService();
    await renewalService.processRenewalReminders();
    console.log('Renewal reminders processed successfully');
  } catch (error) {
    console.error('Failed to process renewal reminders:', error);
  }
}

// Run every hour
export async function runEmailJobs() {
  await processScheduledEmails();
  await processRenewalReminders();
}
```

### API Endpoint for Cron Jobs

Create `src/app/api/cron/email/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { runEmailJobs } from '@/lib/cron/email-jobs';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = request.nextUrl.searchParams.get('secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runEmailJobs();
    return NextResponse.json({ success: true, message: 'Email jobs completed' });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}
```

## Frontend Components

### Campaign Management Dashboard

Create `src/components/email/CampaignDashboard.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Calendar, Users, TrendingUp } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduled_at?: string;
  sent_at?: string;
  recipient_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
}

export function CampaignDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/email/campaigns');
      const result = await response.json();
      setCampaigns(result.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      scheduled: 'secondary',
      sending: 'default',
      sent: 'default',
      cancelled: 'destructive'
    };

    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const calculateOpenRate = (campaign: Campaign) => {
    if (campaign.recipient_count === 0) return 0;
    return ((campaign.opened_count / campaign.recipient_count) * 100).toFixed(1);
  };

  const calculateClickRate = (campaign: Campaign) => {
    if (campaign.opened_count === 0) return 0;
    return ((campaign.clicked_count / campaign.opened_count) * 100).toFixed(1);
  };

  if (loading) {
    return <div>Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Email Campaigns</h1>
        <Button>
          <Mail className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent This Month</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.recipient_count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.length > 0 
                ? (campaigns.reduce((sum, c) => sum + parseFloat(calculateOpenRate(c)), 0) / campaigns.length).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{campaign.name}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <p className="text-sm text-gray-600">{campaign.subject}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{campaign.recipient_count} recipients</span>
                    {campaign.status === 'sent' && (
                      <>
                        <span>{calculateOpenRate(campaign)}% open rate</span>
                        <span>{calculateClickRate(campaign)}% click rate</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {campaign.status === 'draft' && (
                    <Button size="sm" variant="outline">
                      <Send className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  )}
                  {campaign.status === 'scheduled' && (
                    <Button size="sm" variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      Scheduled
                    </Button>
                  )}
                  <Button size="sm" variant="ghost">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Testing

### Email Service Tests

```typescript
// test/email/email-service.test.ts
import { EmailService } from '@/lib/email/resend-client';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService('test.member.ringing.org.uk');
  });

  test('should send single email', async () => {
    const result = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
      text: 'Test content'
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  test('should send bulk emails', async () => {
    const result = await emailService.sendBulkEmails({
      from: 'test@test.member.ringing.org.uk',
      subject: 'Bulk Test',
      html: '<p>Hello {{name}}</p>',
      to: [
        { email: 'user1@example.com', name: 'User One' },
        { email: 'user2@example.com', name: 'User Two' }
      ]
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });
});
```

This completes the comprehensive email system documentation. The implementation provides a robust foundation for transactional emails, campaign management, and automated renewal workflows with proper analytics and monitoring capabilities.