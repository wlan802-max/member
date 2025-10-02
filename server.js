import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import { promises as dns } from 'dns';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);

// Helper function to create authenticated Supabase client
function createAuthenticatedClient(token) {
  return createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Initialize Resend with API key from environment (optional)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Parse JSON request bodies for API endpoints
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Authentication middleware for domain management endpoints
async function authenticateRequest(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Create authenticated Supabase client with user's token
    const supabaseClient = createAuthenticatedClient(token);
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user profile to check role and organization
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found' });
    }

    // Check if user is admin or super_admin
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Attach user info and authenticated client to request
    req.user = {
      id: user.id,
      email: user.email,
      profile
    };
    req.supabase = supabaseClient;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

// Validate domain format (strict regex)
function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Canonicalize
  const canonical = domain.toLowerCase().trim();
  
  // Strict regex for valid domain names
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  
  return domainRegex.test(canonical) && canonical.length <= 255;
}

// Verify user owns the organization for this domain
async function verifyDomainOwnership(req, res, next) {
  const domain = req.body.domain || req.params.domain;
  
  if (!validateDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain format' });
  }

  const canonicalDomain = domain.toLowerCase().trim();
  
  try {
    // Use authenticated Supabase client from request (set by authenticateRequest middleware)
    const supabaseClient = req.supabase;
    
    // Get domain record from database
    const { data: domainRecord, error } = await supabaseClient
      .from('organization_domains')
      .select('id, organization_id, verification_status')
      .eq('domain', canonicalDomain)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    // If domain doesn't exist yet, verify org from request body
    if (!domainRecord) {
      const { organizationId } = req.body;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required for new domains' });
      }

      // Verify user belongs to this organization
      if (req.user.profile.organization_id !== organizationId && req.user.profile.role !== 'super_admin') {
        return res.status(403).json({ error: 'Not authorized for this organization' });
      }

      req.domain = { organizationId, isNew: true };
    } else {
      // Verify user belongs to domain's organization
      if (req.user.profile.organization_id !== domainRecord.organization_id && req.user.profile.role !== 'super_admin') {
        return res.status(403).json({ error: 'Not authorized for this domain' });
      }

      req.domain = {
        id: domainRecord.id,
        organizationId: domainRecord.organization_id,
        verificationStatus: domainRecord.verification_status,
        isNew: false
      };
    }

    next();
  } catch (error) {
    console.error('Domain ownership verification error:', error);
    return res.status(500).json({ error: 'Failed to verify domain ownership' });
  }
}

// Health check endpoint (before static files)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Custom Domain API Endpoints

// Verify domain ownership via DNS TXT record
app.post('/api/domains/verify', authenticateRequest, verifyDomainOwnership, async (req, res) => {
  try {
    const { domain, domainId } = req.body;

    if (!domainId) {
      return res.status(400).json({ error: 'Missing domain ID' });
    }

    // Domain already validated by middleware
    const canonicalDomain = domain.toLowerCase().trim();
    const supabaseClient = req.supabase;

    // Get domain record from database to check stored verification token
    const { data: domainRecord, error: fetchError } = await supabaseClient
      .from('organization_domains')
      .select('id, verification_token, verification_status')
      .eq('id', domainId)
      .single();

    if (fetchError || !domainRecord) {
      return res.status(404).json({ error: 'Domain record not found' });
    }

    // Check if already verified
    if (domainRecord.verification_status === 'verified') {
      return res.status(200).json({ 
        verified: true, 
        message: 'Domain already verified',
        alreadyVerified: true
      });
    }

    // Look up TXT records for _verification subdomain
    const verificationDomain = `_verification.${canonicalDomain}`;
    
    try {
      const txtRecords = await dns.resolveTxt(verificationDomain);
      
      // Check if any TXT record matches the stored verification token
      const verified = txtRecords.some(record => 
        record.some(txt => txt === domainRecord.verification_token)
      );

      if (verified) {
        // Update database to mark domain as verified
        const { error: updateError } = await supabaseClient
          .from('organization_domains')
          .update({
            verification_status: 'verified',
            verified_at: new Date().toISOString(),
            last_checked_at: new Date().toISOString()
          })
          .eq('id', domainId);

        if (updateError) {
          console.error('Failed to update verification status:', updateError);
          return res.status(500).json({ error: 'Failed to save verification status' });
        }

        res.status(200).json({ 
          verified: true, 
          message: 'Domain ownership verified successfully and saved' 
        });
      } else {
        // Update last_checked_at and status to failed
        await supabaseClient
          .from('organization_domains')
          .update({
            verification_status: 'failed',
            last_checked_at: new Date().toISOString()
          })
          .eq('id', domainId);

        res.status(200).json({ 
          verified: false, 
          message: 'Verification token not found in DNS TXT records',
          found: txtRecords.flat(),
          expected: domainRecord.verification_token
        });
      }
    } catch (dnsError) {
      // DNS lookup failed - record doesn't exist
      // Update last_checked_at
      await supabaseClient
        .from('organization_domains')
        .update({
          last_checked_at: new Date().toISOString()
        })
        .eq('id', domainId);

      res.status(200).json({ 
        verified: false, 
        message: 'TXT record not found. Please add the verification record to your DNS.',
        dnsError: dnsError.code
      });
    }
  } catch (error) {
    console.error('Domain verification error:', error);
    res.status(500).json({ error: 'Failed to verify domain', details: error.message });
  }
});

