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
  const productLink = item.productUrl
    ? `<p style="margin: 8px 0 0;"><a href="${item.productUrl}" style="color: #667eea; text-decoration: none; font-weight: 600;">${t.emailViewProduct}</a><br><small style="color: #666;">${item.productUrl.replace(/^https?:\/\//, '')}</small></p>`
    : '';
  const productTitle = item.productUrl
    ? `<a href="${item.productUrl}" style="color: #333; text-decoration: none;">${item.brand} ${item.model}</a>`
    : `<strong>${item.brand} ${item.model}</strong>`;
  const productImage = item.productUrl
    ? `<a href="${item.productUrl}" style="text-decoration: none;"><img src="${item.imageUrl}" alt="${item.name}" width="72" height="72" style="display: block; object-fit: cover; border-radius: 8px; border: 1px solid #eee;" /></a>`
    : `<img src="${item.imageUrl}" alt="${item.name}" width="72" height="72" style="display: block; object-fit: cover; border-radius: 8px; border: 1px solid #eee;" />`;

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 1px solid #eee;">
      <tr>
        <td width="84" valign="top" style="padding: 12px 12px 12px 0;">
          ${productImage}
        </td>
        <td valign="top" style="padding: 12px 0;">
          ${productTitle}<br>
          <small>${variantDetails}</small>
          ${showSku ? `<br><small>SKU: ${item.id}</small>` : ''}
          ${showProductLink ? productLink : ''}
        </td>
        <td valign="top" align="right" style="padding: 12px 0; white-space: nowrap;">
          <div>${item.quantity} × £${item.price.toFixed(2)}</div>
          <div style="font-weight: bold;">£${(item.quantity * item.price).toFixed(2)}</div>
        </td>
      </tr>
    </table>
  `;
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
      <title>Order Confirmation - ${orderDetails.orderId}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
        .order-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .item:last-child { border-bottom: none; }
        .total { font-weight: bold; font-size: 18px; color: #667eea; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
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
            <p>${t.emailOrderDate} ${new Date(orderDetails.orderDate).toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-US')}</p>
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
      <title>New Order - ${orderDetails.orderId}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
        .order-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .item:last-child { border-bottom: none; }
        .customer-info { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .total { font-weight: bold; font-size: 18px; color: #ee5a24; }
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
            <p>${t.emailOrderDate} ${new Date(orderDetails.orderDate).toLocaleString(language === 'bg' ? 'bg-BG' : 'en-US')}</p>
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
      <title>Order ${statusInfo.title} - ${orderDetails.orderId}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
        .order-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .item:last-child { border-bottom: none; }
        .total { font-weight: bold; font-size: 18px; color: ${statusInfo.color}; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .status-badge { display: inline-block; padding: 8px 16px; background: ${statusInfo.color}; color: white; border-radius: 20px; font-weight: bold; margin: 10px 0; }
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
            <p>${t.emailOrderDate} ${new Date(orderDetails.orderDate).toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-US')}</p>
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
