import { useState } from 'react';
import { FormSchema, FormField, MembershipType } from '@/lib/formSchema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface DynamicFormRendererProps {
  schema: FormSchema;
  membershipTypes: MembershipType[];
  onSubmit: (data: any) => Promise<void>;
  submitLabel?: string;
}

export function DynamicFormRenderer({ 
  schema, 
  membershipTypes, 
  onSubmit,
  submitLabel = 'Submit' 
}: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<any>({});
  const [selectedMemberships, setSelectedMemberships] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (fieldId: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    schema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required) {
          const value = formData[field.id];
          
          if (field.type === 'checkbox') {
            if (!value) {
              newErrors[field.id] = `${field.label} is required`;
            }
          } else if (field.type === 'membership_selection') {
            if (selectedMemberships.length === 0) {
              newErrors[field.id] = 'Please select at least one membership type';
            }
          } else if (!value || (typeof value === 'string' && value.trim() === '')) {
            newErrors[field.id] = `${field.label} is required`;
          }
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotal = (): number => {
    const membershipTotal = selectedMemberships.reduce((sum, id) => {
      const membership = membershipTypes.find(m => m.id === id);
      return sum + (membership?.price || 0);
    }, 0);

    const donation = parseFloat(formData.donation_amount || '0');
    return membershipTotal + donation;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        formData,
        selectedMemberships,
        totalAmount: calculateTotal()
      });
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMembership = (membershipId: string, allowMultiple: boolean) => {
    if (allowMultiple) {
      setSelectedMemberships((prev) =>
        prev.includes(membershipId)
          ? prev.filter((id) => id !== membershipId)
          : [...prev, membershipId]
      );
    } else {
      setSelectedMemberships([membershipId]);
    }
  };

  const renderField = (field: FormField) => {
    const error = errors[field.id];
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.id}
              data-testid={`input-${field.id}`}
              type={field.type}
              value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Textarea
              id={field.id}
              data-testid={`textarea-${field.id}`}
              value={value}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Select
              value={value}
              onValueChange={(val: string) => updateField(field.id, val)}
            >
              <SelectTrigger data-testid={`select-${field.id}`} className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={field.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start space-x-2">
            <Checkbox
              id={field.id}
              data-testid={`checkbox-${field.id}`}
              checked={!!value}
              onCheckedChange={(checked: boolean) => updateField(field.id, checked)}
              className={error ? 'border-red-500' : ''}
            />
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-normal leading-none">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
        );

      case 'membership_selection':
        return (
          <div key={field.id} className="space-y-3">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <div className="space-y-2">
              {membershipTypes
                .filter(m => m.is_active)
                .sort((a, b) => a.display_order - b.display_order)
                .map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent"
                  >
                    <Checkbox
                      id={`membership-${membership.id}`}
                      data-testid={`checkbox-membership-${membership.code}`}
                      checked={selectedMemberships.includes(membership.id)}
                      onCheckedChange={() => toggleMembership(membership.id, field.allow_multiple || false)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`membership-${membership.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {membership.name} - £{membership.price.toFixed(2)}
                      </Label>
                      {membership.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {membership.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            {errors[field.id] && <p className="text-sm text-red-500">{errors[field.id]}</p>}
          </div>
        );

      case 'repeatable_group':
        const groupData = formData[field.id] || [];
        return (
          <div key={field.id} className="space-y-3">
            <Label>
              {field.label}
            </Label>
            {groupData.map((item: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    {field.label} #{index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid={`button-remove-${field.id}-${index}`}
                    onClick={() => {
                      const newGroupData = groupData.filter((_: any, i: number) => i !== index);
                      updateField(field.id, newGroupData);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {field.fields?.map((subField) => {
                  const subValue = item[subField.id] || '';
                  return (
                    <div key={subField.id} className="space-y-2">
                      <Label htmlFor={`${field.id}_${index}_${subField.id}`}>
                        {subField.label}
                      </Label>
                      <Input
                        id={`${field.id}_${index}_${subField.id}`}
                        data-testid={`input-${field.id}-${index}-${subField.id}`}
                        type={subField.type}
                        value={subValue}
                        onChange={(e) => {
                          const newGroupData = [...groupData];
                          newGroupData[index] = {
                            ...newGroupData[index],
                            [subField.id]: e.target.value
                          };
                          updateField(field.id, newGroupData);
                        }}
                        placeholder={subField.placeholder}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
            {(!field.maxRepeats || groupData.length < field.maxRepeats) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid={`button-add-${field.id}`}
                onClick={() => {
                  const newItem = field.fields?.reduce((acc, f) => ({ ...acc, [f.id]: '' }), {}) || {};
                  updateField(field.id, [...groupData, newItem]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add {field.label}
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const total = calculateTotal();

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {schema.sections.map((section) => (
        <div key={section.id} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
            )}
          </div>
          <div className="space-y-4">
            {section.fields.map(renderField)}
          </div>
        </div>
      ))}

      {total > 0 && (
        <div className="p-4 bg-accent rounded-lg">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Amount:</span>
            <span data-testid="text-total-amount">£{total.toFixed(2)}</span>
          </div>
        </div>
      )}

      <Button
        type="submit"
        data-testid="button-submit-form"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Submitting...' : submitLabel}
      </Button>
    </form>
  );
}
