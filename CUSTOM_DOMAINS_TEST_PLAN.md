# Custom Domains Testing Plan

This document outlines the complete testing plan for the custom domains feature. Follow these tests to ensure the feature works correctly in production.

## Prerequisites

Before testing, ensure:
- [ ] Supabase database is set up
- [ ] Migration files have been run:
  - `supabase_migration_membership_features.sql`
  - `supabase_migration_custom_domains.sql`
- [ ] Application deployed using `deploy.sh`
- [ ] You have access to a domain you can configure (for DNS testing)
- [ ] Server has Certbot installed
- [ ] Ports 80 and 443 are open

## Test 1: Database Schema

**Objective**: Verify the `organization_domains` table exists with correct structure

**Steps**:
1. Connect to your Supabase database
2. Run: `SELECT * FROM organization_domains LIMIT 1;`
3. Verify columns exist:
   - `id` (uuid, primary key)
   - `organization_id` (uuid, foreign key to organizations)
   - `domain` (text, unique, lowercase)
   - `verification_token` (text, unique)
   - `verification_status` (text: pending/verified/failed)
   - `is_primary` (boolean)
   - `ssl_status` (text: pending/issued/failed/expired)
   - `verified_at` (timestamptz, nullable)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

**Expected Result**: ✅ Table exists with all columns

## Test 2: Admin UI - Add Domain

**Objective**: Verify admin can add a custom domain via UI

**Steps**:
1. Login as organization admin
2. Navigate to **Dashboard → Settings**
3. Scroll to "Custom Domains" section
4. Click "Add Domain" button
5. Enter test domain (e.g., `test-example.com`)
6. Click "Add Domain"

**Expected Results**:
- ✅ Modal appears with domain input
- ✅ DNS setup instructions shown
- ✅ Success message after adding
- ✅ Domain appears in list with status "pending"
- ✅ Verification token is displayed
- ✅ DNS setup instructions show correct TXT record

**Error Cases to Test**:
- Invalid domain format (should show error)
- Duplicate domain (should show error)
- Empty domain (should prevent submission)

## Test 3: Database Verification

**Objective**: Verify domain was saved to database correctly

**Steps**:
1. After adding domain in UI, run SQL query:
   ```sql
   SELECT domain, verification_token, verification_status, ssl_status, is_primary
   FROM organization_domains
   WHERE domain = 'test-example.com';
   ```

