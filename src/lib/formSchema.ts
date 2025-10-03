export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'membership_selection'
  | 'repeatable_group';

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'phone' | 'minLength' | 'maxLength';
  value?: any;
  message?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  validation?: ValidationRule[];
  options?: SelectOption[];
  defaultValue?: any;
  allow_multiple?: boolean;
  maxRepeats?: number;
  fields?: FormField[];
  link?: string;
  show_if?: {
    field_id: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  collapsed?: boolean;
}

export interface FormSchema {
  sections: FormSection[];
  version?: number;
}

export interface MembershipType {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
}

export interface FormResponse {
  [key: string]: any;
}

export const createFRPSFormSchema = (): FormSchema => ({
  sections: [
    {
      id: 'personal_details',
      title: 'Personal Details',
      description: 'Primary member information',
      fields: [
        {
          id: 'title',
          type: 'select',
          label: 'Title',
          required: true,
          options: [
            { value: 'mr', label: 'Mr' },
            { value: 'mrs', label: 'Mrs' },
            { value: 'miss', label: 'Miss' },
            { value: 'ms', label: 'Ms' },
            { value: 'dr', label: 'Dr' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          id: 'first_name',
          type: 'text',
          label: 'First Name',
          required: true,
          placeholder: 'Enter first name'
        },
        {
          id: 'last_name',
          type: 'text',
          label: 'Last Name',
          required: true,
          placeholder: 'Enter last name'
        },
        {
          id: 'date_of_birth',
          type: 'date',
          label: 'Date of Birth',
          description: 'Required if under 18 at 1st April',
          required: false
        },
        {
          id: 'address_line1',
          type: 'text',
          label: 'Address Line 1',
          required: true
        },
        {
          id: 'address_line2',
          type: 'text',
          label: 'Address Line 2',
          required: false
        },
        {
          id: 'city',
          type: 'text',
          label: 'Town/City',
          required: true
        },
        {
          id: 'postcode',
          type: 'text',
          label: 'Postcode',
          required: true
        },
        {
          id: 'phone',
          type: 'tel',
          label: 'Telephone',
          required: true,
          placeholder: '+44 1234 567890'
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          required: true,
          placeholder: 'your.email@example.com'
        }
      ]
    },
    {
      id: 'membership_type',
      title: 'Type of Membership',
      description: 'Select one or more membership types (check all that apply)',
      fields: [
        {
          id: 'membership_selection',
          type: 'membership_selection',
          label: 'Choose Membership Type(s)',
          required: true,
          allow_multiple: true
        }
      ]
    },
    {
      id: 'family_details',
      title: 'Family Members',
      description: 'If you selected Family membership, please provide details',
      fields: [
        {
          id: 'second_adult_name',
          type: 'text',
          label: "Second Adult's Name",
          required: false,
          placeholder: 'Full name'
        },
        {
          id: 'family_members',
          type: 'repeatable_group',
          label: 'Children',
          maxRepeats: 3,
          fields: [
            {
              id: 'child_name',
              type: 'text',
              label: "Child's Name",
              required: false
            },
            {
              id: 'child_dob',
              type: 'date',
              label: 'Date of Birth',
              required: false
            }
          ]
        }
      ]
    },
    {
      id: 'dog_registration',
      title: 'Dog Registration',
      description: 'If you selected Dog membership, please provide details',
      fields: [
        {
          id: 'dog_name',
          type: 'text',
          label: "Dog's Name",
          required: false,
          placeholder: 'Enter dog name'
        }
      ]
    },
    {
      id: 'donation',
      title: 'Donation',
      fields: [
        {
          id: 'donation_amount',
          type: 'number',
          label: 'Donation to Society funds (£)',
          required: false,
          placeholder: '0.00'
        }
      ]
    },
    {
      id: 'volunteering',
      title: 'Volunteering',
      fields: [
        {
          id: 'interested_in_volunteering',
          type: 'textarea',
          label: 'Are you interested in volunteering? If so, which aspects appeal?',
          required: false,
          placeholder: 'Please describe your interests...'
        },
        {
          id: 'skills',
          type: 'textarea',
          label: 'Do you have any skills that may assist the Railway?',
          required: false,
          placeholder: 'Please describe your skills...'
        }
      ]
    },
    {
      id: 'consent',
      title: 'Terms & Conditions',
      fields: [
        {
          id: 'agree_rules',
          type: 'checkbox',
          label: 'I/We agree to be bound by the rules of the Society',
          required: true
        },
        {
          id: 'agree_data',
          type: 'checkbox',
          label: 'I understand and agree that the data I have provided in this form will be stored on a computer and used for communications with me or my family (if this is a family membership) regarding the Fairbourne Railway or the Fairbourne Railway Preservation Society for the duration of this membership. The data will not be shared with any third party. When this membership is no longer valid, the data will be deleted.',
          required: true
        }
      ]
    }
  ]
});

export const createDefaultFormSchema = (): FormSchema => ({
  sections: [
    {
      id: 'personal_details',
      title: 'Personal Details',
      description: 'Please provide your contact information',
      fields: [
        {
          id: 'full_name',
          type: 'text',
          label: 'Full Name',
          required: true,
          placeholder: 'Enter your full name'
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          required: true,
          placeholder: 'your.email@example.com'
        },
        {
          id: 'phone',
          type: 'tel',
          label: 'Phone Number',
          required: false,
          placeholder: '+44 1234 567890'
        }
      ]
    },
    {
      id: 'membership',
      title: 'Membership Type',
      description: 'Select your membership type',
      fields: [
        {
          id: 'membership_selection',
          type: 'membership_selection',
          label: 'Choose Membership Type',
          required: true,
          allow_multiple: false
        }
      ]
    },
    {
      id: 'consent',
      title: 'Terms & Conditions',
      fields: [
        {
          id: 'agree_rules',
          type: 'checkbox',
          label: 'I agree to be bound by the rules of the organization',
          required: true
        },
        {
          id: 'agree_data',
          type: 'checkbox',
          label: 'I agree to the data processing terms',
          required: true
        }
      ]
    }
  ]
});
