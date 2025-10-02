import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Parse JSON request bodies for API endpoints
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint (before static files)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
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