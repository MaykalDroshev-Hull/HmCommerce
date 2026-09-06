'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
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
import { ShoppingBag, Truck, MapPin, Package, ShieldCheck } from 'lucide-react';
import FomoBadge, { type FomoMessage } from '@/components/FomoBadge';
import { trackStoreEvent } from '@/lib/vercel-analytics';
import { ApplePayIcon, PayPalIcon, KlarnaBadgeIcon, PaymentBadgesRow } from '@/components/PaymentIcons';

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
    const pageTitle = t.checkout || (language === 'bg' ? 'Поръчка' : 'Checkout');
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
    econtOfficeId?: string;
  }>({});
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const hasAutoPopulated = useRef(false);
  const placeOrderButtonRef = useRef<HTMLButtonElement>(null);
  const beginCheckoutTracked = useRef(false);

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

  useEffect(() => {
    if (!hasHydrated || totalItems === 0 || beginCheckoutTracked.current) return;
    beginCheckoutTracked.current = true;
    trackStoreEvent('Begin Checkout', {
      itemCount: totalItems,
      cartValue: Math.round(totalPrice * 100) / 100,
      currency: 'EUR',
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

        // Normalize city name - if it's in display format like "Пловдив [4000]", keep it for the form
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

        // Add delivery-specific fields based on delivery type
        if (deliveryType === 'office') {
          formUpdate.econtOfficeId = user.preferredEcontOfficeId || '';
        } else if (deliveryType === 'address') {
          formUpdate.street = street;
          formUpdate.streetNumber = streetNumber;
          formUpdate.entrance = user.preferredEntrance || '';
          formUpdate.floor = user.preferredFloor || '';
          formUpdate.apartment = user.preferredApartment || '';
        }

        // Update form data
        updateFormData(formUpdate);
      }
    }
  }, [isAuthenticated, user, formData.firstName, formData.email, formData.telephone, updateFormData]);

  const loadCities = async () => {
    // This would typically come from an API, but for now we'll use static data
    const bulgarianCities: CityOption[] = [
      { name: 'Пловдив', postcode: '4000', displayName: 'Пловдив [4000]' },
      { name: 'Варна', postcode: '9000', displayName: 'Варна [9000]' },
      { name: 'Бургас', postcode: '8000', displayName: 'Бургас [8000]' },
      { name: 'Русе', postcode: '7000', displayName: 'Русе [7000]' },
      { name: 'Стара Загора', postcode: '6000', displayName: 'Стара Загора [6000]' },
      { name: 'Плевен', postcode: '5800', displayName: 'Плевен [5800]' },
      { name: 'Сливен', postcode: '8800', displayName: 'Сливен [8800]' },
      { name: 'Добрич', postcode: '9300', displayName: 'Добрич [9300]' },
      { name: 'Шумен', postcode: '9700', displayName: 'Шумен [9700]' },
      { name: 'Перник', postcode: '2300', displayName: 'Перник [2300]' },
      { name: 'Хасково', postcode: '6300', displayName: 'Хасково [6300]' },
      { name: 'Ямбол', postcode: '8600', displayName: 'Ямбол [8600]' },
      { name: 'Пазарджик', postcode: '4400', displayName: 'Пазарджик [4400]' },
      { name: 'Благоевград', postcode: '2700', displayName: 'Благоевград [2700]' },
      { name: 'Велико Търново', postcode: '5000', displayName: 'Велико Търново [5000]' },
      { name: 'Враца', postcode: '3000', displayName: 'Враца [3000]' },
      { name: 'Габрово', postcode: '5300', displayName: 'Габрово [5300]' },
      { name: 'Асеновград', postcode: '4230', displayName: 'Асеновград [4230]' },
      { name: 'Видин', postcode: '3700', displayName: 'Видин [3700]' },
      { name: 'Кърджали', postcode: '6600', displayName: 'Кърджали [6600]' },
      { name: 'Кюстендил', postcode: '2500', displayName: 'Кюстендил [2500]' },
      { name: 'Ловеч', postcode: '5500', displayName: 'Ловеч [5500]' },
      { name: 'Монтана', postcode: '3400', displayName: 'Монтана [3400]' },
      { name: 'Търговище', postcode: '7700', displayName: 'Търговище [7700]' },
      { name: 'Разград', postcode: '7200', displayName: 'Разград [7200]' },
      { name: 'Силистра', postcode: '7500', displayName: 'Силистра [7500]' },
      { name: 'Смолян', postcode: '4700', displayName: 'Смолян [4700]' }
    ];

    setCities(bulgarianCities);
  };

  // Validation functions
  const validateBulgarianPhone = (phone: string): boolean => {
    if (!phone || phone.trim() === '') return false;
    
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    
    // Bulgarian phone formats:
    // 1. 10 digits starting with 0 (e.g., 0888123456)
    // 2. +359 followed by 9 digits (e.g., +359888123456)
    // 3. 00359 followed by 9 digits (e.g., 00359888123456)
    
    const patterns = [
      /^0\d{9}$/,                    // 0888123456
      /^\+359\d{9}$/,                // +359888123456
      /^00359\d{9}$/                 // 00359888123456
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
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
      if (!value || value.trim() === '') {
        error = t.phoneRequired;
      } else if (!validateBulgarianPhone(value)) {
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

  const handleDeliveryTypeChange = (deliveryType: DeliveryType) => {
    updateFormData({ deliveryType, econtOfficeId: '' });
    
    // Clear validation errors when delivery type changes
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.econtOfficeId;
      delete newErrors.street;
      delete newErrors.streetNumber;
      return newErrors;
    });
  };

  const getDeliveryCost = (deliveryType: DeliveryType) => {
    // Simple delivery cost calculation based on type
    switch (deliveryType) {
      case 'office':
        return 4.50;
      case 'address':
        return 6.90;
      case 'econtomat':
        return 3.20;
      default:
        return 4.50;
    }
  };

  const deliveryCost = getDeliveryCost(formData.deliveryType);
  const finalTotal = discountedTotal(totalPrice, deliveryCost);

  const handleSubmitOrder = async () => {
    // Validate phone and email before submission
    const phoneError = !formData.telephone || formData.telephone.trim() === '' 
      ? t.phoneRequired 
      : !validateBulgarianPhone(formData.telephone) 
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

    // Validate Econt office for office delivery
    if (
      formData.deliveryType === 'office' &&
      (!formData.econtOfficeId || !formData.econtOfficeId.trim())
    ) {
      setValidationErrors(prev => ({ ...prev, econtOfficeId: t.selectEcontOffice }));
      setError(t.selectEcontOffice);
      scrollToCheckoutIssue();
      return;
    }

    // Validate address fields for address delivery
    if (formData.deliveryType === 'address') {
      const addressErrors: any = {};
      
      if (!formData.street || !formData.street.trim()) {
        addressErrors.street = t.required;
      }
      if (!formData.streetNumber || !formData.streetNumber.trim()) {
        addressErrors.streetNumber = t.required;
      }
      
      if (Object.keys(addressErrors).length > 0) {
        setValidationErrors(prev => ({ ...prev, ...addressErrors }));
        setError(t.pleaseFillAllRequiredFields || 'Please fill all required fields');
        scrollToCheckoutIssue();
        return;
      }
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
        currency: 'EUR',
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

      // Redirect to success page with order ID using window.location for immediate redirect
      // This ensures the redirect happens before any state updates that might prevent navigation
      window.location.href = `/checkout/success?orderId=${orderResult.orderId}`;
      
      // Clear cart and form after redirect (these won't execute if redirect works, but that's fine)
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
            {language === 'bg' ? 'Зареждане...' : 'Loading...'}
          </p>
        </div>
      </PublicPageLayout>
    );
  }

  if (totalItems === 0) {
    return null; // Will redirect in useEffect
  }

  const deliveryTypeIcons = {
    office: Truck,
    address: MapPin,
    econtomat: Package,
  };

  const deliveryTypeLabels = {
    office: t.deliveryOffice,
    address: t.deliveryAddress,
    econtomat: t.deliveryEcontomat,
  };

  // Memoize FOMO messages to prevent recreation on every render
  const checkoutFomoMessages = useMemo(() => {
    const messages: FomoMessage[] = [
      {
        text: language === 'bg'
          ? 'Вашите артикули не са резервирани до завършване на поръчката'
          : 'Your items are not reserved until checkout is completed',
        tone: 'warning'
      },
      {
        text: language === 'bg'
          ? 'Наличността е ограничена — завършете поръчката скоро'
          : 'Stock is limited — complete your order soon',
        tone: 'warning'
      },
      {
        text: language === 'bg'
          ? 'Клиенти завършиха поръчка в последните 10 минути'
          : 'Customers completed checkout in the last 10 minutes',
        tone: 'success'
      },
      {
        text: language === 'bg'
          ? 'Бърза поръчка — повечето поръчки се завършват за под 1 минута'
          : 'Fast checkout — most orders complete in under 1 minute',
        tone: 'success'
      },
      {
        text: language === 'bg'
          ? 'Поръчайте сега за изпращане днес'
          : 'Order now to ship today',
        tone: 'neutral'
      },
      {
        text: language === 'bg'
          ? 'Поръчайте сега за по-бърза доставка'
          : 'Checkout now for faster delivery',
        tone: 'neutral'
      }
    ];
    return messages;
  }, [language]);

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('applepay')}
                    className={`h-12 rounded-xl flex items-center justify-center gap-1.5 transition-all border ${
                      paymentMethod === 'applepay'
                        ? 'border-black bg-black text-white ring-2 ring-neutral-400'
                        : 'border-neutral-300 bg-black text-white hover:bg-neutral-900'
                    }`}
                  >
                    <span className="text-xs font-medium mr-1">Pay with</span>
                    <ApplePayIcon className="h-5 w-auto" variant="light" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`h-12 rounded-xl flex items-center justify-center transition-all border ${
                      paymentMethod === 'paypal'
                        ? 'border-[#003087] bg-[#FFC439] ring-2 ring-[#003087]'
                        : 'border-neutral-300 bg-[#FFC439] hover:bg-[#f2ba36]'
                    }`}
                  >
                    <PayPalIcon className="h-5 w-auto" />
                  </button>
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
                        {t.telephone} *
                      </label>
                      <input
                        type="tel"
                        value={formData.telephone || ''}
                        onChange={(e) => handleInputChange('telephone', e.target.value)}
                        onBlur={(e) => handleBlur('telephone', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461] ${
                          validationErrors.telephone ? 'border-red-500' : 'border-[#e8e4dc]'
                        }`}
                        required
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

                  {/* Country and City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                        {t.country} *
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full px-3 py-2 border border-[#e8e4dc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461]"
                      >
                        <option value="Bulgaria">{t.bulgaria}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                        {t.city} *
                      </label>
                      <div className="relative" ref={cityDropdownRef}>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => {
                            const value = e.target.value;
                            handleInputChange('city', value);
                            setShowCityDropdown(true);
                            if (formData.deliveryType === 'office') {
                              updateFormData({ econtOfficeId: '' });
                            }
                          }}
                          onFocus={() => setShowCityDropdown(true)}
                          placeholder={t.selectCity}
                          className="w-full px-3 py-2 border border-[#e8e4dc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461]"
                          required
                        />
                        {showCityDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-[#e8e4dc] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {cities
                              .filter((city) => 
                                city.name.toLowerCase().includes((formData.city || '').toLowerCase()) ||
                                city.displayName.toLowerCase().includes((formData.city || '').toLowerCase()) ||
                                city.postcode.includes(formData.city || '')
                              )
                              .map((city) => (
                                <button
                                  key={city.displayName}
                                  type="button"
                                  onClick={() => {
                                    handleInputChange('city', city.displayName);
                                    setShowCityDropdown(false);
                                    if (formData.deliveryType === 'office') {
                                      updateFormData({ econtOfficeId: '' });
                                    }
                                  }}
                                  className="w-full text-left px-3 py-2 focus:outline-none transition-colors"
                                  style={{ color: theme.colors.text }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.colors.secondary; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  {city.displayName}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delivery Type */}
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-4">
                      {t.deliveryType} *
                    </label>
                    <div className="space-y-3">
                      {(['office', 'address', 'econtomat'] as DeliveryType[]).map((type) => {
                        const Icon = deliveryTypeIcons[type];
                        const isDisabled = type === 'econtomat';
                        return (
                          <label
                            key={type}
                            className={`flex items-center p-4 border rounded-xl transition-all ${
                              isDisabled
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                            } ${
                              formData.deliveryType === type
                                ? 'border-[#7d8461] bg-[#f9f7f2]'
                                : 'border-[#e8e4dc] hover:border-[#7d8461]/40'
                            }`}
                            style={isDisabled ? { backgroundColor: theme.colors.secondary } : undefined}
                          >
                            <input
                              type="radio"
                              name="deliveryType"
                              value={type}
                              checked={formData.deliveryType === type}
                              onChange={() => handleDeliveryTypeChange(type)}
                              disabled={isDisabled}
                              className="mr-3"
                            />
                            <Icon size={20} className="mr-3 text-[#6b6b6b]" />
                            <div>
                              <div className="font-medium text-[#1a1a1a]">
                                {deliveryTypeLabels[type]}
                              </div>
                              <div className="text-sm text-[#6b6b6b]">
                                €{getDeliveryCost(type).toFixed(2)}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Econt Office - free text when office delivery is selected */}
                  {formData.deliveryType === 'office' && formData.city && (
                    <div>
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                        {t.econtOffice} *
                      </label>
                      <input
                        type="text"
                        value={formData.econtOfficeId || ''}
                        onChange={(e) => handleInputChange('econtOfficeId', e.target.value)}
                        placeholder={language === 'bg'
                          ? 'Напр. Еконт офис Център, ул. Примерна 10'
                          : 'e.g. Econt office Center, Example St 10'}
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461] ${
                          validationErrors.econtOfficeId ? 'border-red-500' : 'border-[#e8e4dc]'
                        }`}
                      />
                      {validationErrors.econtOfficeId && (
                        <p className="text-red-500 text-xs mt-1" data-checkout-field-error>{validationErrors.econtOfficeId}</p>
                      )}
                    </div>
                  )}

                  {/* Address Fields - Only show if address delivery is selected */}
                  {formData.deliveryType === 'address' && (
                    <div>
                      <h3 className="text-lg font-medium text-[#1a1a1a] mb-4">{t.addressDetails}</h3>
                      
                      <div className="space-y-4">
                        {/* Street and Number */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                              {t.street} *
                            </label>
                            <input
                              type="text"
                              value={formData.street || ''}
                          onChange={(e) => handleInputChange('street', e.target.value)}
                              placeholder="ул. Васил Левски"
                              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461] ${
                                validationErrors.street ? 'border-red-500' : 'border-[#e8e4dc]'
                              }`}
                              required
                            />
                            {validationErrors.street && (
                              <p className="text-red-500 text-xs mt-1">{validationErrors.street}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                              {t.streetNumber} *
                            </label>
                            <input
                              type="text"
                              value={formData.streetNumber || ''}
                              onChange={(e) => handleInputChange('streetNumber', e.target.value)}
                              placeholder="123"
                              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461] ${
                                validationErrors.streetNumber ? 'border-red-500' : 'border-[#e8e4dc]'
                              }`}
                              required
                            />
                            {validationErrors.streetNumber && (
                              <p className="text-red-500 text-xs mt-1">{validationErrors.streetNumber}</p>
                            )}
                          </div>
                        </div>

                        {/* Entrance, Floor, Apartment */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                              {t.entrance}
                            </label>
                            <input
                              type="text"
                              value={formData.entrance || ''}
                              onChange={(e) => handleInputChange('entrance', e.target.value)}
                              placeholder="A"
                              className="w-full px-3 py-2 border border-[#e8e4dc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                              {t.floor}
                            </label>
                            <input
                              type="text"
                              value={formData.floor || ''}
                              onChange={(e) => handleInputChange('floor', e.target.value)}
                              placeholder="5"
                              className="w-full px-3 py-2 border border-[#e8e4dc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                              {t.apartment}
                            </label>
                            <input
                              type="text"
                              value={formData.apartment || ''}
                              onChange={(e) => handleInputChange('apartment', e.target.value)}
                              placeholder="12"
                              className="w-full px-3 py-2 border border-[#e8e4dc] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7d8461]/25 focus:border-[#7d8461]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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

                      {/* PayPal */}
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
                            <span className="font-semibold text-sm text-neutral-950 block">PayPal</span>
                            <span className="text-xs text-neutral-500">Pay via your PayPal balance or linked cards</span>
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
                            <span className="text-xs text-neutral-500">Visa, Mastercard, American Express</span>
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
                    <span className="text-[#6b6b6b]">{t.delivery} ({deliveryTypeLabels[formData.deliveryType]}):</span>
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

                {/* Place Order Button */}
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
                      : paymentMethod === 'paypal'
                      ? `Pay £${finalTotal.toFixed(2)} with PayPal`
                      : paymentMethod === 'klarna'
                      ? `Pay £${finalTotal.toFixed(2)} with Klarna (3x £${(finalTotal / 3).toFixed(2)})`
                      : `Place Order · £${finalTotal.toFixed(2)}`
                  )}
                </button>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                  <ShieldCheck size={14} className="text-neutral-700" />
                  <span>256-Bit SSL Encrypted &amp; Protected Payment</span>
                </div>

                {/* FOMO Badge - Checkout Page */}
                <div className="mt-4 flex justify-center">
                  <FomoBadge
                    messages={checkoutFomoMessages}
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