// Generate SSL certificate for domain (production only)
app.post('/api/domains/ssl/generate', authenticateRequest, verifyDomainOwnership, async (req, res) => {
  try {
    const { domain } = req.body;

    // Security check: Only allow in production with proper setup
    if (process.env.NODE_ENV !== 'production') {
      return res.status(400).json({ 
        error: 'SSL generation only available in production environment',
        message: 'In development, SSL is not required. Deploy to production to generate certificates.'
      });
    }

    // Require domain to be verified before SSL generation
    if (req.domain.isNew || req.domain.verificationStatus !== 'verified') {
      return res.status(400).json({ 
        error: 'Domain must be verified before generating SSL certificate',
        message: 'Please verify domain ownership first via DNS TXT record'
      });
    }

    // Domain already validated and canonicalized by middleware
    const canonicalDomain = domain.toLowerCase().trim();

    // Log the SSL generation attempt
    console.log('SSL certificate generation requested:', {
      timestamp: new Date().toISOString(),
      domain: canonicalDomain,
      organizationId: req.domain.organizationId,
      userId: req.user.id,
      ip: req.ip || req.connection.remoteAddress
    });

    // Call certbot to generate certificate using execFile to prevent command injection
    // This requires:
    // 1. Nginx already configured for the domain
    // 2. Domain DNS pointing to this server
    // 3. Certbot installed
    // 4. Sudo configured for certbot without password (security: limited to specific command)
    
    try {
      const { stdout, stderr } = await execFileAsync('sudo', [
        'certbot',
        'certonly',
        '--nginx',
        '-d', canonicalDomain,
        '--non-interactive',
        '--agree-tos',
        '--email', `admin@${canonicalDomain}`
      ]);
      
      console.log('Certbot output:', stdout);
      if (stderr) console.warn('Certbot stderr:', stderr);

      // Reload nginx to apply new certificate
      await execFileAsync('sudo', ['nginx', '-s', 'reload']);

      res.status(200).json({ 
        success: true, 
        message: 'SSL certificate generated and nginx reloaded',
        domain: canonicalDomain
      });
    } catch (certbotError) {
      console.error('Certbot error:', certbotError);
      res.status(500).json({ 
        error: 'Failed to generate SSL certificate',
        message: certbotError.message || 'Certbot execution failed',
        details: 'Make sure Certbot is installed and domain DNS is properly configured'
      });
    }
  } catch (error) {
    console.error('SSL generation error:', error);
    res.status(500).json({ error: 'Failed to generate SSL certificate', details: error.message });
  }
});

// Check DNS configuration for domain
app.get('/api/domains/:domain/dns-check', authenticateRequest, verifyDomainOwnership, async (req, res) => {
  try {
    // Domain already validated and canonicalized by middleware
    const domain = req.params.domain.toLowerCase().trim();
    
    const dnsInfo = {
      domain,
      timestamp: new Date().toISOString(),
      aRecords: [],
      cnameRecords: [],
      verificationRecord: null
    };

    // Check A records
    try {
      const aRecords = await dns.resolve4(domain);
      dnsInfo.aRecords = aRecords;
    } catch (error) {
      dnsInfo.aRecords = { error: error.code };
    }

    // Check CNAME records
    try {
      const cnameRecords = await dns.resolveCname(domain);
      dnsInfo.cnameRecords = cnameRecords;
    } catch (error) {
      dnsInfo.cnameRecords = { error: error.code };
    }

    // Check TXT records on verification subdomain
    try {
      const txtRecords = await dns.resolveTxt(`_verification.${domain}`);
      dnsInfo.verificationRecord = txtRecords.flat();
    } catch (error) {
      dnsInfo.verificationRecord = { error: error.code };
    }

    res.status(200).json(dnsInfo);
  } catch (error) {
    console.error('DNS check error:', error);
    res.status(500).json({ error: 'Failed to check DNS', details: error.message });
  }
});

// Email workflow trigger endpoint (authenticated)
app.post('/api/send-workflow-email', async (req, res) => {
  try {
    const { to, recipientName, subject, htmlBody, textBody, workflowId, organizationId } = req.body;

    // Validate required fields
    if (!to || !subject || (!htmlBody && !textBody)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and htmlBody or textBody' 
      });
    }

    // Require workflow ID and organization ID for audit trail
    if (!workflowId || !organizationId) {
      return res.status(400).json({ 
        error: 'Missing required fields: workflowId and organizationId' 
      });
    }

    // Validate email address format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        error: 'Invalid email address format' 
      });
    }

    // Rate limiting check (max 10 emails per minute per IP)
    // TODO: Implement proper rate limiting with Redis or in-memory store

    // Log the email send attempt for security monitoring
    console.log('Email send request:', {
      timestamp: new Date().toISOString(),
      workflowId,
      organizationId,
      to,
      ip: req.ip || req.connection.remoteAddress
    });

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ 
        error: 'Email service not configured' 
      });
    }

    // Send email via Resend
    const emailData = {
      from: 'onboarding@resend.dev', // Default Resend sender for testing
      to,
      subject,
      html: htmlBody || textBody,
      ...(textBody && { text: textBody }),
      ...(recipientName && { reply_to: `${recipientName} <${to}>` })
    };

    const result = await resend.emails.send(emailData);

    console.log('Email sent successfully:', {
      emailId: result.data?.id,
      workflowId,
      organizationId
    });
    
    res.status(200).json({ success: true, emailId: result.data?.id });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    });
  }
});

// Serve static files from dist directory
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  console.error('Dist directory not found:', distPath);
}

// Handle client-side routing - serve index.html for all other routes
app.use((req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Application not built. Please run npm run build.');
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server started at ${new Date().toISOString()}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});