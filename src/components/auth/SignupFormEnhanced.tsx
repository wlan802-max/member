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

  const { signUp } = useAuth();

  useEffect(() => {
    loadFormData();
  }, [organizationId]);

  const waitForProfile = async (email: string, maxAttempts = 10): Promise<string | null> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { data, error } = await supabase
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
      const { data: authData, error: authError } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        organization_slug: organizationSlug
      });

      if (authError) {
        toast.error(authError.message);
        return;
      }

      toast.info('Creating your profile...');
      const profileId = await waitForProfile(email);

      if (!profileId) {
        console.error('Profile not found after retries');
        toast.error('Account created but profile not found. Please contact support.');
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
        console.error('Error saving form response:', responseError);
        toast.error('Account created but form data could not be saved.');
        return;
      }

      toast.success('Account created successfully! Awaiting admin approval.');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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
            <Button onClick={onBackToLogin} variant="outline" className="w-full">
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
