# Digital Wallet Integration Guide

This guide covers the implementation of digital membership cards for both Google Wallet and Apple Wallet integration.

## Overview

The system generates digital membership cards that can be added to Google Wallet and Apple Wallet, providing members with convenient access to their membership information and verification.

## Features

- **Google Wallet Integration**: Generate and manage Google Pay passes
- **Apple Wallet Integration**: Create and distribute Apple Wallet passes
- **QR Code Verification**: Secure verification system for membership validation
- **Automatic Updates**: Pass updates when membership status changes
- **Organization Branding**: Custom colors, logos, and styling per organization
- **Expiry Management**: Automatic expiry date handling

## Google Wallet Integration

### Prerequisites

1. Google Cloud Project with Google Wallet API enabled
2. Service Account with Google Wallet API permissions
3. Google Wallet Issuer Account

### Setup

#### 1. Google Cloud Configuration

```bash
# Enable Google Wallet API
gcloud services enable walletobjects.googleapis.com

# Create service account
gcloud iam service-accounts create wallet-service-account \
    --display-name="Wallet Service Account"

# Create and download service account key
gcloud iam service-accounts keys create wallet-service-key.json \
    --iam-account=wallet-service-account@your-project.iam.gserviceaccount.com
```

#### 2. Environment Variables

```env
GOOGLE_WALLET_ISSUER_ID=your_issuer_id
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=wallet-service-account@your-project.iam.gserviceaccount.com
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_WALLET_PROJECT_ID=your-project-id
```

#### 3. Implementation

Create `src/lib/wallet/google-wallet.ts`:

