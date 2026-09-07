import { logger } from '@/lib/logger';

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_BASE_URL =
  PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth 2.0 access token from PayPal using client credentials.
 * Caches the token until 60 seconds before expiration.
 */
export async function getPaypalAccessToken(): Promise<string> {
  const clientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'PayPal credentials missing. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local.'
    );
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Failed to obtain PayPal access token', {
      status: response.status,
      errorText,
    });
    throw new Error(`PayPal authentication failed: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

export interface PaypalItem {
  name: string;
  quantity: number;
  unitPrice: number;
  sku?: string;
}

export interface CreatePaypalOrderParams {
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  currency?: string;
  items?: PaypalItem[];
  shippingPreference?: 'GET_FROM_FILE' | 'SET_PROVIDED_ADDRESS' | 'NO_SHIPPING';
  providedShippingAddress?: {
    recipientName: string;
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    countryCode?: string;
  };
}

/**
 * Creates an order in PayPal with intent = CAPTURE in GBP.
 */
export async function createPaypalOrder(params: CreatePaypalOrderParams): Promise<{ id: string; [key: string]: any }> {
  const token = await getPaypalAccessToken();

  const currency = params.currency || 'GBP';
  const subtotalFormatted = params.subtotal.toFixed(2);
  const shippingFormatted = params.shipping.toFixed(2);
  const discountFormatted = (params.discount || 0).toFixed(2);
  const totalFormatted = params.total.toFixed(2);

  const breakdown: Record<string, { currency_code: string; value: string }> = {
    item_total: {
      currency_code: currency,
      value: subtotalFormatted,
    },
    shipping: {
      currency_code: currency,
      value: shippingFormatted,
    },
  };

  if (params.discount && params.discount > 0) {
    breakdown.discount = {
      currency_code: currency,
      value: discountFormatted,
    };
  }

  const purchaseUnit: any = {
    amount: {
      currency_code: currency,
      value: totalFormatted,
      breakdown,
    },
    description: 'MB-Paws Order',
  };

  if (params.items && params.items.length > 0) {
    purchaseUnit.items = params.items.map((item) => ({
      name: item.name.substring(0, 127),
      quantity: String(item.quantity),
      unit_amount: {
        currency_code: currency,
        value: item.unitPrice.toFixed(2),
      },
      sku: item.sku ? item.sku.substring(0, 127) : undefined,
    }));
  }

  if (params.providedShippingAddress) {
    purchaseUnit.shipping = {
      name: {
        full_name: params.providedShippingAddress.recipientName,
      },
      address: {
        address_line_1: params.providedShippingAddress.line1,
        address_line_2: params.providedShippingAddress.line2 || undefined,
        admin_area_2: params.providedShippingAddress.city,
        postal_code: params.providedShippingAddress.postalCode,
        country_code: params.providedShippingAddress.countryCode || 'GB',
      },
    };
  }

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [purchaseUnit],
    application_context: {
      brand_name: 'MB-Paws',
      locale: 'en-GB',
      landing_page: 'LOGIN',
      shipping_preference: params.shippingPreference || 'GET_FROM_FILE',
      user_action: 'PAY_NOW',
    },
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();

  if (!response.ok) {
    logger.error('Failed to create PayPal order', { status: response.status, responseData });
    const message =
      responseData?.details?.[0]?.description ||
      responseData?.message ||
      'Failed to initiate PayPal Checkout';
    throw new Error(message);
  }

  return responseData;
}

/**
 * Captures payment for an approved PayPal order.
 */
export async function capturePaypalOrder(paypalOrderId: string): Promise<any> {
  const token = await getPaypalAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    }
  );

  const responseData = await response.json();

  if (!response.ok) {
    logger.error('Failed to capture PayPal order', {
      orderId: paypalOrderId,
      status: response.status,
      responseData,
    });
    const message =
      responseData?.details?.[0]?.description ||
      responseData?.message ||
      'Failed to capture PayPal payment';
    throw new Error(message);
  }

  return responseData;
}
