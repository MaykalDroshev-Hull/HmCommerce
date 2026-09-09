import { sendEmail, getContactEmail, isEmailConfigured } from '@/lib/mail'
import { logger } from '@/lib/logger'

interface EmailOptions {
  to: string
  name?: string
  discountCode?: string
}

interface PasswordResetEmailOptions {
  to: string
  name: string
  resetToken: string
  resetUrl: string
}

export class EmailService {
  async sendWelcomeEmail({ to, name, discountCode = 'WELCOME10' }: EmailOptions): Promise<void> {
    if (!isEmailConfigured()) {
      return
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const storeName = process.env.RESEND_FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || 'MB-Paws'
    const displayName = name && name.trim() ? name.trim() : 'Pet Parent'
    const shopUrl = `${siteUrl}?discount=${encodeURIComponent(discountCode)}`

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en-GB">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${storeName} – Your 10% Treat</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #171717;
            max-width: 600px;
            margin: 0 auto;
            padding: 24px 16px;
            background-color: #f5f5f4;
          }
          .email-container {
            background-color: #ffffff;
            border-radius: 16px;
            padding: 40px 32px;
            border: 1px solid #e7e5e4;
          }
          .brand-tag {
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #78716c;
            margin-bottom: 8px;
          }
          .welcome-title {
            color: #0c0a09;
            font-size: 26px;
            font-weight: 800;
            text-align: center;
            letter-spacing: -0.02em;
            margin: 0 0 16px 0;
          }
          .welcome-text {
            font-size: 15px;
            text-align: center;
            color: #57534e;
            margin: 0 0 28px 0;
            line-height: 1.65;
          }
          .voucher-box {
            background-color: #fafaf9;
            border: 2px dashed #0c0a09;
            border-radius: 12px;
            padding: 24px 20px;
            text-align: center;
            margin: 28px 0;
          }
          .voucher-label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #78716c;
            margin-bottom: 6px;
          }
          .voucher-amount {
            font-size: 24px;
            font-weight: 800;
            color: #0c0a09;
            margin-bottom: 12px;
          }
          .voucher-code {
            display: inline-block;
            background-color: #0c0a09;
            color: #ffffff;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.15em;
            padding: 10px 24px;
            border-radius: 8px;
            margin-bottom: 10px;
          }
          .voucher-note {
            font-size: 12px;
            color: #78716c;
            margin-top: 6px;
          }
          .shop-button-container {
            text-align: center;
            margin: 32px 0 24px 0;
          }
          .shop-button {
            display: inline-block;
            background-color: #0c0a09;
            color: #ffffff !important;
            padding: 16px 36px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 14px;
            letter-spacing: 0.04em;
            text-align: center;
          }
          .perks {
            border-top: 1px solid #f5f5f4;
            padding-top: 24px;
            margin-top: 32px;
            font-size: 13px;
            color: #78716c;
            text-align: center;
            line-height: 1.8;
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #e7e5e4;
            color: #a8a29e;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="brand-tag">${storeName} Canine Gear</div>
          <h1 class="welcome-title">Welcome to the Pack</h1>
          <p class="welcome-text">
            Hello ${displayName},<br><br>
            We're delighted to welcome you and your furbaby to the MB-Paws family! We craft technical, adventure-ready canine gear made for everyday walks, muddy trail runs, and all-weather exploring across the UK.<br><br>
            As a warm welcome to our pet parent community, here is your exclusive treat:
          </p>

          <div class="voucher-box">
            <div class="voucher-label">Your Exclusive Welcome Voucher</div>
            <div class="voucher-amount">10% Off Your Order</div>
            <div class="voucher-code">${discountCode}</div>
            <div class="voucher-note">Apply at checkout or click below to automatically activate.</div>
          </div>

          <div class="shop-button-container">
            <a href="${shopUrl}" class="shop-button">
              SHOP NOW WITH 10% OFF
            </a>
          </div>

          <div class="perks">
            Fast Tracked UK Delivery &bull; Free UK Delivery on Orders over &pound;50 &bull; 30-Day Hassle-Free Returns
          </div>

          <div class="footer">
            <p>You received this email because you subscribed to updates at ${storeName}.</p>
            <p>&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      await sendEmail({
        to,
        subject: `Welcome to ${storeName}! Here is your 10% welcome treat`,
        html: htmlContent,
        replyTo: getContactEmail(),
      })
    } catch (error) {
      logger.error('Error sending welcome email', error)
    }
  }

  async sendPasswordResetEmail({ to, name, resetToken, resetUrl }: PasswordResetEmailOptions): Promise<void> {
    if (!isEmailConfigured()) {
      return
    }

    const storeName = process.env.RESEND_FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || 'Store'

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - ${storeName}</title>
        <style>
          body {
            font-family: Inter, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .email-container {
            background-color: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .reset-title {
            color: #2563eb;
            font-size: 28px;
            font-weight: 800;
            text-align: center;
            margin-bottom: 20px;
          }
          .reset-text {
            font-size: 16px;
            text-align: center;
            margin-bottom: 30px;
            color: #666;
          }
          .reset-button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 18px 35px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            margin: 20px auto;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #666;
            font-size: 14px;
          }
          .highlight {
            color: #2563eb;
            font-weight: 700;
          }
          .warning {
            background-color: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            color: #dc2626;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <h1 class="reset-title">Password Reset 🔐</h1>
          <p class="reset-text">
            Hello, <span class="highlight">${name}</span>!<br><br>
            We received a request to reset the password for your account.
          </p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="reset-button">
              RESET PASSWORD
            </a>
          </div>
          <div class="warning">
            <strong>⚠️ Important:</strong><br>
            This link is valid for 1 hour only.<br>
            If you did not request this password reset, please ignore this email.
          </div>
          <p class="reset-text">
            If you are having trouble clicking the button, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #2563eb; word-break: break-all; font-weight: 700;">${resetUrl}</a>
          </p>
          <div class="footer">
            <p>This email was sent automatically. Please do not reply directly to this address.</p>
            <p>© ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      await sendEmail({
        to,
        subject: `Password Reset - ${storeName} 🔐`,
        html: htmlContent,
        replyTo: getContactEmail(),
      })
    } catch (error) {
      logger.error('Error sending password reset email', error)
    }
  }
}

export const emailService = new EmailService()
