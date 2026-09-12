export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { 
  EMAIL_TEMPLATES, 
  renderTestEmail, 
  sendTestEmail, 
  EmailTemplateId 
} from '@/lib/email-testing';
import { 
  isEmailConfigured, 
  isResendConfigured, 
  isGmailConfigured, 
  getContactEmail, 
  getAdminNotificationEmails 
} from '@/lib/mail';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const isConfigured = isEmailConfigured();
    const provider = isResendConfigured() ? 'resend' : isGmailConfigured() ? 'gmail' : 'none';
    const senderEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_USER || null;
    const fromName = process.env.RESEND_FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || 'MB-Paws';

    return NextResponse.json({
      success: true,
      status: {
        isConfigured,
        provider,
        senderEmail,
        fromName,
        contactEmail: getContactEmail(),
        adminNotificationEmails: getAdminNotificationEmails(),
      },
      templates: EMAIL_TEMPLATES,
    });
  } catch (error) {
    logger.error('Error in email testing GET status', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve email service status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, templateId, toEmail, customData, language = 'en' } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: templateId' },
        { status: 400 }
      );
    }

    const templateExists = EMAIL_TEMPLATES.some((t) => t.id === templateId);
    if (!templateExists) {
      return NextResponse.json(
        { success: false, error: `Invalid templateId: "${templateId}"` },
        { status: 400 }
      );
    }

    // Action 1: Live Preview HTML
    if (action === 'preview') {
      const { subject, html } = renderTestEmail(templateId as EmailTemplateId, {
        customData,
        language,
      });

      return NextResponse.json({
        success: true,
        subject,
        html,
      });
    }

    // Action 2: Send Real Test Email
    if (action === 'send') {
      if (!toEmail || typeof toEmail !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid destination email address.' },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = toEmail.trim();

      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json(
          { success: false, error: 'The recipient email address format is invalid.' },
          { status: 400 }
        );
      }

      if (!isEmailConfigured()) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email provider is not configured on this server. Set RESEND_API_KEY + RESEND_FROM_EMAIL in your .env.local file to send live test emails.' 
          },
          { status: 503 }
        );
      }

      const result = await sendTestEmail(templateId as EmailTemplateId, cleanEmail, {
        customData,
        language,
      });

      return NextResponse.json({
        success: true,
        subject: result.subject,
        message: result.message,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: "${action}". Must be "preview" or "send".` },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during email test operation';
    logger.error('Error executing email test action', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
