'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PublicPageLayout from '@/components/PublicPageLayout';
import LoadingScreen from '@/components/LoadingScreen';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useCheckoutStore, type DeliveryType, type CityOption } from '@/store/checkoutStore';
import { translations } from '@/lib/translations';
import { ShoppingBag, Truck, MapPin, Package, ShieldCheck, Tag, CheckCircle2, Loader2 } from 'lucide-react';
import FomoBadge, { type FomoMessage } from '@/components/FomoBadge';
import { trackStoreEvent } from '@/lib/vercel-analytics';
import { ApplePayIcon, PayPalIcon, KlarnaBadgeIcon, PaymentBadgesRow } from '@/components/PaymentIcons';
import PayPalButtons from '@/components/PayPalButtons';
import GoogleAddressAutocomplete from '@/components/GoogleAddressAutocomplete';

const CHECKOUT_FOMO_MESSAGES: FomoMessage[] = [
  {
    text: 'Your items are not reserved until checkout is completed',
    tone: 'warning'
  },
  {
    text: 'Stock is limited — complete your order soon',
    tone: 'warning'
  },
  {
    text: 'Customers completed checkout in the last 10 minutes',
    tone: 'success'
  },
  {
    text: 'Fast checkout — most orders complete in under 1 minute',
    tone: 'success'
  },
  {
    text: 'Order now to dispatch promptly',
    tone: 'neutral'
  },
  {
    text: 'Checkout now for faster delivery',
    tone: 'neutral'
  }
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { items, totalItems, totalPrice, clearCart, hasHydrated } = useCart();
  const { settings } = useStoreSettings();
  const { user, isAuthenticated } = useAuth();
  const t = translations[language];
  const searchMethod = searchParams.get('paymentMethod');
  const [paymentMethod, setPaymentMethod] = useState<'applepay' | 'paypal' | 'card' | 'klarna'>(
    searchMethod === 'paypal' ? 'paypal' :
    searchMethod === 'card' ? 'card' :
    searchMethod === 'klarna' ? 'klarna' : 'applepay'
  );

  useEffect(() => {
    if (searchMethod === 'paypal') setPaymentMethod('paypal');
    else if (searchMethod === 'card') setPaymentMethod('card');
    else if (searchMethod === 'klarna') setPaymentMethod('klarna');
    else if (searchMethod === 'applepay') setPaymentMethod('applepay');
  }, [searchMethod]);

  useEffect(() => {
    const pageTitle = t.checkout || 'Checkout';
    const storeName = settings?.storename || '';
    document.title = storeName ? `${pageTitle} - ${storeName}` : pageTitle;
  }, [language, t, settings?.storename]);
  const {
    formData,
    cities,
    isSubmitting,
    isValidatingStock,
    error,
    insufficientStock,
    appliedDiscount,
    discountValidating,
    discountError,
    updateFormData,
    setCities,
    setSubmitting,
    setValidatingStock,
    setError,
    setInsufficientStock,
    resetForm,
    isFormValid,
    fullName,
    validateDiscount,
    removeDiscount,
    discountedTotal
  } = useCheckoutStore();

  const [isAdmin, setIsAdmin] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    telephone?: string;
    email?: string;
    street?: string;
    streetNumber?: string;
    city?: string;
  }>({});
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const hasAutoPopulated = useRef(false);
  const placeOrderButtonRef = useRef<HTMLButtonElement>(null);
  const beginCheckoutTracked = useRef(false);

  const [checkoutNewsletterEmail, setCheckoutNewsletterEmail] = useState('');
  const [checkoutNewsletterLoading, setCheckoutNewsletterLoading] = useState(false);
  const [checkoutNewsletterMsg, setCheckoutNewsletterMsg] = useState<string | null>(null);
  const [showManualCodeInput, setShowManualCodeInput] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');

  const scrollToCheckoutIssue = () => {
    const firstInvalid = document.querySelector('[data-checkout-field-error], .border-red-500');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    placeOrderButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }

    // Wait for cart rehydration before treating an empty cart as empty
    if (!hasHydrated) {
      return;
    }

    // Redirect if cart is empty
    if (totalItems === 0) {
      router.push('/');
      return;
    }

    // Load cities data
    loadCities();
  }, [hasHydrated, totalItems, router]);

  // Auto-apply discount from URL (e.g. from welcome email link ?discount=WELCOME10)
  useEffect(() => {
    const urlDiscount = searchParams.get('discount') || searchParams.get('code');
    if (urlDiscount && !appliedDiscount && totalPrice > 0) {
      const code = urlDiscount.trim().toUpperCase();
      updateFormData({ discountCode: code });
      validateDiscount(totalPrice);
    }
  }, [searchParams, appliedDiscount, totalPrice, updateFormData, validateDiscount]);

  useEffect(() => {
    if (!hasHydrated || totalItems === 0 || beginCheckoutTracked.current) return;
    beginCheckoutTracked.current = true;
    trackStoreEvent('Begin Checkout', {
      itemCount: totalItems,
      cartValue: Math.round(totalPrice * 100) / 100,
      currency: 'GBP',
    });
  }, [hasHydrated, totalItems, totalPrice]);

  // Auto-populate form with user data when logged in (only once)
  useEffect(() => {
    if (isAuthenticated && user && !hasAutoPopulated.current) {
      // Only populate if form is empty (first time loading)
      const shouldPopulate = !formData.firstName && !formData.email && !formData.telephone;
      
      if (shouldPopulate) {
        hasAutoPopulated.current = true;
        
        // Split name into first and last name
        // If there's a second name (or more), put it in the surname field
        const nameParts = user.name ? user.name.trim().split(/\s+/).filter(part => part.length > 0) : [];
        let firstName = '';
        let lastName = '';
        
        if (nameParts.length > 0) {
          firstName = nameParts[0];
          // If there's a second name or more, put everything after the first name in the surname field
          if (nameParts.length > 1) {
            lastName = nameParts.slice(1).join(' ');
          }
        }

        // Prioritize preferred delivery data, fallback to locationText parsing
        let city = user.preferredCity || '';
        let street = user.preferredStreet || '';
        let streetNumber = user.preferredStreetNumber || '';

        // Normalize city name - if it's in display format like "London [EC1A]", keep it for the form
        // but we'll handle matching in the office selection logic
        if (city) {
          // Keep the city as saved, but ensure it's trimmed
          city = city.trim();
        }

        // If no preferred city, try to extract from locationText
        if (!city && user.locationText) {
          const locationParts = user.locationText.split(',').map(part => part.trim());
          if (locationParts.length > 0) {
            city = locationParts[0];
          }
          if (locationParts.length > 1 && !street) {
            const streetPart = locationParts[1];
            const streetMatch = streetPart.match(/^(.+?)\s+(\d+.*)$/);
            if (streetMatch) {
              street = streetMatch[1];
              streetNumber = streetMatch[2];
            } else {
              street = streetPart;
            }
          }
        }

        // Get delivery type from user preferences, default to 'office'
        const deliveryType = (user.preferredDeliveryType as 'office' | 'address' | 'econtomat') || 'office';

        // Prepare form data with all user information and delivery preferences
        const formUpdate: any = {
          firstName: firstName,
          lastName: lastName,
          email: user.email || '',
          telephone: user.phone || '',
          city: city,
          notes: user.addressInstructions || '',
          // Delivery preferences
          deliveryType: deliveryType,
        };

        // Add delivery-specific fields for UK address
        formUpdate.street = street;
        formUpdate.streetNumber = streetNumber;
        formUpdate.entrance = user.preferredEntrance || '';

        // Update form data
        updateFormData(formUpdate);
      }
    }
  }, [isAuthenticated, user, formData.firstName, formData.email, formData.telephone, updateFormData]);

  const loadCities = async () => {
    const ukCities: CityOption[] = [
      { name: 'London', postcode: 'SW1A', displayName: 'London' },
      { name: 'Manchester', postcode: 'M1', displayName: 'Manchester' },
      { name: 'Birmingham', postcode: 'B1', displayName: 'Birmingham' },
      { name: 'Leeds', postcode: 'LS1', displayName: 'Leeds' },
      { name: 'Glasgow', postcode: 'G1', displayName: 'Glasgow' },
      { name: 'Edinburgh', postcode: 'EH1', displayName: 'Edinburgh' },
      { name: 'Liverpool', postcode: 'L1', displayName: 'Liverpool' },
      { name: 'Bristol', postcode: 'BS1', displayName: 'Bristol' },
      { name: 'Sheffield', postcode: 'S1', displayName: 'Sheffield' },
      { name: 'Newcastle upon Tyne', postcode: 'NE1', displayName: 'Newcastle upon Tyne' },
      { name: 'Cardiff', postcode: 'CF10', displayName: 'Cardiff' },
      { name: 'Belfast', postcode: 'BT1', displayName: 'Belfast' },
      { name: 'Nottingham', postcode: 'NG1', displayName: 'Nottingham' },
      { name: 'Southampton', postcode: 'SO14', displayName: 'Southampton' },
      { name: 'Brighton', postcode: 'BN1', displayName: 'Brighton' },
      { name: 'Oxford', postcode: 'OX1', displayName: 'Oxford' },
      { name: 'Cambridge', postcode: 'CB1', displayName: 'Cambridge' },
      { name: 'York', postcode: 'YO1', displayName: 'York' },
      { name: 'Bath', postcode: 'BA1', displayName: 'Bath' },
      { name: 'Exeter', postcode: 'EX1', displayName: 'Exeter' },
      { name: 'Norwich', postcode: 'NR1', displayName: 'Norwich' },
      { name: 'Plymouth', postcode: 'PL1', displayName: 'Plymouth' },
      { name: 'Leicester', postcode: 'LE1', displayName: 'Leicester' },
      { name: 'Coventry', postcode: 'CV1', displayName: 'Coventry' },
      { name: 'Aberdeen', postcode: 'AB10', displayName: 'Aberdeen' },
      { name: 'Swansea', postcode: 'SA1', displayName: 'Swansea' }
    ];

    setCities(ukCities);
  };

  // Validation functions
  const validatePhone = (phone: string): boolean => {
    if (!phone || phone.trim() === '') return false;
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^(\+?[0-9]{8,15})$/.test(cleaned);
  };

  const validateEmail = (email: string): boolean => {
    if (!email || email.trim() === '') return false;
    
    // Standard email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleInputChange = (field: string, value: string) => {
    updateFormData({ [field]: value });
    
    // Clear validation error when user starts typing
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof typeof validationErrors];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: string, value: string) => {
    let error: string | undefined;
    
    if (field === 'telephone') {
      if (value && value.trim() !== '' && !validatePhone(value)) {
        error = t.invalidPhone;
      }
    } else if (field === 'email') {
      if (value && value.trim() !== '' && !validateEmail(value)) {
        error = t.invalidEmail;
      }
    }
    
    if (error) {
      setValidationErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof typeof validationErrors];
        return newErrors;
      });
    }
  };

  const handleApplyDiscount = () => {
    if (formData.discountCode?.trim()) {
      validateDiscount(totalPrice);
    } else {
      removeDiscount();
    }
  };

  const handleCheckoutNewsletterSubscribe = async () => {
    const emailToUse = checkoutNewsletterEmail.trim() || formData.email.trim();
    if (!emailToUse || !validateEmail(emailToUse)) {
      setCheckoutNewsletterMsg('Please enter a valid email address.');
      return;
    }

    setCheckoutNewsletterLoading(true);
    setCheckoutNewsletterMsg(null);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToUse,
          source: 'checkout',
        }),
      });

      const data = await response.json();
      if (data.success) {
        updateFormData({ discountCode: data.code || 'WELCOME10' });
        await validateDiscount(totalPrice);
        setCheckoutNewsletterMsg('10% welcome discount applied! We have also emailed your confirmation.');
      } else {
        setCheckoutNewsletterMsg(data.error || 'Could not apply discount.');
      }
    } catch {
      setCheckoutNewsletterMsg('Failed to subscribe. Please try again.');
    } finally {
      setCheckoutNewsletterLoading(false);
    }
  };

  const handleManualDiscountApply = async () => {
    if (!manualCodeInput.trim()) return;
    updateFormData({ discountCode: manualCodeInput.trim().toUpperCase() });
    await validateDiscount(totalPrice);
  };

  const handleDeliveryTypeChange = (deliveryType: DeliveryType) => {
    updateFormData({ deliveryType });
    
    // Clear validation errors when delivery type changes
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.street;
      delete newErrors.streetNumber;
      return newErrors;
    });
  };

  const getDeliveryCost = (deliveryType: DeliveryType) => {
    // UK Tracked Delivery: Free over £50, else £3.99
    if (totalPrice >= 50) return 0.0;
    return 3.99;
  };

  const deliveryCost = getDeliveryCost(formData.deliveryType);
  const finalTotal = discountedTotal(totalPrice, deliveryCost);

  const [expressApplePayLoading, setExpressApplePayLoading] = useState(false);

  const handleExpressApplePay = async () => {
    if (items.length === 0) {
      setError('Your bag is empty. Please add items to check out.');
      return;
    }

    try {
      setExpressApplePayLoading(true);
      setError(null);

      // Create express order in database (no phone or manual address required upfront)
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            firstName: formData.firstName || 'Apple Pay',
            lastName: formData.lastName || 'Customer',
            email: formData.email || '',
            telephone: formData.telephone || '',
            country: 'United Kingdom',
            city: formData.city || 'United Kingdom',
          },
          delivery: {
            type: 'address',
            notes: 'Express Checkout (Apple Pay)',
            street: formData.street || 'Pending Apple Pay delivery address',
            streetNumber: formData.streetNumber || '',
          },
          items: items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            size: item.size,
            price: item.price,
          })),
          totals: {
            subtotal: totalPrice,
            delivery: deliveryCost,
            discount: appliedDiscount?.discountAmount || 0,
            total: finalTotal,
          },
          discount: appliedDiscount ? {
            code: appliedDiscount.code,
            type: appliedDiscount.type,
            value: appliedDiscount.value,
            amount: appliedDiscount.discountAmount,
          } : null,
          payment: {
            method: 'applepay',
          },
        }),
      });

      const orderResult = await orderRes.json();
      if (!orderResult.success || !orderResult.orderId) {
        throw new Error(orderResult.error || 'Failed to initialize order');
      }

      // Initialize Stripe Checkout Session with isExpress: true so Apple Pay collects address & contact
      const stripeRes = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderResult.orderId,
          paymentMethod: 'applepay',
          isExpress: true,
          customer: {
            firstName: formData.firstName || 'Apple Pay',
            lastName: formData.lastName || 'Customer',
            email: formData.email || undefined,
            telephone: formData.telephone || '',
            city: formData.city || '',
            country: 'GB',
          },
          delivery: {
            street: formData.street || '',
            streetNumber: formData.streetNumber || '',
          },
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
          })),
          totals: {
            delivery: deliveryCost,
            total: finalTotal,
          },
          discount: appliedDiscount,
        }),
      });

      const stripeData = await stripeRes.json();
      if (stripeData.success && stripeData.url) {
        clearCart();
        window.location.href = stripeData.url;
      } else {
        throw new Error(stripeData.error || 'Failed to initialize Apple Pay session');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to launch Apple Pay');
      setExpressApplePayLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    // Validate phone and email before submission (phone is optional for UK checkout)
    const phoneError =
      formData.telephone && formData.telephone.trim() !== '' && !validatePhone(formData.telephone)
        ? t.invalidPhone
        : undefined;
    
    const emailError =
      formData.email && formData.email.trim() !== '' && !validateEmail(formData.email)
        ? t.invalidEmail
        : undefined;

    if (phoneError || emailError) {
      setValidationErrors({
        telephone: phoneError,
        email: emailError
      });
      setError(t.pleaseFillAllRequiredFields || 'Please fill in all required fields');
      scrollToCheckoutIssue();
      return;
    }

    if (!isFormValid()) {
      setError(t.pleaseFillAllRequiredFields || 'Please fill in all required fields');
      scrollToCheckoutIssue();
      return;
    }

    // Validate UK address fields
    const addressErrors: any = {};
    if (!formData.street || !formData.street.trim()) {
      addressErrors.street = 'Address Line 1 is required';
    }
    if (!formData.streetNumber || !formData.streetNumber.trim()) {
      addressErrors.streetNumber = 'Postcode is required';
    }
    if (!formData.city || !formData.city.trim()) {
      addressErrors.city = 'Town / City is required';
    }

    if (Object.keys(addressErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...addressErrors }));
      setError('Please fill in all required address fields');
      scrollToCheckoutIssue();
      return;
    }

    // Temporarily commented out stock validation
    setError(null);

    try {
      setSubmitting(true);

      // Prepare order data
      const orderData = {
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          telephone: formData.telephone,
          country: formData.country,
          city: formData.city,
        },
        delivery: {
          type: formData.deliveryType,
          notes: formData.notes,
          missingEcontOffice: formData.missingEcontOffice,
          econtOfficeId: formData.econtOfficeId,
          street: formData.street,
          streetNumber: formData.streetNumber,
          entrance: formData.entrance,
          floor: formData.floor,
          apartment: formData.apartment,
        },
        items: items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          size: item.size,
          price: item.price
        })),
        totals: {
          subtotal: totalPrice,
          discount: appliedDiscount ? appliedDiscount.discountAmount : 0,
          delivery: deliveryCost,
          total: finalTotal,
        },
        discount: appliedDiscount ? {
          code: appliedDiscount.code,
          type: appliedDiscount.type,
          value: appliedDiscount.value,
          amount: appliedDiscount.discountAmount,
        } : null,
        payment: {
          method: paymentMethod,
        },
      };

      // Submit order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      let orderResult;
      const responseText = await orderResponse.text();

      try {
        orderResult = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}...`);
      }

      if (!orderResponse.ok) {
        const errorMessage = orderResult?.error || `HTTP ${orderResponse.status}: ${orderResponse.statusText}`;
        const errorDetails = orderResult?.details ? ` (${orderResult.details})` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to place order');
      }

      trackStoreEvent('Purchase', {
        orderId: String(orderResult.orderId),
        itemCount: totalItems,
        value: Math.round(finalTotal * 100) / 100,
        currency: 'GBP',
        deliveryType: formData.deliveryType,
        hasDiscount: Boolean(appliedDiscount),
      });

      // Save delivery preferences if user is logged in and preferences are different or empty
      if (isAuthenticated && user) {
        const shouldUpdatePreferences = 
          !user.preferredDeliveryType || 
          !user.preferredCity ||
          user.preferredDeliveryType !== formData.deliveryType ||
          user.preferredCity !== formData.city ||
          (formData.deliveryType === 'office' && user.preferredEcontOfficeId !== formData.econtOfficeId) ||
          (formData.deliveryType === 'address' && (
            user.preferredStreet !== formData.street ||
            user.preferredStreetNumber !== formData.streetNumber
          ));

        if (shouldUpdatePreferences) {
          try {
            await fetch('/api/user/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                preferredDeliveryType: formData.deliveryType,
                preferredEcontOfficeId: formData.deliveryType === 'office' ? (formData.econtOfficeId || null) : null,
                preferredCity: formData.city || null,
                preferredStreet: formData.deliveryType === 'address' ? (formData.street || null) : null,
                preferredStreetNumber: formData.deliveryType === 'address' ? (formData.streetNumber || null) : null,
                preferredEntrance: formData.deliveryType === 'address' ? (formData.entrance || null) : null,
                preferredFloor: formData.deliveryType === 'address' ? (formData.floor || null) : null,
                preferredApartment: formData.deliveryType === 'address' ? (formData.apartment || null) : null
              })
            });
            // Note: We don't update the user context here as the redirect will happen
            // The user will see updated preferences on next login or page refresh
          } catch {
            // Don't fail the order if preference save fails
          }
        }
      }

      // If Stripe payment method is selected (applepay, card, klarna), initialize Stripe Checkout Session
      if (paymentMethod === 'applepay' || paymentMethod === 'card' || paymentMethod === 'klarna') {
        const stripeRes = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderResult.orderId,
            paymentMethod,
            customer: orderData.customer,
            delivery: orderData.delivery,
            items: items.map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              size: item.size,
            })),
            totals: orderData.totals,
            discount: orderData.discount,
          }),
        });

        const stripeData = await stripeRes.json();

        if (stripeData.success && stripeData.url) {
          clearCart();
          resetForm();
          window.location.href = stripeData.url;
          return;
        } else if (stripeData.isConfigError) {
          setError(
            'Payment service configuration issue: Please check your STRIPE_SECRET_KEY in .env.local.'
          );
          setSubmitting(false);
          return;
        } else {
          throw new Error(stripeData.error || 'Failed to initialize payment session');
        }
      }

      // Default redirect to success page
      window.location.href = `/checkout/success?orderId=${orderResult.orderId}`;
      
      clearCart();
      resetForm();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setValidatingStock(false);
      setSubmitting(false);
    }
  };

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  if (!hasHydrated) {
    return (
      <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
        <div className="flex-1 flex items-center justify-center py-24">
          <p style={{ color: theme.colors.textSecondary }}>
            Loading...
          </p>
        </div>
      </PublicPageLayout>
    );
  }

  if (totalItems === 0) {
    return null; // Will redirect in useEffect
  }



  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          <div className="mb-8">
            <h1
              className="font-serif-display text-3xl sm:text-4xl mb-2"
              style={{ color: theme.colors.text }}
            >
              {t.checkout}
            </h1>
            <div className="flex items-center gap-2" style={{ color: theme.colors.textSecondary }}>
              <ShoppingBag size={20} />
              <span>{totalItems} {t.itemsInCart}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Form (Desktop) / Top (Mobile) */}
            <div className="order-1 lg:order-1 space-y-6">
              {/* Express Checkout Section */}
              <div
                className="rounded-2xl border p-5 sm:p-6"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  boxShadow: theme.effects.shadow,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2
                    className="font-serif-display text-lg sm:text-xl font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    Express Checkout
                  </h2>
                  <span className="text-xs text-neutral-500 font-medium">1-Click Fast Pay</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 items-center">
                  <button
                    type="button"
                    onClick={handleExpressApplePay}
                    disabled={expressApplePayLoading}
                    className="h-12 rounded-xl flex items-center justify-center gap-1.5 transition-all border border-black bg-black text-white hover:bg-neutral-900 active:scale-98 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {expressApplePayLoading ? (
                      <span className="text-xs font-medium">Opening Apple Pay...</span>
                    ) : (
                      <>
                        <span className="text-xs font-medium mr-1">Pay with</span>
                        <ApplePayIcon className="h-5 w-auto" variant="light" />
                      </>
                    )}
                  </button>

                  <div className="h-12 flex items-center justify-center overflow-hidden rounded-xl">
                    <PayPalButtons
                      mode="checkout"
                      checkoutData={{
                        items,
                        totals: {
                          subtotal: totalPrice,
                          delivery: deliveryCost,
                          discount: appliedDiscount?.discountAmount || 0,
                          total: finalTotal,
                        },
                        discount: appliedDiscount,
                        providedShippingAddress: formData.street ? {
                          recipientName: `${formData.firstName} ${formData.lastName}`.trim(),
                          line1: formData.street,
                          line2: formData.streetNumber || undefined,
                          city: formData.city || 'United Kingdom',
                          postalCode: formData.streetNumber || '',
                          countryCode: 'GB',
                        } : undefined,
                      }}
                      onValidate={() => true}
                      onSuccess={(orderId) => {
                        clearCart();
                        resetForm();
                        window.location.href = `/checkout/success?orderId=${orderId}`;
                      }}
                      onError={(err) => setError(err)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-neutral-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Or pay with card / Klarna below
                  </span>
                  <div className="flex-grow border-t border-neutral-200"></div>
                </div>
              </div>

              <div
                className="rounded-2xl border p-5 sm:p-6"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  boxShadow: theme.effects.shadow,
                }}
              >
                <h2
                  className="font-serif-display text-xl sm:text-2xl mb-6"
                  style={{ color: theme.colors.text }}
                >
                  {t.customerInformation}
                </h2>

                <div className="space-y-6">
                  {/* Order Notes */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                      {t.orderNotes}
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder={t.orderNotesPlaceholder}
                      rows={3}
                      className="w-full px-3 py-2 border border-[#e8e4dc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461]"
                    />
                  </div>

                  {/* Discount Code */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                      {t.discountCode}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.discountCode || ''}
                        onChange={(e) => handleInputChange('discountCode', e.target.value.toUpperCase())}
                        placeholder={t.enterDiscountCode}
                        className="flex-1 px-3 py-2 border border-[#e8e4dc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyDiscount}
                        disabled={discountValidating || !formData.discountCode?.trim()}
                        className="px-4 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        {discountValidating ? t.applyingDiscount : t.applyDiscount}
                      </button>
                    </div>

                    {/* Discount Messages */}
                    {appliedDiscount && (
                      <div
                        className="mt-2 p-2 rounded-xl"
                        style={{
                          backgroundColor: `${theme.colors.primary}15`,
                          border: `1px solid ${theme.colors.primary}40`,
                        }}
                      >
                        <p className="text-sm" style={{ color: theme.colors.primary }}>
                          ✓ {appliedDiscount.description || `${appliedDiscount.code} ${t.discountApplied}`}
                          {appliedDiscount.type === 'percentage'
                            ? ` (${appliedDiscount.value}% ${t.amountOff})`
                            : ` (£${appliedDiscount.discountAmount.toFixed(2)} ${t.amountOff})`
                          }
                        </p>
                        <button
                          onClick={removeDiscount}
                          className="text-xs underline mt-1 transition-opacity hover:opacity-70"
                          style={{ color: theme.colors.primary }}
                        >
                          {t.removeDiscount}
                        </button>
                      </div>
                    )}

                    {discountError && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-sm text-red-700">✗ {
                          discountError === 'Invalid or expired discount code' ? t.invalidDiscountCode :
                          discountError === 'Discount code has expired' ? t.expiredDiscountCode :
                          discountError === 'Discount code is required' ? t.discountCodeRequiredMsg :
                          discountError === 'Invalid discount code format' ? t.discountCodeFormatError :
                          discountError
                        }</p>
                      </div>
                    )}
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                        {t.firstName} *
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-[#e8e4dc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                        {t.lastName} *
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-[#e8e4dc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461]"
                        required
                      />
                    </div>
                  </div>

                  {/* Contact Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                        {t.telephone} <span className="text-xs text-neutral-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.telephone || ''}
                        onChange={(e) => handleInputChange('telephone', e.target.value)}
                        onBlur={(e) => handleBlur('telephone', e.target.value)}
                        placeholder="07123 456789 or +44 7123 456789"
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461] ${
                          validationErrors.telephone ? 'border-red-500' : 'border-[#e8e4dc]'
                        }`}
                      />
                      {validationErrors.telephone && (
                        <p className="text-red-500 text-xs mt-1" data-checkout-field-error>{validationErrors.telephone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                        {t.email}
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        onBlur={(e) => handleBlur('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461] ${
                          validationErrors.email ? 'border-red-500' : 'border-[#e8e4dc]'
                        }`}
                      />
                      {validationErrors.email && (
                        <p className="text-red-500 text-xs mt-1" data-checkout-field-error>{validationErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery Method Card (Only Address) */}
                  <div className="p-4 bg-neutral-50/80 border border-neutral-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
                        <Truck size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-neutral-950">
                          Direct Tracked Delivery
                        </div>
                        <div className="text-xs text-neutral-500">
                          {totalPrice >= 50 ? 'Free Delivery (orders over £50)' : 'Standard Tracked Delivery (£3.99)'} · Direct to your door
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-neutral-900">
                      {totalPrice >= 50 ? 'FREE' : '£3.99'}
                    </span>
                  </div>

                  {/* UK Delivery Address Details */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                      <h3 className="text-base font-bold text-neutral-950">UK Delivery Address</h3>
                      <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded border border-neutral-200">
                        United Kingdom
                      </span>
                    </div>

                    {/* Address Line 1 with Google Autocomplete */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                        Address Line 1 (Street &amp; House Number) *
                      </label>
                      <GoogleAddressAutocomplete
                        value={formData.street || ''}
                        onChange={(value) => handleInputChange('street', value)}
                        onAddressSelect={(fields) => {
                          updateFormData({
                            street: fields.street,
                            entrance: fields.addressLine2 || formData.entrance || '',
                            city: fields.city || formData.city || '',
                            streetNumber: fields.postcode || formData.streetNumber || '',
                          });
                          setValidationErrors((prev) => {
                            const n = { ...prev };
                            delete n.street;
                            delete n.streetNumber;
                            delete n.city;
                            return n;
                          });
                        }}
                        placeholder="e.g. 10 High Street or start typing..."
                        required
                        hasError={Boolean(validationErrors.street)}
                      />
                      {validationErrors.street && (
                        <p className="text-red-500 text-xs mt-1" data-checkout-field-error>{validationErrors.street}</p>
                      )}
                    </div>

                    {/* Address Line 2 (Optional) */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                        Address Line 2 (Flat, suite, unit, etc. - Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.entrance || ''}
                        onChange={(e) => handleInputChange('entrance', e.target.value)}
                        placeholder="e.g. Flat 3B or Building C"
                        autoComplete="shipping address-line2"
                        className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 transition-all"
                      />
                    </div>

                    {/* Town/City and Postcode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                          Town / City *
                        </label>
                        <input
                          type="text"
                          value={formData.city || ''}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="e.g. London"
                          autoComplete="shipping address-level2"
                          required
                          className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 transition-all ${
                            validationErrors.city ? 'border-red-500' : 'border-neutral-300'
                          }`}
                        />
                        {validationErrors.city && (
                          <p className="text-red-500 text-xs mt-1" data-checkout-field-error>{validationErrors.city}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                          Postcode *
                        </label>
                        <input
                          type="text"
                          value={formData.streetNumber || ''}
                          onChange={(e) => handleInputChange('streetNumber', e.target.value.toUpperCase())}
                          placeholder="e.g. SW1A 1AA"
                          autoComplete="shipping postal-code"
                          required
                          className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 uppercase transition-all ${
                            validationErrors.streetNumber ? 'border-red-500' : 'border-neutral-300'
                          }`}
                        />
                        {validationErrors.streetNumber && (
                          <p className="text-red-500 text-xs mt-1" data-checkout-field-error>{validationErrors.streetNumber}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="pt-6 border-t border-neutral-200">
                    <h3 className="text-base font-bold text-neutral-950 mb-3">
                      Payment Method
                    </h3>
                    <div className="space-y-3">
                      {/* Apple Pay */}
                      <label
                        onClick={() => setPaymentMethod('applepay')}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                          paymentMethod === 'applepay'
                            ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="checkout_payment_method"
                            checked={paymentMethod === 'applepay'}
                            onChange={() => setPaymentMethod('applepay')}
                            className="accent-neutral-950 w-4 h-4"
                          />
                          <div>
                            <span className="font-semibold text-sm text-neutral-950 block">Apple Pay</span>
                            <span className="text-xs text-neutral-500">Fast and secure with Face ID or Touch ID</span>
                          </div>
                        </div>
                        <ApplePayIcon className="h-5 w-auto" variant="dark" />
                      </label>

                      {/* PayPal & Pay Later */}
                      <label
                        onClick={() => setPaymentMethod('paypal')}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                          paymentMethod === 'paypal'
                            ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="checkout_payment_method"
                            checked={paymentMethod === 'paypal'}
                            onChange={() => setPaymentMethod('paypal')}
                            className="accent-neutral-950 w-4 h-4"
                          />
                          <div>
                            <span className="font-semibold text-sm text-neutral-950 block">PayPal &amp; Pay Later</span>
                            <span className="text-xs text-neutral-500">Pay in full or 3 interest-free payments via PayPal</span>
                          </div>
                        </div>
                        <PayPalIcon className="h-4 w-auto" />
                      </label>

                      {/* Credit / Debit Card */}
                      <label
                        onClick={() => setPaymentMethod('card')}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                          paymentMethod === 'card'
                            ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="checkout_payment_method"
                            checked={paymentMethod === 'card'}
                            onChange={() => setPaymentMethod('card')}
                            className="accent-neutral-950 w-4 h-4"
                          />
                          <div>
                            <span className="font-semibold text-sm text-neutral-950 block">Credit / Debit Card</span>
                            <span className="text-xs text-neutral-500">Visa, Mastercard, American Express (Secure via Stripe)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <img src="/payments/visa.svg" alt="Visa" className="h-5 w-auto object-contain rounded" />
                          <img src="/payments/master.svg" alt="Mastercard" className="h-5 w-auto object-contain rounded" />
                          <img src="/payments/american_express.svg" alt="Amex" className="h-5 w-auto object-contain rounded" />
                        </div>
                      </label>

                      {/* Klarna Pay in 3 */}
                      <label
                        onClick={() => setPaymentMethod('klarna')}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                          paymentMethod === 'klarna'
                            ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="checkout_payment_method"
                            checked={paymentMethod === 'klarna'}
                            onChange={() => setPaymentMethod('klarna')}
                            className="accent-neutral-950 w-4 h-4"
                          />
                          <div>
                            <span className="font-semibold text-sm text-neutral-950 block">Klarna Pay in 3</span>
                            <span className="text-xs text-neutral-500">3 interest-free payments of £{(finalTotal / 3).toFixed(2)}</span>
                          </div>
                        </div>
                        <KlarnaBadgeIcon className="h-4 w-auto" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary (Desktop) / Bottom (Mobile) */}
            <div className="order-2 lg:order-2">
              <div
                className="rounded-2xl border p-5 sm:p-6 sticky top-4"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  boxShadow: theme.effects.shadow,
                }}
              >
                <h2
                  className="font-serif-display text-xl sm:text-2xl mb-6"
                  style={{ color: theme.colors.text }}
                >
                  {t.orderSummary}
                </h2>

                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  {items.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-start gap-3 py-3 border-b last:border-b-0" style={{ borderColor: theme.colors.border }}>
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[#1a1a1a] truncate">
                          {item.brand} {item.model}
                        </h3>
                        <p className="text-sm text-[#6b6b6b]">
                          {item.color}
                          {item.size && ` • ${item.size}`}
                          {item.type && ` • ${item.type}`}
                        </p>
                        {item.propertyValues && Object.keys(item.propertyValues).length > 0 && (
                          <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                            {Object.entries(item.propertyValues).map(([key, value]) => `${key}: ${value}`).join(', ')}
                          </p>
                        )}
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-[#6b6b6b]">
                            Qty: {item.quantity}
                          </span>
                          <span className="font-medium text-[#1a1a1a]">
                            £{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Newsletter Welcome Discount Prompt */}
                <div className="mb-6 p-4 rounded-2xl bg-neutral-50/90 border border-neutral-200 space-y-3">
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">
                            {appliedDiscount.code} applied ({appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}% off` : `£${appliedDiscount.value} off`})
                          </p>
                          <p className="text-[11px] text-emerald-700 truncate font-light">
                            You saved £{appliedDiscount.discountAmount.toFixed(2)} on this order
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDiscount()}
                        className="text-xs text-neutral-500 hover:text-neutral-950 underline shrink-0 px-1 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Newsletter Discount Prompt Header */}
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Tag size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-neutral-950">
                            Claim your 10% welcome discount
                          </p>
                          <p className="text-[11px] text-neutral-600 leading-relaxed font-light mt-0.5">
                            Subscribe to our newsletter for 10% off your order. Your exclusive discount code will be delivered straight to your inbox.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={checkoutNewsletterEmail !== '' ? checkoutNewsletterEmail : formData.email}
                          onChange={(e) => setCheckoutNewsletterEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="flex-1 min-w-0 px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-950 transition-colors placeholder:text-neutral-400"
                        />
                        <button
                          type="button"
                          onClick={handleCheckoutNewsletterSubscribe}
                          disabled={checkoutNewsletterLoading}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5"
                        >
                          {checkoutNewsletterLoading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <span>Claim 10%</span>
                          )}
                        </button>
                      </div>

                      {checkoutNewsletterMsg && (
                        <p className={`text-[11px] px-1 ${checkoutNewsletterMsg.includes('applied') ? 'text-emerald-700 font-semibold' : 'text-neutral-600'}`}>
                          {checkoutNewsletterMsg}
                        </p>
                      )}

                      {/* Manual promo code toggle */}
                      <div className="pt-2 border-t border-neutral-200/70">
                        {!showManualCodeInput ? (
                          <button
                            type="button"
                            onClick={() => setShowManualCodeInput(true)}
                            className="text-[11px] text-neutral-500 hover:text-neutral-900 underline"
                          >
                            Have a different promo code? Enter it here
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={manualCodeInput}
                                onChange={(e) => setManualCodeInput(e.target.value)}
                                placeholder="Discount code"
                                className="flex-1 min-w-0 px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-950 uppercase placeholder:normal-case transition-colors"
                              />
                              <button
                                type="button"
                                onClick={handleManualDiscountApply}
                                disabled={discountValidating || !manualCodeInput.trim()}
                                className="px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-neutral-200 text-neutral-900 hover:bg-neutral-300 disabled:opacity-50 transition-colors shrink-0"
                              >
                                {discountValidating ? 'Checking...' : 'Apply'}
                              </button>
                            </div>
                            {discountError && (
                              <p className="text-[11px] text-red-600 px-1">{discountError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">{t.total}:</span>
                    <span className="font-medium">£{totalPrice.toFixed(2)}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-sm" style={{ color: theme.colors.primary }}>
                      <span>{t.discountOrderSummary} ({appliedDiscount.code}):</span>
                      <span>-£{appliedDiscount.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">{t.delivery} (Direct Tracked Delivery):</span>
                    <span className="font-medium">£{deliveryCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>{t.orderTotal}:</span>
                    <span>£{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Place Order Button / PayPal Live Buttons */}
                {paymentMethod === 'paypal' ? (
                  <div className="mt-6">
                    <PayPalButtons
                      mode="checkout"
                      checkoutData={{
                        items,
                        totals: {
                          subtotal: totalPrice,
                          delivery: deliveryCost,
                          discount: appliedDiscount?.discountAmount || 0,
                          total: finalTotal,
                        },
                        discount: appliedDiscount,
                        providedShippingAddress: formData.street ? {
                          recipientName: `${formData.firstName} ${formData.lastName}`.trim(),
                          line1: formData.street,
                          line2: formData.streetNumber || undefined,
                          city: formData.city || 'United Kingdom',
                          postalCode: formData.streetNumber || '',
                          countryCode: 'GB',
                        } : undefined,
                      }}
                      onValidate={() => true}
                      onSuccess={(orderId) => {
                        clearCart();
                        resetForm();
                        window.location.href = `/checkout/success?orderId=${orderId}`;
                      }}
                    />
                  </div>
                ) : (
                  <button
                    ref={placeOrderButtonRef}
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting || isValidatingStock}
                    className={`w-full mt-6 px-6 py-3.5 text-white rounded-xl transition-opacity font-medium flex items-center justify-center ${
                      isSubmitting || isValidatingStock
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor:
                        isSubmitting || isValidatingStock
                          ? theme.colors.textSecondary
                          : theme.colors.buttonPrimary,
                    }}
                  >
                    {isValidatingStock ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking Stock...
                      </>
                    ) : isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t.placingOrder}
                      </>
                    ) : (
                      paymentMethod === 'applepay'
                        ? `Pay £${finalTotal.toFixed(2)} with Apple Pay`
                        : paymentMethod === 'klarna'
                        ? `Pay £${finalTotal.toFixed(2)} with Klarna (3x £${(finalTotal / 3).toFixed(2)})`
                        : paymentMethod === 'card'
                        ? `Pay £${finalTotal.toFixed(2)} with Card via Stripe`
                        : `Place Order · £${finalTotal.toFixed(2)}`
                    )}
                  </button>
                )}

                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                  <ShieldCheck size={14} className="text-neutral-700" />
                  <span>256-Bit SSL Encrypted &amp; Protected Payment</span>
                </div>

                {/* FOMO Badge - Checkout Page */}
                <div className="mt-4 flex justify-center">
                  <FomoBadge
                    messages={CHECKOUT_FOMO_MESSAGES}
                    rotationInterval={12000}
                    enabled={true}
                  />
                </div>

                {!isFormValid() && (
                  <p className="text-sm text-red-600 mt-2 text-center">
                    {t.pleaseFillAllRequiredFields}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
    </PublicPageLayout>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CheckoutContent />
    </Suspense>
  );
}
