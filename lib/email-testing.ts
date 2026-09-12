import 'server-only';

import { 
  generateCustomerOrderEmailHtml, 
  generateAdminOrderEmailHtml, 
  generateOrderStatusEmailHtml,
  OrderDetails, 
  OrderStatus 
} from '@/lib/email';
import { 
  generateWelcomeEmailHtml, 
  generatePasswordResetEmailHtml 
} from '@/lib/emailService';
import { sendEmail, getContactEmail, isEmailConfigured } from '@/lib/mail';
import { Language } from '@/lib/translations';

export type EmailTemplateId =
  | 'order_customer'
  | 'order_admin'
  | 'order_status_confirmed'
  | 'order_status_dispatched'
  | 'order_status_delivered'
  | 'order_status_cancelled'
  | 'newsletter_welcome'
  | 'password_reset';

export interface EmailTemplateDefinition {
  id: EmailTemplateId;
  name: string;
  category: 'Orders' | 'Marketing' | 'Account';
  description: string;
  defaultSubject: string;
}

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    id: 'order_customer',
    name: 'Order Confirmation (Customer)',
    category: 'Orders',
    description: 'Sent to the customer right after checkout with full order summary, delivery method, and payment breakdown.',
    defaultSubject: 'Order Received - #UK-84920',
  },
  {
    id: 'order_admin',
    name: 'New Order Alert (Admin)',
    category: 'Orders',
    description: 'Sent to the store manager with customer contact information, item SKUs, product links, and dispatch checklist.',
    defaultSubject: 'New Order Received - #UK-84920',
  },
  {
    id: 'order_status_confirmed',
    name: 'Order Status: Confirmed',
    category: 'Orders',
    description: 'Notifies pet parents that their order is confirmed with estimated UK delivery timeline schedule.',
    defaultSubject: 'Order Confirmed - #UK-84920',
  },
  {
    id: 'order_status_dispatched',
    name: 'Order Status: Dispatched',
    category: 'Orders',
    description: 'Sent when an order is packaged and dispatched, providing delivery tracking expectations.',
    defaultSubject: 'Order Dispatched - #UK-84920',
  },
  {
    id: 'order_status_delivered',
    name: 'Order Status: Delivered',
    category: 'Orders',
    description: 'Post-delivery follow-up wishing the pet parent and their dog happy adventures, with support contact.',
    defaultSubject: 'Order Delivered - #UK-84920',
  },
  {
    id: 'order_status_cancelled',
    name: 'Order Status: Cancelled',
    category: 'Orders',
    description: 'Sent if an order is cancelled, with customer care contact details and cancellation reassurance.',
    defaultSubject: 'Order Cancelled - #UK-84920',
  },
  {
    id: 'newsletter_welcome',
    name: 'Newsletter Welcome Treat',
    category: 'Marketing',
    description: 'Sent upon newsletter subscription or account signup, including the exclusive 10% welcome voucher code.',
    defaultSubject: 'Welcome to MB-Paws! Here is your 10% welcome treat',
  },
  {
    id: 'password_reset',
    name: 'Password Reset Request',
    category: 'Account',
    description: 'Sent when a user requests a password reset link with a 1-hour expiry token and direct button CTA.',
    defaultSubject: 'Password Reset - MB-Paws',
  },
];

