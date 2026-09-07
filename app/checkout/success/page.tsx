'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { CheckCircle, Package, Truck, MapPin, Mail, ArrowRight } from 'lucide-react';

interface OrderItem {
  id: string;
  orderid: string;
  productid: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    images?: string[];
    brand?: string;
    model?: string;
    color?: string;
    size?: string;
  };
}

interface Order {
  orderid: string;
  createdat: string;
  total: number;
  subtotal: number;
  deliverycost: number;
  discountcode?: string;
  discountamount?: number;
  paymentmethod: string;
  deliverystatus: string;
  customerfirstname: string;
  customerlastname: string;
  customeremail: string;
  customertelephone: string;
  customercountry: string;
  customercity: string;
  deliverytype: string;
  econtoffice?: string;
  deliverystreet?: string;
  deliverystreetnumber?: string;
  deliveryentrance?: string;
  deliveryfloor?: string;
  deliveryapartment?: string;
  deliverynotes?: string;
  items?: OrderItem[];
}

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { settings } = useStoreSettings();
  
  const [orderId, setOrderId] = useState<string>('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const pageTitle = 'Order Successful';
    const storeName = settings?.storename || 'MB-Paws';
    document.title = `${pageTitle} - ${storeName}`;
  }, [settings?.storename]);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (!orderIdParam) {
      router.push('/');
      return;
    }

    setOrderId(orderIdParam);
    fetchOrderDetails(orderIdParam);
  }, [searchParams, router]);

  const fetchOrderDetails = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/orders/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        throw new Error('Invalid order data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  const getDeliveryTypeLabel = (type: string) => {
    switch (type) {
      case 'office':
        return 'Collection Point';
      case 'address':
        return 'Tracked Delivery';
      case 'econtomat':
        return 'Parcel Locker';
      default:
        return 'Standard Tracked Delivery';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex flex-col transition-colors duration-300"
        style={{ backgroundColor: theme.colors.background }}
      >
        <Header isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
              style={{ borderColor: theme.colors.primary }}
            />
            <p style={{ color: theme.colors.textSecondary }}>
              Loading order details...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div 
        className="min-h-screen flex flex-col transition-colors duration-300"
        style={{ backgroundColor: theme.colors.background }}
      >
        <Header isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div 
            className="max-w-md w-full rounded-lg p-6 text-center transition-colors duration-300"
            style={{ 
              backgroundColor: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <div className="text-red-500 mb-4">
              <Package size={48} className="mx-auto" />
            </div>
            <h2 
              className="text-xl font-bold mb-2 transition-colors duration-300"
              style={{ color: theme.colors.text }}
            >
              Order Not Found
            </h2>
            <p 
              className="text-sm mb-6 transition-colors duration-300"
              style={{ color: theme.colors.textSecondary }}
            >
              {error || 'Unable to retrieve your order details.'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-lg font-medium transition-colors duration-300"
              style={{
                backgroundColor: theme.colors.primary,
                color: '#fff'
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Header isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin} />
      
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div 
          className="rounded-xl p-6 sm:p-8 mb-8 text-center transition-colors duration-300"
          style={{
            backgroundColor: theme.colors.cardBg,
            border: `1px solid ${theme.colors.border}`,
            boxShadow: theme.effects.shadow
          }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <CheckCircle size={32} />
          </div>
          <h1 
            className="text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-300 uppercase tracking-tight"
            style={{ color: theme.colors.text }}
          >
            Order Placed Successfully!
          </h1>
          <p 
            className="text-sm sm:text-base max-w-md mx-auto transition-colors duration-300 leading-relaxed"
            style={{ color: theme.colors.textSecondary }}
          >
            Thank you for your order! We have received your purchase and will dispatch your items promptly. A confirmation email has been sent to you.
          </p>
        </div>

        <div 
          className="rounded-xl p-6 mb-8 transition-colors duration-300"
          style={{
            backgroundColor: theme.colors.cardBg,
            border: `1px solid ${theme.colors.border}`,
            boxShadow: theme.effects.shadow
          }}
        >
          <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: theme.colors.border }}>
            <h2 
              className="text-lg font-bold uppercase tracking-wider transition-colors duration-300"
              style={{ color: theme.colors.text }}
            >
              Order Summary
            </h2>
            <div className="text-right">
              <span className="text-xs block" style={{ color: theme.colors.textSecondary }}>
                Order Number
              </span>
              <span className="text-sm font-mono font-bold" style={{ color: theme.colors.primary }}>
                #{order.orderid.slice(0, 8)}
              </span>
            </div>
          </div>

          <div className="py-4 text-xs sm:text-sm" style={{ color: theme.colors.textSecondary }}>
            <span>Order Date: {formatDate(order.createdat)}</span>
          </div>

          {/* Ordered Items */}
          {order.items && order.items.length > 0 && (
            <div className="py-4 border-t border-b" style={{ borderColor: theme.colors.border }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: theme.colors.text }}>
                Ordered Items
              </h3>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="font-bold text-neutral-900" style={{ color: theme.colors.text }}>
                        {item.product?.brand || 'MB-Paws'} {item.product?.model || item.product?.name}
                      </p>
                      <p className="text-neutral-500 text-[11px] mt-0.5">
                        {item.product?.color && `Colour: ${item.product.color} · `}
                        {item.product?.size && `Size: ${item.product.size} · `}
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-neutral-900" style={{ color: theme.colors.text }}>
                      £{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="pt-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between" style={{ color: theme.colors.textSecondary }}>
              <span>Subtotal:</span>
              <span className="font-semibold" style={{ color: theme.colors.text }}>
                £{order.subtotal.toFixed(2)}
              </span>
            </div>

            {order.discountcode && order.discountamount && order.discountamount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount ({order.discountcode}):</span>
                <span>-£{order.discountamount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between" style={{ color: theme.colors.textSecondary }}>
              <span>Delivery ({getDeliveryTypeLabel(order.deliverytype)}):</span>
              <span className="font-semibold" style={{ color: theme.colors.text }}>
                {order.deliverycost === 0 ? 'FREE' : `£${order.deliverycost.toFixed(2)}`}
              </span>
            </div>

            <div className="flex justify-between text-base sm:text-lg font-bold pt-3 border-t" style={{ borderColor: theme.colors.border }}>
              <span style={{ color: theme.colors.text }}>Total:</span>
              <span style={{ color: theme.colors.primary }}>£{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Customer & Delivery Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs sm:text-sm">
          {/* Customer */}
          <div 
            className="rounded-xl p-6 transition-colors duration-300"
            style={{
              backgroundColor: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <h3 className="font-bold uppercase tracking-wider mb-3 text-neutral-900" style={{ color: theme.colors.text }}>
              Customer Details
            </h3>
            <div className="space-y-1.5" style={{ color: theme.colors.textSecondary }}>
              <p className="font-bold text-neutral-900" style={{ color: theme.colors.text }}>
                {order.customerfirstname} {order.customerlastname}
              </p>
              <p>{order.customeremail}</p>
              <p>{order.customertelephone}</p>
              <p>{order.customercity}, {order.customercountry || 'United Kingdom'}</p>
            </div>
          </div>

          {/* Delivery */}
          <div 
            className="rounded-xl p-6 transition-colors duration-300"
            style={{
              backgroundColor: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <h3 className="font-bold uppercase tracking-wider mb-3 text-neutral-900" style={{ color: theme.colors.text }}>
              Delivery Information
            </h3>
            <div className="space-y-1.5" style={{ color: theme.colors.textSecondary }}>
              <p><strong style={{ color: theme.colors.text }}>Method:</strong> {getDeliveryTypeLabel(order.deliverytype)}</p>
              {order.deliverystreet && (
                <p><strong style={{ color: theme.colors.text }}>Address:</strong> {order.deliverystreet} {order.deliverystreetnumber || ''}</p>
              )}
              <p>{order.customercity}, {order.customercountry || 'United Kingdom'}</p>
              {order.deliverynotes && (
                <p className="pt-2 border-t mt-2" style={{ borderColor: theme.colors.border }}>
                  <strong style={{ color: theme.colors.text }}>Notes:</strong> {order.deliverynotes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Next Steps Card */}
        <div className="rounded-xl p-6 mb-8 bg-neutral-50 border border-neutral-200">
          <div className="flex items-start gap-3">
            <Mail size={20} className="text-neutral-900 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-neutral-950 text-sm uppercase tracking-wide mb-1">
                What Happens Next?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Your order is being prepared for dispatch. You will receive an email tracking confirmation as soon as your parcel has been handed over to the courier.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex-1 py-3 px-6 rounded-lg bg-neutral-950 text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-colors text-center"
          >
            Continue Shopping
          </button>
          <a
            href={`mailto:${settings?.email || 'support@mb-paws.co.uk'}?subject=Order Question %23${order.orderid.slice(0, 8)}`}
            className="flex-1 py-3 px-6 rounded-lg border border-neutral-300 text-neutral-900 font-bold text-xs uppercase tracking-wider hover:bg-neutral-100 transition-colors text-center"
          >
            Contact Support
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-950 border-r-transparent" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
