import { sendEmail, getContactEmail, getAdminNotificationEmails, isEmailConfigured } from '@/lib/mail';
import { logger } from '@/lib/logger';
import { translations, Language } from '@/lib/translations';
import { getShippingEstimateMessage } from '@/lib/order-shipping-estimate';
import type { OrderEmailItem } from '@/lib/order-email-items';

export interface OrderDetails {
  orderId: string;
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    telephone: string;
    country: string;
    city: string;
  };
  delivery: {
    type: string;
    notes: string;
    street?: string;
    streetNumber?: string;
    entrance?: string;
    floor?: string;
    apartment?: string;
    econtOfficeId?: string;
  };
  items: OrderEmailItem[];
  totals: {
    subtotal: number;
    delivery: number;
    total: number;
  };
  orderDate: string;
}

export type OrderStatus = 'confirmed' | 'shipped' | 'dispatched' | 'delivered' | 'cancelled';

function getDeliveryTypeLabel(type: string, language: Language): string {
  const t = translations[language];
  const typeLower = type.toLowerCase();
  if (typeLower === 'office') {
    return t.deliveryOffice;
  } else if (typeLower === 'address') {
    return t.deliveryAddress;
  } else if (typeLower === 'econtomat') {
    return t.deliveryEcontomat || type;
  }
  return type;
}

