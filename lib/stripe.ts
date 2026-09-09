import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia' as any,
      typescript: true,
    })
  : null;

export interface CreateStripeSessionParams {
  orderId: string;
  paymentMethod?: 'klarna' | 'applepay' | 'card';
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    telephone: string;
    city: string;
    country: string;
  };
  delivery: {
    street?: string;
    streetNumber?: string;
    entrance?: string;
    notes?: string;
  };
  items: Array<{
    id: string | number;
    name?: string;
    price: number;
    quantity: number;
    size?: string;
  }>;
  deliveryCost: number;
  discountAmount?: number;
  total: number;
  originUrl?: string;
}

export type CreateKlarnaSessionParams = CreateStripeSessionParams;

/**
 * Creates a Stripe Checkout Session configured for Apple Pay, Card, or Klarna (GBP)
 */
export async function createStripeCheckoutSession(params: CreateStripeSessionParams) {
  if (!stripe) {
    throw new Error(
      'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables (.env.local).'
    );
  }

  const {
    orderId,
    paymentMethod = 'card',
    customer,
    delivery,
    items,
    deliveryCost,
    discountAmount = 0,
    originUrl,
  } = params;

  const siteUrl =
    originUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000';

  // Build line items for Stripe Checkout
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    const itemName = item.name || 'MB-Paws Canine Gear';
    const variantName = item.size ? `${itemName} - Size ${item.size}` : itemName;

    return {
      price_data: {
        currency: 'gbp',
        product_data: {
          name: variantName,
          description: item.size ? `Selected size: ${item.size}` : 'Premium Adventure Canine Gear',
          ...(siteUrl.startsWith('https://')
            ? { images: [`${siteUrl}/products/collar-graphite-grey.jpg`] }
            : {}),
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    };
  });

  // Handle discounts if applied
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined = undefined;
  if (discountAmount > 0) {
    try {
      // Create a one-time coupon for the discount amount in GBP
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100),
        currency: 'gbp',
        duration: 'once',
        name: `Order Discount (£${discountAmount.toFixed(2)})`,
      });
      discounts = [{ coupon: coupon.id }];
    } catch (couponError) {
      console.warn('[Stripe] Failed to create discount coupon, proceeding without coupon:', couponError);
    }
  }

  // Define shipping rate for UK tracked delivery
  const isFreeDelivery = deliveryCost === 0;
  const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: {
          amount: Math.round(deliveryCost * 100),
          currency: 'gbp',
        },
        display_name: isFreeDelivery
          ? 'Free UK Tracked Delivery (Orders over £50)'
          : 'Standard UK Tracked Delivery',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 2 },
          maximum: { unit: 'business_day', value: 3 },
        },
      },
    },
  ];

  // Full UK address string for metadata
  const fullAddress = [
    delivery.street,
    delivery.entrance,
    customer.city,
    delivery.streetNumber, // UK Postcode
    'United Kingdom',
  ]
    .filter(Boolean)
    .join(', ');

  // Determine allowed payment method types
  // Note: 'card' enables Apple Pay, Google Pay, and Debit/Credit Cards in Stripe Checkout
  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    paymentMethod === 'klarna' ? ['klarna'] : ['card'];

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: paymentMethodTypes,
    mode: 'payment',
    line_items: lineItems,
    discounts,
    shipping_options: shippingOptions,
    customer_email: customer.email || undefined,
    client_reference_id: orderId,
    metadata: {
      orderId,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      telephone: customer.telephone,
      shippingAddress: fullAddress,
      paymentGateway: 'stripe',
      paymentMethod,
    },
    success_url: `${siteUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout?cancelled=1&orderId=${encodeURIComponent(orderId)}`,
  });

  return session;
}

// Backwards-compatible alias
export const createKlarnaCheckoutSession = createStripeCheckoutSession;

