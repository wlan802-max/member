import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DynamicFormRenderer } from '@/components/forms/DynamicFormRenderer';
import { FormSchema, MembershipType } from '@/lib/formSchema';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SignupFormEnhancedProps {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  logoUrl?: string | null;
  primaryColor?: string;
  onBackToLogin: () => void;
}

export function SignupFormEnhanced({
  organizationId,
  organizationName,
  organizationSlug,
  logoUrl,
  primaryColor,
  onBackToLogin
}: SignupFormEnhancedProps) {
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [schemaVersion, setSchemaVersion] = useState<number | null>(null);
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');

  const { signUp } = useAuth();

  useEffect(() => {
    loadFormData();
  }, [organizationId]);

  const waitForProfile = async (email: string, maxAttempts = 10): Promise<string | null> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (data && data.id) {
        return data.id;
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(1.5, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  };

  const loadFormData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [schemaResult, typesResult] = await Promise.all([
        supabase
          .from('organization_form_schemas')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('schema_version', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('organization_membership_types')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      ]);

      if (schemaResult.error) {
        console.error('Schema load error:', schemaResult.error);
        setError('Unable to load signup form. Please try again later.');
        return;
      }

      if (typesResult.error) {
        console.error('Membership types load error:', typesResult.error);
        setError('Unable to load membership types. Please try again later.');
        return;
      }

      setSchemaId(schemaResult.data.id);
      setSchemaVersion(schemaResult.data.schema_version);
      setFormSchema(schemaResult.data.schema_data as FormSchema);
      setMembershipTypes(typesResult.data as MembershipType[]);
    } catch (err) {
      console.error('Error loading form data:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (submittedData: {
    formData: any;
    selectedMemberships: string[];
    totalAmount: number;
  }) => {
    const { formData, selectedMemberships, totalAmount } = submittedData;

    const email = formData.email;
    const firstName = formData.first_name || formData.full_name?.split(' ')[0] || '';
    const lastName = formData.last_name || formData.full_name?.split(' ').slice(1).join(' ') || '';

    if (!email) {
      toast.error('Email is required');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (selectedMemberships.length === 0) {
      toast.error('Please select at least one membership type');
      return;
    }

    try {
      const { error: authError } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        organization_slug: organizationSlug
      });

      if (authError) {
        console.error('Signup error:', authError.message);
        toast.error(authError.message || 'Failed to create account. Please try again.');
        return;
      }

      toast.info('Creating your profile...');
      const profileId = await waitForProfile(email, 20);

      if (!profileId) {
        console.error('Profile creation timeout');
        toast.error('Profile creation is taking longer than expected. Please try again or contact support.');
        return;
      }

      const { error: responseError } = await supabase
        .from('profile_form_responses')
        .insert({
          profile_id: profileId,
          organization_id: organizationId,
          schema_id: schemaId,
          schema_version: schemaVersion,
          response_data: formData,
          selected_membership_types: selectedMemberships,
          total_amount: totalAmount
        });

      if (responseError) {
        console.error('Form response error:', responseError.message, responseError);
        toast.error('Failed to save your application. Please try again or contact support.');
        return;
      }

      // Trigger email workflows for signup (optional)
      try {
        const { data: workflows, error: workflowError } = await supabase
          .from('email_workflows')
          .select('*')
          .eq('organization_id', organizationId)
          .in('trigger_event', ['signup', 'both'])
          .eq('is_active', true);

        if (!workflowError && workflows && workflows.length > 0) {
          // Map membership IDs to human-readable names
          const membershipTypeNames = selectedMemberships
            .map(typeId => membershipTypes.find(mt => mt.id === typeId)?.name || typeId)
            .join(', ');

          // Trigger workflows (send to backend/edge function to process)
          for (const workflow of workflows) {
            try {
              // Add null checks for subject and template
              if (!workflow.email_subject || !workflow.email_template) {
                console.warn('Workflow missing subject or template:', workflow.id);
                continue;
              }

              // Replace template variables
              let subject = workflow.email_subject;
              let template = workflow.email_template;
              
              subject = subject
                .replace(/\{\{first_name\}\}/g, firstName)
                .replace(/\{\{last_name\}\}/g, lastName)
                .replace(/\{\{email\}\}/g, email)
                .replace(/\{\{membership_type\}\}/g, membershipTypeNames);
              
              template = template
                .replace(/\{\{first_name\}\}/g, firstName)
                .replace(/\{\{last_name\}\}/g, lastName)
                .replace(/\{\{email\}\}/g, email)
                .replace(/\{\{membership_type\}\}/g, membershipTypeNames);

              // Send email via backend API endpoint
              try {
                const response = await fetch('/api/send-workflow-email', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    to: workflow.recipient_email,
                    recipientName: workflow.recipient_name,
                    subject,
                    htmlBody: template,
                    textBody: template,
                    workflowId: workflow.id,
                    organizationId: organizationId
                  }),
                });

                if (response.ok) {
                  const result = await response.json();
                  console.log('Email sent successfully:', result.emailId);
                } else {
                  const error = await response.json();
                  console.error('Failed to send email:', error);
                }
              } catch (apiError) {
                // Log if API not available (e.g., during development with Vite dev server)
                console.log('Email API not available - workflow would send:', {
                  workflowId: workflow.id,
                  to: workflow.recipient_email,
                  subject
                });
              }
            } catch (err) {
              console.error('Error processing workflow:', workflow.id, err);
            }
          }
        }
      } catch (err) {
        console.error('Error triggering email workflows:', err);
        // Don't fail signup if email workflows fail
      }

      setSignupEmail(email);
      setSignupSuccess(true);
      toast.success('Account created successfully! Please check your email to verify your account.');
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading signup form...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onBackToLogin} variant="outline" className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formSchema || membershipTypes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Signup Unavailable</CardTitle>
            <CardDescription>
              This organization has not configured their signup form yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onBackToLogin} variant="outline" className="w-full" data-testid="button-back-to-login">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl">Account Created!</CardTitle>
            <CardDescription className="mt-4 text-base">
              We've sent a confirmation email to <strong>{signupEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-medium">Next steps:</p>
              <ol className="mt-2 list-decimal list-inside space-y-1">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the confirmation link in the email</li>
                <li>Your account is pending admin approval</li>
                <li>An admin will review and activate your membership</li>
              </ol>
            </div>
            <Button onClick={onBackToLogin} className="w-full" data-testid="button-back-to-login-success">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          {logoUrl && (
            <div className="flex justify-center mb-4">
              <img
                src={logoUrl}
                alt={organizationName}
                className="h-16 w-16 rounded-full object-cover"
              />
            </div>
          )}
          <CardTitle className="text-2xl" style={{ color: primaryColor }}>
            Join {organizationName}
          </CardTitle>
          <CardDescription>
            Complete the form below to create your membership account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-blue-900">Account Password</h4>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                data-testid="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter password (min. 6 characters)"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                data-testid="input-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <DynamicFormRenderer
            schema={formSchema}
            membershipTypes={membershipTypes}
            onSubmit={handleFormSubmit}
            submitLabel="Create Account"
          />

          <div className="text-center pt-4">
            <Button onClick={onBackToLogin} variant="link" data-testid="button-back-to-login">
              Already have an account? Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
