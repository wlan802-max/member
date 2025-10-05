# Security Fix: Member Approval Workflow

## Overview

This document describes a critical security fix that eliminates privilege escalation vulnerabilities in the member signup process and ensures all new members require admin approval before gaining access.

## Security Vulnerabilities Fixed

### 1. **Privilege Escalation via Client-Provided Role**
**Severity:** CRITICAL

**Problem:** The database trigger trusted client-provided `role` metadata during signup, allowing attackers to:
- Send `role='super_admin'` in signup request to gain full system access
- Send `role='admin'` to gain organization admin privileges
- Bypass all authorization checks

**Fix:** Database trigger now **completely ignores** client-provided role metadata and hardcodes all signups as `role='member'`.

### 2. **Auto-Activation Without Approval**
**Severity:** HIGH

**Problem:** New user profiles were created with `is_active=true` by default, granting immediate system access without admin review.

**Fix:** All new signups are created with `is_active=false` and `status='pending'`, requiring explicit admin approval.

### 3. **Missing Audit Trail**
**Severity:** MEDIUM

**Problem:** Admin approval/rejection actions were not tracked, making security audits impossible.

**Fix:** Approval workflow now tracks `status_updated_at` and `status_updated_by` for complete audit trail.

## Changes Applied

### Database Trigger (`fix_new_user_approval_flow.sql`)

#### Key Security Measures:

1. **Client Role Ignored** (Line 35):
   ```sql
   user_role := 'member';  -- ALWAYS member for regular signups
   ```
   - Client-provided role metadata is **completely ignored**
   - No way for client to escalate privileges

2. **Mandatory Organization Validation** (Lines 57-83):
   ```sql
   IF org_id IS NULL OR org_slug IS NULL OR org_slug = '' THEN
     -- Create LOCKED profile with role='member', is_active=false
   ```
   - All signups must have valid organization
   - Invalid/missing org creates locked account for manual review

3. **Secure Profile Creation** (Lines 103-105):
   ```sql
   role='member',        -- ALWAYS member (never trust client)
   is_active=false,      -- Requires admin approval
   status='pending'      -- Awaiting approval
   ```

#### Attack Scenarios Now Blocked:

❌ Attacker sends `role='super_admin'` → Ignored, creates pending member  
❌ Attacker omits org_slug → Creates locked pending member  
❌ Attacker provides invalid org_slug → Creates locked pending member  
❌ Any manipulation of signup metadata → Always creates pending member  

### Admin Approval Workflow (`MemberDashboard.tsx`)

#### Approval Function (Lines 1180-1215):
- Sets `status='active'` (not just is_active)
- Tracks `status_updated_at` timestamp
- Tracks `status_updated_by` admin user ID
- Creates complete audit trail

#### Rejection Function (Lines 1217-1252):
- Sets `status='rejected'`
- Tracks `status_updated_at` timestamp
- Tracks `status_updated_by` admin user ID
- Provides rejection audit trail

## Deployment Instructions

### Step 1: Apply Database Trigger

Run the SQL migration to replace the existing trigger:

```bash
# Connect to your Supabase project SQL editor
# Copy and paste contents of fix_new_user_approval_flow.sql
# Execute the script
```

The script will:
1. Drop the old `handle_new_user` trigger and function
2. Create new secure trigger that never trusts client role
3. Ensure all new signups are pending members

### Step 2: Verify Trigger Installation

Check that the trigger is installed:

```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Should return:
- `trigger_name`: on_auth_user_created
- `event_manipulation`: INSERT
- `event_object_table`: users

### Step 3: Test the Security Fix

#### Test 1: Regular Member Signup
```javascript
// Should create pending member
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123',
  options: {
    data: {
      organization_slug: 'valid-org',
      first_name: 'Test',
      last_name: 'User'
    }
  }
});
```

**Expected Result:**
- Profile created with `role='member'`
- `is_active=false`
- `status='pending'`
- Appears in admin "Pending Approvals" tab

#### Test 2: Privilege Escalation Attempt (Should Fail)
```javascript
// Attacker tries to become super admin
const { data, error } = await supabase.auth.signUp({
  email: 'hacker@example.com',
  password: 'password123',
  options: {
    data: {
      organization_slug: 'valid-org',
      role: 'super_admin',  // Malicious role
      first_name: 'Hacker',
      last_name: 'User'
    }
  }
});
```

**Expected Result:**
- Client-provided `role='super_admin'` is **IGNORED**
- Profile created with `role='member'` (forced by trigger)
- `is_active=false`
- `status='pending'`
- Cannot access system until admin approves

#### Test 3: Invalid Organization (Should Lock)
```javascript
// Missing org_slug
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123',
  options: {
    data: {
      first_name: 'Test',
      last_name: 'User'
      // organization_slug missing
    }
  }
});
```

**Expected Result:**
- Profile created with `organization_id=NULL`
- `role='member'`
- `is_active=false`
- `status='pending'`
- Locked for manual super admin review

### Step 4: Verify Admin Approval Workflow

1. Log in as organization admin
2. Navigate to Members tab
3. Switch to "Pending Approvals" tab
4. Click "Approve" on a pending member
5. Verify in database:

```sql
SELECT 
  email,
  role,
  is_active,
  status,
  status_updated_at,
  status_updated_by
FROM profiles
WHERE email = 'test@example.com';
```

**Expected Result:**
- `role='member'`
- `is_active=true`
- `status='active'`
- `status_updated_at` has timestamp
- `status_updated_by` has admin user ID

## Important Notes

### Super Admin Creation

This trigger now handles **ONLY** regular member signups. Creating super admins and organization admins must be done through separate server-controlled processes:

1. **Super Admin Bootstrap:**
   - Use Supabase SQL console or separate admin script
   - Directly insert into profiles table with `role='super_admin'`
   - Never through public signup endpoint

2. **Organization Admin Creation:**
   - Created during organization setup process
   - Use server-side RPC function with admin privileges
   - Not through regular signup flow

### Database Schema Requirements

The fix assumes these columns exist in `profiles` table:
- `status` (varchar) - 'pending', 'active', 'rejected'
- `status_updated_at` (timestamp)
- `status_updated_by` (uuid, foreign key to auth.users)
- `is_active` (boolean)

If missing, add them:

```sql
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES auth.users(id);
```

## Security Best Practices

### ✅ DO:
- Apply this trigger to production immediately
- Test signup flows after deployment
- Monitor logs for locked/invalid signups
- Regularly audit pending approvals
- Document super admin creation process

### ❌ DON'T:
- Trust client-provided role metadata
- Auto-activate members without approval
- Create super admins through signup endpoint
- Skip approval for "trusted" users
- Remove audit trail columns

## Verification Checklist

After deployment, verify:

- [ ] New signups create pending members only
- [ ] Privilege escalation attempts are blocked
- [ ] Invalid org signups are locked
- [ ] Admin approval sets status='active'
- [ ] Rejection sets status='rejected'
- [ ] Approval metadata is tracked
- [ ] Existing active members unaffected
- [ ] Super admin creation documented

## Rollback Plan

If issues arise, restore previous trigger:

```sql
-- Backup: Save current trigger
-- Restore: Re-apply previous version from git history
-- Test: Verify signup works
-- Investigate: Review logs for root cause
```

## Support

For questions or issues:
1. Check database logs for trigger errors
2. Verify organization_slug in signup metadata
3. Test with known valid organization
4. Review Supabase logs for auth errors

## Changelog

### 2024-10-05
- Initial security fix deployed
- Fixed privilege escalation via client role
- Added mandatory approval workflow
- Implemented audit trail tracking