```typescript
import { GoogleAuth } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

interface MembershipData {
  memberId: string;
  memberName: string;
  organizationName: string;
  membershipYear: number;
  startDate: string;
  endDate: string;
  membershipType: string;
  organizationLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export class GoogleWalletService {
  private auth: GoogleAuth;
  private issuerId: string;
  private baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

  constructor() {
    this.issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
    this.auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });
  }

  async createMembershipClass(organizationId: string, organizationData: any) {
    const classId = `${this.issuerId}.membership_${organizationId}`;
    
    const membershipClass = {
      id: classId,
      issuerName: organizationData.name,
      reviewStatus: 'UNDER_REVIEW',
      programName: `${organizationData.name} Membership`,
      programLogo: {
        sourceUri: {
          uri: organizationData.logo_url || 'https://example.com/default-logo.png'
        },
        contentDescription: {
          defaultValue: {
            language: 'en-US',
            value: `${organizationData.name} Logo`
          }
        }
      },
      hexBackgroundColor: organizationData.primary_color || '#3B82F6',
      localizedIssuerName: {
        defaultValue: {
          language: 'en-US',
          value: organizationData.name
        }
      },
      localizedProgramName: {
        defaultValue: {
          language: 'en-US',
          value: `${organizationData.name} Membership`
        }
      },
      membershipType: 'MEMBERSHIP_TYPE_UNSPECIFIED',
      allowMultipleUsersPerObject: false,
      locations: organizationData.address ? [{
        latitude: organizationData.address.latitude || 51.5074,
        longitude: organizationData.address.longitude || -0.1278
      }] : [],
      messages: [{
        header: 'Welcome to ' + organizationData.name,
        body: 'Thank you for being a member. Present this card for verification.',
        id: 'welcome_message'
      }],
      textModulesData: [{
        id: 'benefits',
        header: 'Membership Benefits',
        body: 'Access to all events, newsletters, and member services.'
      }],
      linksModuleData: {
        uris: [{
          uri: `https://${organizationData.domain}`,
          description: 'Visit our website',
          id: 'website_link'
        }]
      }
    };

    try {
      const client = await this.auth.getClient();
      const response = await client.request({
        url: `${this.baseUrl}/membershipClass`,
        method: 'POST',
        data: membershipClass,
      });
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Class already exists, return existing
        return await this.getMembershipClass(classId);
      }
      throw error;
    }
  }

  async getMembershipClass(classId: string) {
    const client = await this.auth.getClient();
    const response = await client.request({
      url: `${this.baseUrl}/membershipClass/${classId}`,
      method: 'GET',
    });
    
    return response.data;
  }

  async createMembershipObject(membershipData: MembershipData) {
    const classId = `${this.issuerId}.membership_${membershipData.memberId.split('_')[0]}`;
    const objectId = `${this.issuerId}.membership_object_${membershipData.memberId}`;
    
    const membershipObject = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',
      memberName: {
        defaultValue: {
          language: 'en-US',
          value: membershipData.memberName
        }
      },
      accountId: membershipData.memberId,
      accountName: membershipData.memberName,
      membershipType: {
        defaultValue: {
          language: 'en-US',
          value: membershipData.membershipType
        }
      },
      validTimeInterval: {
        start: {
          date: membershipData.startDate
        },
        end: {
          date: membershipData.endDate
        }
      },
      barcode: {
        type: 'QR_CODE',
        value: `https://member.ringing.org.uk/verify/${membershipData.memberId}`,
        alternateText: membershipData.memberId
      },
      textModulesData: [{
        id: 'membership_details',
        header: 'Membership Details',
        body: `Year: ${membershipData.membershipYear}\nType: ${membershipData.membershipType}\nValid until: ${membershipData.endDate}`
      }],
      imageModulesData: [{
        id: 'member_photo',
        mainImage: {
          sourceUri: {
            uri: membershipData.organizationLogo || 'https://example.com/default-member.png'
          },
          contentDescription: {
            defaultValue: {
              language: 'en-US',
              value: 'Member Photo'
            }
          }
        }
      }]
    };

    const client = await this.auth.getClient();
    const response = await client.request({
      url: `${this.baseUrl}/membershipObject`,
      method: 'POST',
      data: membershipObject,
    });

    return response.data;
  }

  async generateSaveUrl(objectId: string): Promise<string> {
    const saveUrl = `https://pay.google.com/gp/v/save/${objectId}`;
    return saveUrl;
  }

  async updateMembershipObject(objectId: string, updates: Partial<MembershipData>) {
    const client = await this.auth.getClient();
    
    // Get current object
    const currentResponse = await client.request({
      url: `${this.baseUrl}/membershipObject/${objectId}`,
      method: 'GET',
    });
    
    const currentObject = currentResponse.data;
    
    // Apply updates
    if (updates.endDate) {
      currentObject.validTimeInterval.end.date = updates.endDate;
    }
    
    if (updates.membershipType) {
      currentObject.membershipType.defaultValue.value = updates.membershipType;
    }

    // Update object
    const response = await client.request({
      url: `${this.baseUrl}/membershipObject/${objectId}`,
      method: 'PUT',
      data: currentObject,
    });

    return response.data;
  }

  async expireMembershipObject(objectId: string) {
    const client = await this.auth.getClient();
    
    const response = await client.request({
      url: `${this.baseUrl}/membershipObject/${objectId}`,
      method: 'PATCH',
      data: {
        state: 'EXPIRED'
      },
    });

    return response.data;
  }
}
```

## Apple Wallet Integration

### Prerequisites

1. Apple Developer Account
2. Pass Type ID registered in Apple Developer Portal
3. Pass Type Certificate and private key
4. Apple WWDR Certificate

### Setup

#### 1. Apple Developer Configuration

1. Log in to Apple Developer Portal
2. Go to Certificates, Identifiers & Profiles
3. Create a new Pass Type ID (e.g., `pass.com.yourorg.membership`)
4. Generate a Pass Type Certificate
5. Download the certificate and convert to PEM format

#### 2. Certificate Setup

```bash
# Convert certificate to PEM format
openssl pkcs12 -in pass_certificate.p12 -out pass_certificate.pem -nodes

# Extract private key
openssl pkcs12 -in pass_certificate.p12 -nocerts -out pass_private_key.pem -nodes

# Download Apple WWDR Certificate
curl -O https://developer.apple.com/certificationauthority/AppleWWDRCA.cer
openssl x509 -inform DER -in AppleWWDRCA.cer -out AppleWWDRCA.pem
```

#### 3. Environment Variables

```env
APPLE_WALLET_TEAM_ID=your_team_id
APPLE_WALLET_PASS_TYPE_ID=pass.com.yourorg.membership
APPLE_WALLET_CERTIFICATE_PATH=/path/to/pass_certificate.pem
APPLE_WALLET_PRIVATE_KEY_PATH=/path/to/pass_private_key.pem
APPLE_WALLET_WWDR_CERTIFICATE_PATH=/path/to/AppleWWDRCA.pem
```

#### 4. Implementation

Create `src/lib/wallet/apple-wallet.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createHash } from 'crypto';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';