**Expected Results**:
- ✅ Domain exists in database
- ✅ Domain is lowercase (even if entered with capitals)
- ✅ `verification_token` is a unique UUID
- ✅ `verification_status` = 'pending'
- ✅ `ssl_status` = 'pending'
- ✅ `is_primary` = false (unless it's the first domain)

## Test 4: DNS Configuration

**Objective**: Configure DNS correctly for domain verification

**Steps**:
1. In your DNS provider, add:
   - **A Record**: 
     - Name: `@` (or your domain)
     - Value: Your server IP
     - TTL: 3600
   
   - **TXT Record**:
     - Name: `_verification.test-example.com`
     - Value: `[verification token from UI]`
     - TTL: 3600

2. Wait for DNS propagation (5-10 minutes)
3. Verify DNS records:
   ```bash
   dig test-example.com A
   dig _verification.test-example.com TXT
   ```

**Expected Results**:
- ✅ A record points to your server
- ✅ TXT record contains verification token

## Test 5: Domain Verification (UI)

**Objective**: Verify domain via admin UI

**Steps**:
1. In Custom Domains section, find your domain
2. Click "Verify" button
3. Wait for verification check

**Expected Results**:
- ✅ Success message: "Domain verified successfully!"
- ✅ Domain status badge changes to "verified" (green)
- ✅ "Verify" button disappears
- ✅ "Generate SSL" button appears

**Error Cases**:
- DNS not propagated yet → Should show error message
- Wrong TXT record → Should show "verification failed"

## Test 6: Domain Verification (Backend)

**Objective**: Verify backend API correctly checks DNS

**Steps**:
1. Check database after verification:
   ```sql
   SELECT verification_status, verified_at
   FROM organization_domains
   WHERE domain = 'test-example.com';
   ```

**Expected Results**:
- ✅ `verification_status` = 'verified'
- ✅ `verified_at` has current timestamp

## Test 7: Nginx Configuration

**Objective**: Generate Nginx configuration for custom domain

**Steps**:
1. SSH into your server
2. Run: `sudo manage-custom-domain add test-example.com`
3. Check output for success messages
4. Verify files:
   ```bash
   ls -l /etc/nginx/sites-available/membership-system-test-example.com
   ls -l /etc/nginx/sites-enabled/membership-system-test-example.com
   ```
5. Test Nginx config: `sudo nginx -t`
6. Visit `http://test-example.com` in browser

**Expected Results**:
- ✅ Config file created in sites-available
- ✅ Symlink created in sites-enabled
- ✅ Nginx config test passes
- ✅ Nginx reloaded successfully
- ✅ Website accessible via `http://test-example.com`
- ✅ Application loads correctly (login page or dashboard)

## Test 8: SSL Certificate Generation

**Objective**: Generate SSL certificate and enable HTTPS

**Steps**:
1. Run: `sudo manage-custom-domain ssl test-example.com`
2. Wait for Certbot to complete (30-60 seconds)
3. Verify certificate:
   ```bash
   sudo certbot certificates -d test-example.com
   ```
4. Visit `https://test-example.com` in browser

**Expected Results**:
- ✅ Certbot succeeds without errors
- ✅ Certificate issued by Let's Encrypt
- ✅ Nginx configuration updated with HTTPS block
- ✅ HTTP redirects to HTTPS
- ✅ Valid SSL certificate in browser (green lock icon)
- ✅ No SSL warnings

**Error Cases to Test**:
- DNS not pointing to server → Certbot fails with clear error
- Port 80/443 blocked → Certbot fails
- Domain not verified first → Should see error in UI

## Test 9: SSL Status Update (UI)

**Objective**: Verify SSL status updates in admin UI

**Steps**:
1. After SSL generation, return to Custom Domains UI
2. Refresh the page or check domain status

**Expected Results**:
- ✅ SSL status badge shows "issued" (green)
- ✅ "Generate SSL" button disappears
- ✅ Domain shows both verified and SSL issued

## Test 10: Tenant Detection

**Objective**: Verify application loads correct organization for custom domain

**Steps**:
1. Visit `https://test-example.com` (your custom domain)
2. Open browser console (F12)
3. Check console logs for tenant detection
4. Verify the correct organization loads

**Expected Console Logs**:
```
Checking if hostname is a custom domain: test-example.com
Getting organization for custom domain: test-example.com
Found organization via custom domain: [organization object]
```

**Expected Results**:
- ✅ Console shows custom domain detection
- ✅ Correct organization loads automatically
- ✅ No organization selector shown (unless not logged in)
- ✅ Login page shows organization branding
- ✅ After login, dashboard shows correct organization data

## Test 11: Primary Domain

**Objective**: Test setting a domain as primary

**Steps**:
1. Add a second custom domain
2. Verify and generate SSL for it
3. Click "Set Primary" on the second domain
4. Check database:
   ```sql
   SELECT domain, is_primary
   FROM organization_domains
   WHERE organization_id = '[your-org-id]'
   ORDER BY is_primary DESC;
   ```

**Expected Results**:
- ✅ Second domain now has `is_primary = true`
- ✅ First domain has `is_primary = false`
- ✅ UI shows "Primary" badge on correct domain
- ✅ Only one domain can be primary at a time

## Test 12: Delete Domain

**Objective**: Test domain deletion

**Steps**:
1. Click "Delete" on a non-primary domain
2. Confirm deletion in modal
3. Check database to verify deletion
4. Verify Nginx config is NOT automatically removed (manual cleanup needed)

**Expected Results**:
- ✅ Confirmation modal appears
- ✅ Domain removed from database
- ✅ Domain removed from UI list
- ✅ Success message shown

**Note**: Nginx config and SSL certificates are NOT automatically removed for safety. Admin must manually run:
```bash
sudo manage-custom-domain remove test-example.com
sudo certbot delete --cert-name test-example.com
```

## Test 13: Multiple Organizations

**Objective**: Verify different organizations can have different custom domains

**Steps**:
1. Create/access second organization
2. Add different custom domain (e.g., `org2-example.com`)
3. Verify and configure SSL
4. Visit both domains in different browser tabs

**Expected Results**:
- ✅ Each domain loads its own organization
- ✅ No cross-contamination of data
- ✅ Each domain shows correct branding
- ✅ Sessions are isolated per organization

## Test 14: Error Handling

**Objective**: Test error scenarios

**Test Cases**:

### Invalid Domain Format
- Try: `http://example.com` → Should reject
- Try: `example.com/path` → Should reject  
- Try: `example com` (space) → Should reject
- Try: `EXAMPLE.COM` → Should accept and convert to lowercase

### DNS Issues
- Verify domain before DNS propagation → Should fail with clear message
- Wrong verification token → Should fail
- DNS timeout → Should handle gracefully

### SSL Issues
- Generate SSL before domain verification → Should be disabled
- DNS not pointing to server → Certbot should fail with clear error
- Rate limiting (too many requests) → Should show Let's Encrypt error

## Test 15: Security Testing

**Objective**: Verify security measures

**Test Cases**:

### Authentication
- Try to add domain without being logged in → Should require auth
- Try to add domain as non-admin → Should be blocked
- Try to access another org's domains → Should be prevented by RLS

### Domain Spoofing
- Try to verify domain you don't own → Should fail (no DNS access)
- Try to use existing domain → Should reject duplicate

### SQL Injection
- Try domain name with SQL: `'; DROP TABLE organizations; --` → Should sanitize

## Test 16: Performance Testing

**Objective**: Verify tenant detection performance

**Steps**:
1. Add 5-10 custom domains to different organizations
2. Visit each domain
3. Check browser console for query time
4. Monitor database query performance

**Expected Results**:
- ✅ Domain lookup is fast (<100ms)
- ✅ No N+1 query issues
- ✅ Proper database indexing (check execution plan)

## Test 17: SSL Auto-Renewal

**Objective**: Verify Certbot auto-renewal works for custom domains

**Steps**:
1. Check Certbot timer status:
   ```bash
   sudo systemctl status certbot.timer
   ```
2. Test renewal (dry run):
   ```bash
   sudo certbot renew --dry-run
   ```
3. Check renewal logs:
   ```bash
   sudo cat /var/log/letsencrypt/letsencrypt.log
   ```

**Expected Results**:
- ✅ Certbot timer is active and enabled
- ✅ Dry run succeeds for all domains
- ✅ Renewal scheduled correctly

## Test 18: Documentation Verification

**Objective**: Verify documentation is accurate and complete

**Steps**:
1. Follow `CUSTOM_DOMAINS_SETUP.md` step-by-step
2. Note any confusing or incorrect instructions
3. Verify all commands work as documented
4. Check all file paths are correct

**Expected Results**:
- ✅ All instructions are clear and accurate
- ✅ All commands execute successfully
- ✅ All file paths exist
- ✅ Screenshots/examples match actual UI

## Regression Testing

After any code changes, retest:
- [ ] Test 2: Add domain via UI
- [ ] Test 5: Domain verification
- [ ] Test 7: Nginx configuration
- [ ] Test 8: SSL generation
- [ ] Test 10: Tenant detection

## Known Limitations

Document any known issues:
- **Wildcard subdomains**: Not supported for custom domains (each subdomain needs separate entry)
- **SSL automation**: Requires manual command execution (not automated via UI for security reasons)
- **DNS propagation**: Can take up to 48 hours (usually 5-10 minutes)
- **Let's Encrypt rate limits**: 50 certificates per registered domain per week

## Test Results Template

Use this template to document test results:

```markdown
## Test Session: [Date]
**Tester**: [Name]
**Environment**: [Production/Staging]
**Version**: [Git commit hash]

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Database Schema | ✅ PASS | All columns present |
| 2 | Add Domain UI | ✅ PASS | |
| ... | ... | ... | ... |

**Issues Found**:
- [Issue description and steps to reproduce]

**Overall Status**: PASS/FAIL
```

## Production Deployment Checklist

Before deploying to production:
- [ ] All tests passed in staging
- [ ] Migration files reviewed and tested
- [ ] Backup database before running migrations
- [ ] SSL certificates can be obtained (test with one domain)
- [ ] DNS can be configured (verify with team)
- [ ] Monitoring configured for custom domains
- [ ] Documentation updated with production URLs
- [ ] Team trained on custom domain workflow