function renderEmailOrderItemRow(
  item: OrderEmailItem,
  language: Language,
  options: { showSku?: boolean; showProductLink?: boolean } = {}
): string {
  const t = translations[language];
  const { showSku = false, showProductLink = false } = options;
  const variantDetails = [
    item.color,
    item.size ? item.size : '',
    item.type ? item.type : '',
  ]
    .filter(Boolean)
    .join(' • ');

  const titleText = `${item.brand ? `${item.brand} ` : ''}${item.model || item.name}`;
  const productTitle = item.productUrl
    ? `<a href="${item.productUrl}" style="color: #111827; text-decoration: none; font-weight: 700; font-size: 14px; line-height: 1.35;">${titleText}</a>`
    : `<span style="font-weight: 700; color: #111827; font-size: 14px; line-height: 1.35;">${titleText}</span>`;

  const productLink = item.productUrl
    ? `<div style="margin-top: 4px;"><a href="${item.productUrl}" style="color: #4f46e5; text-decoration: none; font-size: 11px; font-weight: 600;">${t.emailViewProduct} &rarr;</a></div>`
    : '';

  const productImage = item.productUrl
    ? `<a href="${item.productUrl}" style="text-decoration: none; display: block;"><img src="${item.imageUrl}" alt="${item.name}" width="64" height="64" style="display: block; width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;" /></a>`
    : `<img src="${item.imageUrl}" alt="${item.name}" width="64" height="64" style="display: block; width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;" />`;

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 1px solid #e5e7eb; margin-bottom: 12px; padding-bottom: 12px;">
      <tr>
        <td width="72" valign="top" style="width: 72px; padding-right: 12px; vertical-align: top;">
          ${productImage}
        </td>
        <td valign="top" style="vertical-align: top;">
          <div style="margin-bottom: 2px;">
            ${productTitle}
          </div>
          ${variantDetails ? `<div style="font-size: 12px; color: #6b7280; line-height: 1.4; margin-bottom: 4px;">${variantDetails}</div>` : ''}
          ${showSku ? `<div style="font-size: 11px; color: #9ca3af; font-family: ui-monospace, monospace; margin-bottom: 4px;">SKU: ${item.id}</div>` : ''}
          ${showProductLink ? productLink : ''}
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 6px;">
            <tr>
              <td style="font-size: 12px; color: #4b5563; vertical-align: middle;">
                <span style="display: inline-block; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 7px; font-weight: 600; color: #1f2937; font-size: 11px;">${item.quantity} &times; &pound;${item.price.toFixed(2)}</span>
              </td>
              <td align="right" style="font-size: 14px; font-weight: 700; color: #111827; vertical-align: middle; white-space: nowrap;">
                &pound;${(item.quantity * item.price).toFixed(2)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function formatOrderDate(dateIso: string, language: Language = 'en', includeTime = false): string {
  try {
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return dateIso;
    const locale = language === 'bg' ? 'bg-BG' : 'en-GB';
    if (includeTime) {
      return d.toLocaleString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateIso;
  }
}

function getValidCustomerEmail(email?: string): string | null {
  const customerEmail = email?.trim() || '';
  if (
    customerEmail.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) &&
    !customerEmail.endsWith('@checkout.local')
  ) {
    return customerEmail;
  }
  return null;
}

export function generateCustomerOrderEmailHtml(
  orderDetails: OrderDetails,
  language: Language = 'en'
): { subject: string; html: string } {
  const t = translations[language];
  const contactEmail = getContactEmail();
  const subject = `${t.emailOrderReceivedSubject} - #${orderDetails.orderId}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${orderDetails.orderId}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f7f7f8; }
        .container { max-width: 600px; margin: 0 auto; padding: 16px 12px; }
        .header { background: linear-gradient(135deg, #18181b 0%, #27272a 100%); color: white; padding: 28px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: white; padding: 24px 20px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 12px 12px; }
        .order-details { background: #fafafa; padding: 16px; border-radius: 10px; margin: 20px 0; border: 1px solid #f0f0f0; }
        .item { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        .item:last-child { border-bottom: none; }
        .total { font-weight: bold; font-size: 16px; color: #18181b; }
        .footer { text-align: center; margin-top: 28px; color: #71717a; font-size: 13px; }
        @media only screen and (max-width: 480px) {
          .container { padding: 8px 4px !important; }
          .header { padding: 20px 14px !important; border-radius: 8px 8px 0 0 !important; }
          .content { padding: 18px 12px !important; border-radius: 0 0 8px 8px !important; }
          .order-details { padding: 12px 10px !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${t.emailThankYouForOrder}</h1>
          <p>${t.orderNumber} #${orderDetails.orderId}</p>
        </div>

        <div class="content">
          <p>Dear ${orderDetails.customer.firstName} ${orderDetails.customer.lastName},</p>

          <p>${t.emailPendingIntro}</p>
          <p><strong>${t.emailPendingAwaitingConfirm}</strong></p>

          <div class="order-details">
            <h3>${t.emailOrderSummary}</h3>

            <div style="margin: 20px 0;">
              ${orderDetails.items.map(item => renderEmailOrderItemRow(item, language)).join('')}
            </div>

            <div class="item">
              <strong>${t.subtotal}:</strong>
              <span>£${orderDetails.totals.subtotal.toFixed(2)}</span>
            </div>

            <div class="item">
              <strong>${t.delivery} (${getDeliveryTypeLabel(orderDetails.delivery.type, language)}):</strong>
              <span>£${orderDetails.totals.delivery.toFixed(2)}</span>
            </div>

            <div class="item total">
              <strong>${t.total}:</strong>
              <span>£${orderDetails.totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div style="margin: 20px 0;">
            <h4>${t.emailDeliveryInformation}</h4>
            <p><strong>${t.emailMethod}</strong> ${getDeliveryTypeLabel(orderDetails.delivery.type, language)}</p>
            ${orderDetails.delivery.type === 'address' && (orderDetails.delivery.street || orderDetails.delivery.streetNumber) ? `
              <p><strong>Address:</strong> 
                ${orderDetails.delivery.street || ''} ${orderDetails.delivery.streetNumber || ''}
                ${orderDetails.delivery.entrance ? `, Entrance ${orderDetails.delivery.entrance}` : ''}
                ${orderDetails.delivery.floor ? `, Floor ${orderDetails.delivery.floor}` : ''}
                ${orderDetails.delivery.apartment ? `, Apt ${orderDetails.delivery.apartment}` : ''}
                <br>
                ${orderDetails.customer.city}, ${orderDetails.customer.country}
              </p>
            ` : orderDetails.delivery.type === 'office' && orderDetails.delivery.econtOfficeId ? `
              <p><strong>${t.econtOffice}:</strong> ${orderDetails.delivery.econtOfficeId}</p>
              <p><strong>${t.emailAddress}</strong> ${orderDetails.customer.city}, ${orderDetails.customer.country}</p>
            ` : `
              <p><strong>${t.emailAddress}</strong> ${orderDetails.customer.city}, ${orderDetails.customer.country}</p>
            `}
            ${orderDetails.delivery.notes ? `<p><strong>${t.emailNotes}</strong> ${orderDetails.delivery.notes}</p>` : ''}
          </div>

          <div style="margin: 20px 0;">
            <h4>${t.emailContactInformation}</h4>
            <p><strong>${t.email}:</strong> ${orderDetails.customer.email}</p>
            <p><strong>${t.emailPhone}</strong> ${orderDetails.customer.telephone}</p>
          </div>

          <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>${t.emailWhatHappensNext}</strong></p>
            <ul>
              <li>${t.emailWillReceiveConfirmation}</li>
              <li>${t.emailOrderProcessed}</li>
              <li>${t.emailPendingAfterConfirm}</li>
            </ul>
          </div>

          <div class="footer">
            <p>${t.emailContactUs} ${contactEmail}</p>
            <p>${t.emailOrderDate} ${formatOrderDate(orderDetails.orderDate, language)}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
}

export async function sendCustomerOrderEmail(orderDetails: OrderDetails, language: Language = 'en'): Promise<void> {
  if (!isEmailConfigured()) {
    logger.warn('Skipping customer order email: email not configured');
    return;
  }

  const customerEmail = getValidCustomerEmail(orderDetails.customer.email);
  if (!customerEmail) {
    logger.debug('Skipping customer order email: no valid customer email');
    return;
  }

  const contactEmail = getContactEmail();
  const { subject, html } = generateCustomerOrderEmailHtml(orderDetails, language);

  await sendEmail({
    to: customerEmail,
    subject,
    html,
    replyTo: contactEmail,
  });

  logger.debug('Customer order email sent');
}

export function generateAdminOrderEmailHtml(
  orderDetails: OrderDetails,
  language: Language = 'en'
): { subject: string; html: string } {
  const t = translations[language];
  const subject = `${t.emailNewOrderReceived} - #${orderDetails.orderId}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order - ${orderDetails.orderId}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f7f7f8; }
        .container { max-width: 600px; margin: 0 auto; padding: 16px 12px; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 28px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: white; padding: 24px 20px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 12px 12px; }
        .order-details { background: #fafafa; padding: 16px; border-radius: 10px; margin: 20px 0; border: 1px solid #f0f0f0; }
        .item { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        .item:last-child { border-bottom: none; }
        .customer-info { background: #fffbeb; border: 1px solid #fef3c7; padding: 14px; border-radius: 8px; margin: 20px 0; }
        .total { font-weight: bold; font-size: 16px; color: #0f172a; }
        @media only screen and (max-width: 480px) {
          .container { padding: 8px 4px !important; }
          .header { padding: 20px 14px !important; border-radius: 8px 8px 0 0 !important; }
          .content { padding: 18px 12px !important; border-radius: 0 0 8px 8px !important; }
          .order-details { padding: 12px 10px !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${t.emailNewOrderReceived}</h1>
          <p>${t.orderNumber} #${orderDetails.orderId}</p>
        </div>

        <div class="content">
          <p>${t.emailAdminAwaitingConfirmation}</p>

          <div class="customer-info">
            <h3>${t.emailCustomerInformation}</h3>
            <p><strong>${t.emailName}</strong> ${orderDetails.customer.firstName} ${orderDetails.customer.lastName}</p>
            <p><strong>${t.email}:</strong> ${orderDetails.customer.email}</p>
            <p><strong>${t.emailPhone}</strong> ${orderDetails.customer.telephone}</p>
            <p><strong>${t.emailAddress}</strong> ${orderDetails.customer.city}, ${orderDetails.customer.country}</p>
          </div>

          <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>${t.emailDeliveryInformation}</h3>
            <p><strong>${t.emailMethod}</strong> ${getDeliveryTypeLabel(orderDetails.delivery.type, language)}</p>
            ${orderDetails.delivery.type === 'address' && (orderDetails.delivery.street || orderDetails.delivery.streetNumber) ? `
              <p><strong>Address:</strong> 
                ${orderDetails.delivery.street || ''} ${orderDetails.delivery.streetNumber || ''}
                ${orderDetails.delivery.entrance ? `, Entrance ${orderDetails.delivery.entrance}` : ''}
                ${orderDetails.delivery.floor ? `, Floor ${orderDetails.delivery.floor}` : ''}
                ${orderDetails.delivery.apartment ? `, Apt ${orderDetails.delivery.apartment}` : ''}
                <br>
                ${orderDetails.customer.city}, ${orderDetails.customer.country}
              </p>
            ` : orderDetails.delivery.type === 'office' && orderDetails.delivery.econtOfficeId ? `
              <p><strong>${t.econtOffice}:</strong> ${orderDetails.delivery.econtOfficeId}</p>
              <p><strong>${t.emailAddress}</strong> ${orderDetails.customer.city}, ${orderDetails.customer.country}</p>
            ` : `
              <p><strong>${t.emailAddress}</strong> ${orderDetails.customer.city}, ${orderDetails.customer.country}</p>
            `}
            ${orderDetails.delivery.notes ? `<p><strong>${t.emailNotes}</strong> ${orderDetails.delivery.notes}</p>` : ''}
          </div>

          <div class="order-details">
            <h3>${t.emailOrderDetails}</h3>

            <div style="margin: 20px 0;">
              ${orderDetails.items.map(item => renderEmailOrderItemRow(item, language, { showSku: true, showProductLink: true })).join('')}
            </div>

            <div class="item">
              <strong>${t.subtotal}:</strong>
              <span>£${orderDetails.totals.subtotal.toFixed(2)}</span>
            </div>

            <div class="item">
              <strong>${t.delivery} (${getDeliveryTypeLabel(orderDetails.delivery.type, language)}):</strong>
              <span>£${orderDetails.totals.delivery.toFixed(2)}</span>
            </div>

            <div class="item total">
              <strong>${t.total}:</strong>
              <span>£${orderDetails.totals.total.toFixed(2)}</span>
            </div>
          </div>

          ${orderDetails.delivery.notes ? `
          <div style="margin: 20px 0;">
            <h4>${t.emailOrderNotes}</h4>
            <p style="background: #f8f9fa; padding: 10px; border-radius: 4px;">${orderDetails.delivery.notes}</p>
          </div>
          ` : ''}

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>${t.emailActionRequired}</strong></p>
            <ul>
              <li>${t.emailProcessOrder}</li>
              <li>${t.emailUpdateInventory}</li>
              <li>${t.emailSendTracking}</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
            <p>${t.emailOrderDate} ${formatOrderDate(orderDetails.orderDate, language, true)}</p>
            <p>${t.emailAutomatedNotification}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
}

export async function sendAdminOrderEmail(orderDetails: OrderDetails, language: Language = 'en'): Promise<void> {
  if (!isEmailConfigured()) {
    logger.warn('Skipping admin order email: email not configured');
    return;
  }

  const { subject, html } = generateAdminOrderEmailHtml(orderDetails, language);

  await sendEmail({
    to: getAdminNotificationEmails(),
    subject,
    html,
  });

  logger.debug('Admin order email sent');
}

export function generateOrderStatusEmailHtml(
  orderDetails: OrderDetails,
  status: OrderStatus,
  language: Language = 'en'
): { subject: string; html: string } {
  const t = translations[language];
  const contactEmail = getContactEmail();
  const emailStatus = status === 'shipped' ? 'dispatched' : status;
  const statusMessages: Record<string, { title: string; message: string; color: string }> = {
    confirmed: {
      title: t.emailOrderConfirmed,
      message: t.emailOrderConfirmedMessage,
      color: '#667eea'
    },
    shipped: {
      title: t.emailOrderDispatched,
      message: t.emailOrderDispatchedMessage,
      color: '#48bb78'
    },
    dispatched: {
      title: t.emailOrderDispatched,
      message: t.emailOrderDispatchedMessage,
      color: '#48bb78'
    },
    delivered: {
      title: t.emailOrderDelivered,
      message: t.emailOrderDeliveredMessage,
      color: '#38a169'
    },
    cancelled: {
      title: t.emailOrderCancelled,
      message: t.emailOrderCancelledMessage,
      color: '#f56565'
    }
  };

  const statusInfo = statusMessages[emailStatus] || statusMessages.confirmed;
  const shippingEstimateHtml =
    emailStatus === 'confirmed'
      ? `
          <div style="background: #eef2ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusInfo.color};">
            <p><strong>${t.emailShippingScheduleTitle}</strong></p>
            <p>${getShippingEstimateMessage(orderDetails.orderDate, language)}</p>
          </div>
        `
      : '';

  const subject = `Order ${statusInfo.title} - #${orderDetails.orderId}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order ${statusInfo.title} - ${orderDetails.orderId}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f7f7f8; }
        .container { max-width: 600px; margin: 0 auto; padding: 16px 12px; }
        .header { background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%); color: white; padding: 28px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: white; padding: 24px 20px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 12px 12px; }
        .order-details { background: #fafafa; padding: 16px; border-radius: 10px; margin: 20px 0; border: 1px solid #f0f0f0; }
        .item { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        .item:last-child { border-bottom: none; }
        .total { font-weight: bold; font-size: 16px; color: ${statusInfo.color}; }
        .footer { text-align: center; margin-top: 28px; color: #71717a; font-size: 13px; }
        .status-badge { display: inline-block; padding: 6px 14px; background: ${statusInfo.color}; color: white; border-radius: 20px; font-weight: bold; font-size: 13px; margin: 8px 0; }
        @media only screen and (max-width: 480px) {
          .container { padding: 8px 4px !important; }
          .header { padding: 20px 14px !important; border-radius: 8px 8px 0 0 !important; }
          .content { padding: 18px 12px !important; border-radius: 0 0 8px 8px !important; }
          .order-details { padding: 12px 10px !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusInfo.title}</h1>
          <p>Order #${orderDetails.orderId}</p>
        </div>

        <div class="content">
          <p>Dear ${orderDetails.customer.firstName} ${orderDetails.customer.lastName},</p>

          <p>${statusInfo.message}</p>

          <div class="order-details">
            <h3>${t.emailOrderSummary}</h3>
            <div class="status-badge">${status === 'confirmed' ? t.confirmed : status === 'shipped' || status === 'dispatched' ? t.shipped : status === 'delivered' ? t.delivered : t.cancelled}</div>

            <div style="margin: 20px 0;">
              ${orderDetails.items.map(item => renderEmailOrderItemRow(item, language)).join('')}
            </div>

            <div class="item total">
              <strong>${t.total}:</strong>
              <span>£${orderDetails.totals.total.toFixed(2)}</span>
            </div>
          </div>

          ${shippingEstimateHtml}

          ${(emailStatus === 'dispatched' || status === 'shipped') ? `
          <div style="background: #e6fffa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusInfo.color};">
            <p><strong>${t.emailTrackingInformation}</strong></p>
            <p>${t.emailOrderOnWay} ${t.emailTrackingDetailsSoon}</p>
          </div>
          ` : ''}

          ${emailStatus === 'delivered' ? `
          <div style="background: #f0fff4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusInfo.color};">
            <p><strong>${t.emailHopeLovePurchase}</strong></p>
            <p>${t.emailContactSupport}</p>
          </div>
          ` : ''}

          ${emailStatus === 'cancelled' ? `
          <div style="background: #fff5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusInfo.color};">
            <p><strong>${t.emailNeedHelp}</strong></p>
            <p>${t.emailQuestionsAboutCancellation}</p>
          </div>
          ` : ''}

          <div class="footer">
            <p>${t.emailContactUs} ${contactEmail}</p>
            <p>${t.emailOrderDate} ${formatOrderDate(orderDetails.orderDate, language)}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
}

export async function sendOrderStatusEmail(
  orderDetails: OrderDetails,
  status: OrderStatus,
  language: Language = 'en'
): Promise<void> {
  if (!isEmailConfigured()) {
    logger.warn('Skipping order status email: email not configured');
    return;
  }

  const customerEmail = getValidCustomerEmail(orderDetails.customer.email);
  if (!customerEmail) {
    logger.debug('Skipping order status email: no valid customer email');
    return;
  }

  const contactEmail = getContactEmail();
  const { subject, html } = generateOrderStatusEmailHtml(orderDetails, status, language);

  await sendEmail({
    to: customerEmail,
    subject,
    html,
    replyTo: contactEmail,
  });

  logger.debug('Order status email sent', { status });
}