export function getMockOrderDetails(overrides?: Partial<OrderDetails>): OrderDetails {
  const defaultOrder: OrderDetails = {
    orderId: 'UK-84920',
    customer: {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'sarah.jenkins@example.co.uk',
      telephone: '+44 7700 900123',
      country: 'United Kingdom',
      city: 'London',
    },
    delivery: {
      type: 'address',
      notes: 'Leave in the porch if out walking the dog.',
      street: 'Kensington High Street',
      streetNumber: '142',
      apartment: 'Flat 4B',
    },
    items: [
      {
        id: 'SKU-HARN-01',
        productId: 'harness-pro',
        productUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mb-paws.co.uk'}/products/reflective-trail-harness`,
        name: 'Reflective All-Weather Dog Harness',
        brand: 'MB-Paws',
        model: 'Pro Trail Series',
        color: 'Forest Green',
        size: 'Medium (M)',
        price: 44.99,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'SKU-LEASH-02',
        productId: 'rope-leash-ridge',
        productUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mb-paws.co.uk'}/products/climbing-rope-leash`,
        name: 'Durable Climbing Rope Lead',
        brand: 'MB-Paws',
        model: 'Ridge 1.8m',
        color: 'Charcoal Black',
        size: '1.8m',
        price: 24.99,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=400&q=80',
      },
    ],
    totals: {
      subtotal: 69.98,
      delivery: 4.99,
      total: 74.97,
    },
    orderDate: new Date().toISOString(),
  };

  return {
    ...defaultOrder,
    ...overrides,
    customer: { ...defaultOrder.customer, ...(overrides?.customer || {}) },
    delivery: { ...defaultOrder.delivery, ...(overrides?.delivery || {}) },
    totals: { ...defaultOrder.totals, ...(overrides?.totals || {}) },
  };
}

export function renderTestEmail(
  templateId: EmailTemplateId,
  options: {
    customData?: Record<string, unknown>;
    language?: Language;
  } = {}
): { subject: string; html: string } {
  const language = options.language || 'en';
  const custom = options.customData || {};

  switch (templateId) {
    case 'order_customer': {
      const order = getMockOrderDetails(custom as Partial<OrderDetails>);
      return generateCustomerOrderEmailHtml(order, language);
    }
    case 'order_admin': {
      const order = getMockOrderDetails(custom as Partial<OrderDetails>);
      return generateAdminOrderEmailHtml(order, language);
    }
    case 'order_status_confirmed': {
      const order = getMockOrderDetails(custom as Partial<OrderDetails>);
      return generateOrderStatusEmailHtml(order, 'confirmed', language);
    }
    case 'order_status_dispatched': {
      const order = getMockOrderDetails(custom as Partial<OrderDetails>);
      return generateOrderStatusEmailHtml(order, 'dispatched', language);
    }
    case 'order_status_delivered': {
      const order = getMockOrderDetails(custom as Partial<OrderDetails>);
      return generateOrderStatusEmailHtml(order, 'delivered', language);
    }
    case 'order_status_cancelled': {
      const order = getMockOrderDetails(custom as Partial<OrderDetails>);
      return generateOrderStatusEmailHtml(order, 'cancelled', language);
    }
    case 'newsletter_welcome': {
      const name = (custom.name as string) || 'Sarah & Buster';
      const discountCode = (custom.discountCode as string) || 'WELCOME10';
      return generateWelcomeEmailHtml({ name, discountCode });
    }
    case 'password_reset': {
      const name = (custom.name as string) || 'Sarah Jenkins';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mb-paws.co.uk';
      const resetToken = (custom.resetToken as string) || 'sample-reset-token-94821';
      const resetUrl = (custom.resetUrl as string) || `${siteUrl}/user/reset-password?token=${resetToken}`;
      return generatePasswordResetEmailHtml({ name, resetToken, resetUrl });
    }
    default:
      throw new Error(`Unknown email template ID: ${templateId}`);
  }
}

export async function sendTestEmail(
  templateId: EmailTemplateId,
  toEmail: string,
  options: {
    customData?: Record<string, unknown>;
    language?: Language;
  } = {}
): Promise<{ success: boolean; subject: string; message: string }> {
  if (!isEmailConfigured()) {
    throw new Error(
      'Email is not configured on the server. Please set RESEND_API_KEY + RESEND_FROM_EMAIL in .env.local, or configure Gmail SMTP credentials.'
    );
  }

  const { subject, html } = renderTestEmail(templateId, options);

  await sendEmail({
    to: toEmail,
    subject: `[TEST] ${subject}`,
    html,
    replyTo: getContactEmail(),
  });

  return {
    success: true,
    subject: `[TEST] ${subject}`,
    message: `Test email successfully dispatched to ${toEmail}`,
  };
}