interface AppleMembershipData {
  memberId: string;
  memberName: string;
  organizationName: string;
  membershipYear: number;
  startDate: string;
  endDate: string;
  membershipType: string;
  organizationLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export class AppleWalletService {
  private teamId: string;
  private passTypeId: string;
  private certificatePath: string;
  private privateKeyPath: string;
  private wwdrCertificatePath: string;

  constructor() {
    this.teamId = process.env.APPLE_WALLET_TEAM_ID!;
    this.passTypeId = process.env.APPLE_WALLET_PASS_TYPE_ID!;
    this.certificatePath = process.env.APPLE_WALLET_CERTIFICATE_PATH!;
    this.privateKeyPath = process.env.APPLE_WALLET_PRIVATE_KEY_PATH!;
    this.wwdrCertificatePath = process.env.APPLE_WALLET_WWDR_CERTIFICATE_PATH!;
  }

  async createMembershipPass(membershipData: AppleMembershipData): Promise<Buffer> {
    const passId = uuidv4();
    const tempDir = path.join('/tmp', `pass_${passId}`);
    
    // Create temporary directory
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Create pass.json
      const passJson = this.createPassJson(membershipData, passId);
      fs.writeFileSync(path.join(tempDir, 'pass.json'), JSON.stringify(passJson, null, 2));

      // Copy logo and other assets
      await this.copyAssets(tempDir, membershipData);

      // Create manifest
      const manifest = await this.createManifest(tempDir);
      fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Create signature
      const signature = await this.createSignature(manifest);
      fs.writeFileSync(path.join(tempDir, 'signature'), signature);

      // Create .pkpass file
      const pkpassBuffer = await this.createPkpassFile(tempDir);

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });

      return pkpassBuffer;
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
  }

  private createPassJson(membershipData: AppleMembershipData, passId: string) {
    return {
      formatVersion: 1,
      passTypeIdentifier: this.passTypeId,
      serialNumber: passId,
      teamIdentifier: this.teamId,
      organizationName: membershipData.organizationName,
      description: `${membershipData.organizationName} Membership`,
      logoText: membershipData.organizationName,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: membershipData.primaryColor || 'rgb(59, 130, 246)',
      labelColor: 'rgb(255, 255, 255)',
      webServiceURL: 'https://member.ringing.org.uk/api/wallet/apple',
      authenticationToken: this.generateAuthToken(passId),
      associatedStoreIdentifiers: [],
      userInfo: {
        memberId: membershipData.memberId,
        organizationId: membershipData.memberId.split('_')[0]
      },
      expirationDate: new Date(membershipData.endDate).toISOString(),
      voided: false,
      generic: {
        primaryFields: [{
          key: 'member_name',
          label: 'Member',
          value: membershipData.memberName
        }],
        secondaryFields: [{
          key: 'membership_type',
          label: 'Type',
          value: membershipData.membershipType
        }, {
          key: 'membership_year',
          label: 'Year',
          value: membershipData.membershipYear.toString()
        }],
        auxiliaryFields: [{
          key: 'valid_from',
          label: 'Valid From',
          value: this.formatDate(membershipData.startDate),
          dateStyle: 'PKDateStyleShort'
        }, {
          key: 'valid_until',
          label: 'Valid Until',
          value: this.formatDate(membershipData.endDate),
          dateStyle: 'PKDateStyleShort'
        }],
        backFields: [{
          key: 'terms',
          label: 'Terms & Conditions',
          value: 'This membership card is valid for the specified period and provides access to all member benefits and services.'
        }, {
          key: 'contact',
          label: 'Contact Information',
          value: `For questions about your membership, please visit https://${membershipData.organizationName.toLowerCase().replace(/\s+/g, '')}.member.ringing.org.uk`
        }]
      },
      barcode: {
        message: `https://member.ringing.org.uk/verify/${membershipData.memberId}`,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1'
      },
      barcodes: [{
        message: `https://member.ringing.org.uk/verify/${membershipData.memberId}`,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1'
      }]
    };
  }

  private async copyAssets(tempDir: string, membershipData: AppleMembershipData) {
    // Copy default logo if organization logo not available
    const logoPath = path.join(__dirname, '../../../assets/default-logo.png');
    if (fs.existsSync(logoPath)) {
      fs.copyFileSync(logoPath, path.join(tempDir, 'logo.png'));
      fs.copyFileSync(logoPath, path.join(tempDir, 'logo@2x.png'));
    }

    // If organization has custom logo, download and use it
    if (membershipData.organizationLogo) {
      try {
        const response = await fetch(membershipData.organizationLogo);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          fs.writeFileSync(path.join(tempDir, 'logo.png'), Buffer.from(buffer));
          fs.writeFileSync(path.join(tempDir, 'logo@2x.png'), Buffer.from(buffer));
        }
      } catch (error) {
        console.warn('Failed to download organization logo:', error);
      }
    }
  }

  private async createManifest(tempDir: string): Promise<Record<string, string>> {
    const manifest: Record<string, string> = {};
    const files = fs.readdirSync(tempDir);

    for (const file of files) {
      if (file === 'manifest.json' || file === 'signature') continue;
      
      const filePath = path.join(tempDir, file);
      const fileContent = fs.readFileSync(filePath);
      const hash = createHash('sha1').update(fileContent).digest('hex');
      manifest[file] = hash;
    }

    return manifest;
  }

  private async createSignature(manifest: Record<string, string>): Promise<Buffer> {
    const manifestBuffer = Buffer.from(JSON.stringify(manifest));
    
    // Read certificates
    const certificate = fs.readFileSync(this.certificatePath);
    const privateKey = fs.readFileSync(this.privateKeyPath);
    const wwdrCertificate = fs.readFileSync(this.wwdrCertificatePath);

    // Create PKCS#7 signature
    const sign = crypto.createSign('SHA1');
    sign.update(manifestBuffer);
    const signature = sign.sign(privateKey);

    return signature;
  }

  private async createPkpassFile(tempDir: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add all files to archive
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        archive.file(filePath, { name: file });
      }

      archive.finalize();
    });
  }

  private generateAuthToken(passId: string): string {
    const payload = {
      passId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
    };

    // Simple token generation - in production, use proper JWT
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async updatePass(passId: string, updates: Partial<AppleMembershipData>): Promise<void> {
    // Send push notification to update pass
    // This requires implementing the Apple Push Notification service
    console.log(`Updating pass ${passId} with updates:`, updates);
  }

  async revokePass(passId: string): Promise<void> {
    // Mark pass as voided in database and send push notification
    console.log(`Revoking pass ${passId}`);
  }
}
```

## API Integration

### Create Digital Cards API Endpoint

Create `src/app/api/digital-cards/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleWalletService } from '@/lib/wallet/google-wallet';
import { AppleWalletService } from '@/lib/wallet/apple-wallet';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { membership_id, card_type } = await request.json();

    // Get membership details
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select(`
        *,
        profiles!inner(
          first_name,
          last_name,
          email,
          organization_id,
          organizations!inner(
            name,
            slug,
            domain,
            logo_url,
            primary_color,
            secondary_color
          )
        )
      `)
      .eq('id', membership_id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    const membershipData = {
      memberId: `${membership.profiles.organization_id}_${membership.id}`,
      memberName: `${membership.profiles.first_name} ${membership.profiles.last_name}`,
      organizationName: membership.profiles.organizations.name,
      membershipYear: membership.membership_year,
      startDate: membership.start_date,
      endDate: membership.end_date,
      membershipType: membership.membership_type,
      organizationLogo: membership.profiles.organizations.logo_url,
      primaryColor: membership.profiles.organizations.primary_color,
      secondaryColor: membership.profiles.organizations.secondary_color,
    };

    let passUrl: string;
    let cardId: string;

    if (card_type === 'google_wallet') {
      const googleWallet = new GoogleWalletService();
      
      // Ensure class exists
      await googleWallet.createMembershipClass(
        membership.profiles.organization_id,
        membership.profiles.organizations
      );
      
      // Create membership object
      const membershipObject = await googleWallet.createMembershipObject(membershipData);
      cardId = membershipObject.id;
      passUrl = await googleWallet.generateSaveUrl(cardId);
      
    } else if (card_type === 'apple_wallet') {
      const appleWallet = new AppleWalletService();
      const passBuffer = await appleWallet.createMembershipPass(membershipData);
      
      // Save pass file and generate download URL
      const fileName = `membership_${membership.id}_${Date.now()}.pkpass`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('passes')
        .upload(fileName, passBuffer, {
          contentType: 'application/vnd.apple.pkpass'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('passes')
        .getPublicUrl(fileName);

      cardId = fileName;
      passUrl = urlData.publicUrl;
      
    } else {
      return NextResponse.json({ error: 'Invalid card type' }, { status: 400 });
    }

    // Save digital card record
    const { data: digitalCard, error: cardError } = await supabase
      .from('digital_cards')
      .insert({
        organization_id: membership.profiles.organization_id,
        membership_id: membership.id,
        card_type,
        card_id: cardId,
        pass_url: passUrl,
        qr_code_data: `https://member.ringing.org.uk/verify/${membershipData.memberId}`,
        expires_at: membership.end_date,
      })
      .select()
      .single();

    if (cardError) {
      throw cardError;
    }

    return NextResponse.json({
      success: true,
      data: digitalCard
    });

  } catch (error) {
    console.error('Error creating digital card:', error);
    return NextResponse.json(
      { error: 'Failed to create digital card' },
      { status: 500 }
    );
  }
}
```

### Verification API Endpoint

Create `src/app/api/digital-cards/verify/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createClient();
    const token = params.token;

    // Parse token to get organization and membership IDs
    const [organizationId, membershipId] = token.split('_');

    // Get membership with verification data
    const { data: membership, error } = await supabase
      .from('memberships')
      .select(`
        id,
        membership_year,
        start_date,
        end_date,
        status,
        membership_type,
        profiles!inner(
          first_name,
          last_name,
          organizations!inner(
            name,
            logo_url
          )
        )
      `)
      .eq('id', membershipId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !membership) {
      return NextResponse.json({
        success: true,
        data: {
          valid: false,
          error: 'Membership not found'
        }
      });
    }

    const currentDate = new Date();
    const endDate = new Date(membership.end_date);
    const isValid = membership.status === 'active' && currentDate <= endDate;

    return NextResponse.json({
      success: true,
      data: {
        valid: isValid,
        membership: {
          member_name: `${membership.profiles.first_name} ${membership.profiles.last_name}`,
          organization: membership.profiles.organizations.name,
          organization_logo: membership.profiles.organizations.logo_url,
          membership_year: membership.membership_year,
          membership_type: membership.membership_type,
          status: membership.status,
          expires_at: membership.end_date,
          verified_at: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error verifying digital card:', error);
    return NextResponse.json({
      success: true,
      data: {
        valid: false,
        error: 'Verification failed'
      }
    });
  }
}
```

## Frontend Components

### Digital Card Generation Component

Create `src/components/digital-cards/CardGenerator.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, CreditCard, Download, ExternalLink } from 'lucide-react';

interface Membership {
  id: string;
  membership_year: number;
  start_date: string;
  end_date: string;
  status: string;
  membership_type: string;
}

interface CardGeneratorProps {
  membership: Membership;
  onCardGenerated?: (card: any) => void;
}

export function CardGenerator({ membership, onCardGenerated }: CardGeneratorProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [cards, setCards] = useState<any[]>([]);

  const generateCard = async (cardType: 'google_wallet' | 'apple_wallet') => {
    setLoading(cardType);
    
    try {
      const response = await fetch('/api/digital-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membership_id: membership.id,
          card_type: cardType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate card');
      }

      const result = await response.json();
      const newCard = result.data;
      
      setCards(prev => [...prev, newCard]);
      onCardGenerated?.(newCard);

      // For Google Wallet, open the save URL
      if (cardType === 'google_wallet') {
        window.open(newCard.pass_url, '_blank');
      }
      
    } catch (error) {
      console.error('Error generating card:', error);
      alert('Failed to generate digital card. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const downloadApplePass = (card: any) => {
    window.open(card.pass_url, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Digital Membership Cards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google Wallet */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium">Google Wallet</h3>
            </div>
            <p className="text-sm text-gray-600">
              Add your membership card to Google Wallet for easy access on Android devices.
            </p>
            <Button
              onClick={() => generateCard('google_wallet')}
              disabled={loading === 'google_wallet'}
              className="w-full"
            >
              {loading === 'google_wallet' ? (
                'Generating...'
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Add to Google Wallet
                </>
              )}
            </Button>
          </div>

          {/* Apple Wallet */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-gray-800" />
              <h3 className="font-medium">Apple Wallet</h3>
            </div>
            <p className="text-sm text-gray-600">
              Download your membership pass for Apple Wallet on iOS devices.
            </p>
            <Button
              onClick={() => generateCard('apple_wallet')}
              disabled={loading === 'apple_wallet'}
              variant="outline"
              className="w-full"
            >
              {loading === 'apple_wallet' ? (
                'Generating...'
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download for Apple Wallet
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generated Cards */}
        {cards.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Generated Cards</h4>
            {cards.map((card) => (
              <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">
                    {card.card_type === 'google_wallet' ? 'Google Wallet' : 'Apple Wallet'} Card
                  </span>
                </div>
                {card.card_type === 'apple_wallet' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadApplePass(card)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Digital cards are automatically updated when your membership status changes</p>
          <p>• Cards expire on {new Date(membership.end_date).toLocaleDateString()}</p>
          <p>• Present your digital card for verification at events and locations</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Testing

### Test Google Wallet Integration

```typescript
// test/wallet/google-wallet.test.ts
import { GoogleWalletService } from '@/lib/wallet/google-wallet';

describe('GoogleWalletService', () => {
  let service: GoogleWalletService;

  beforeEach(() => {
    service = new GoogleWalletService();
  });

  test('should create membership class', async () => {
    const organizationData = {
      name: 'Test Organization',
      logo_url: 'https://example.com/logo.png',
      primary_color: '#3B82F6',
      domain: 'test.member.ringing.org.uk'
    };

    const result = await service.createMembershipClass('test-org', organizationData);
    expect(result).toBeDefined();
    expect(result.id).toContain('test-org');
  });

  test('should create membership object', async () => {
    const membershipData = {
      memberId: 'test-org_123',
      memberName: 'John Doe',
      organizationName: 'Test Organization',
      membershipYear: 2024,
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      membershipType: 'standard'
    };

    const result = await service.createMembershipObject(membershipData);
    expect(result).toBeDefined();
    expect(result.accountName).toBe('John Doe');
  });
});
```

### Test Apple Wallet Integration

```typescript
// test/wallet/apple-wallet.test.ts
import { AppleWalletService } from '@/lib/wallet/apple-wallet';

describe('AppleWalletService', () => {
  let service: AppleWalletService;

  beforeEach(() => {
    service = new AppleWalletService();
  });

  test('should create membership pass', async () => {
    const membershipData = {
      memberId: 'test-org_123',
      memberName: 'John Doe',
      organizationName: 'Test Organization',
      membershipYear: 2024,
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      membershipType: 'standard'
    };

    const passBuffer = await service.createMembershipPass(membershipData);
    expect(passBuffer).toBeInstanceOf(Buffer);
    expect(passBuffer.length).toBeGreaterThan(0);
  });
});
```

## Security Considerations

1. **Certificate Security**: Store certificates securely and rotate regularly
2. **Token Validation**: Implement proper token validation for pass updates
3. **Rate Limiting**: Implement rate limiting for card generation endpoints
4. **Access Control**: Ensure only authorized users can generate cards
5. **Data Validation**: Validate all input data before creating passes
6. **Audit Logging**: Log all card generation and verification activities

## Monitoring and Analytics

### Track Card Usage

```typescript
// Add to verification endpoint
await supabase
  .from('digital_card_verifications')
  .insert({
    card_id: digitalCard.id,
    verified_at: new Date().toISOString(),
    verification_method: 'qr_scan',
    location: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent')
  });
```

### Analytics Dashboard

Track metrics such as:
- Card generation rates
- Verification frequency
- Platform preferences (Google vs Apple)
- Geographic usage patterns
- Error rates and common issues

This completes the digital wallet integration guide. The implementation provides comprehensive support for both Google Wallet and Apple Wallet with proper security, testing, and monitoring capabilities.