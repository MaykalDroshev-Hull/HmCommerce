'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import {
  Plus,
  Trash2,
  X,
  Sparkles,
  Check,
  Copy,
  MessageSquare,
  Instagram,
  ShoppingBag,
  Truck,
  CreditCard,
  User,
  MapPin,
  Search,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Heart,
  FileText,
  BadgePercent,
  CheckCircle2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StockVariant {
  productvariantid: string;
  productid: string;
  product_name: string;
  sku: string | null;
  price: number;
  quantity: number;
  primary_image?: string | null;
  characteristics: Array<{ property_name: string; value: string }>;
}

type OrderLine = {
  id: string;
  productVariantId: string;
  productName: string;
  variantLabel: string;
  image: string | null;
  available: number;
  quantity: number;
  unitPrice: number;
};

type SocialPlatform = 'instagram' | 'tiktok' | 'whatsapp' | 'facebook' | 'other';
type PaymentMethod = 'bank_transfer' | 'paypal' | 'stripe_link' | 'cod' | 'other';
type PaymentStatus = 'paid' | 'pending';

const UK_MAJOR_CITIES = [
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Edinburgh',
  'Liverpool', 'Bristol', 'Sheffield', 'Newcastle upon Tyne', 'Newcastle',
  'Nottingham', 'Cardiff', 'Belfast', 'Southampton', 'Brighton', 'Oxford',
  'Cambridge', 'York', 'Bath', 'Exeter', 'Norwich', 'Plymouth', 'Leicester',
  'Coventry', 'Aberdeen', 'Swansea', 'Reading', 'Milton Keynes', 'Derby',
  'Preston', 'Bournemouth', 'Middlesbrough', 'Blackpool', 'Chester', 'Hull',
  'Wolverhampton', 'Sunderland', 'Dundee', 'Portsmouth', 'Stoke-on-Trent'
];

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function isSizeProperty(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('size');
}

function getVariantOptionLabel(v: StockVariant): string {
  const sizeChar = v.characteristics.find((c) => isSizeProperty(c.property_name));
  const otherChars = v.characteristics.filter((c) => !isSizeProperty(c.property_name));

  const parts: string[] = [];
  if (sizeChar?.value) parts.push(`Size: ${sizeChar.value}`);
  if (otherChars.length) parts.push(...otherChars.map((c) => `${c.property_name}: ${c.value}`));
  if (!parts.length) {
    const all = v.characteristics.map((c) => c.value).filter(Boolean);
    if (all.length) parts.push(...all);
    else if (v.sku) parts.push(v.sku);
    else parts.push(v.productvariantid.slice(0, 8));
  }

  return parts.join(' · ');
}

export default function AdminNewOrderPage() {
  const router = useRouter();
  const { theme } = useTheme();

  // Auth & Data loading
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [variants, setVariants] = useState<StockVariant[]>([]);

  // Smart DM Parser state
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [rawDmText, setRawDmText] = useState('');
  const [parserFeedback, setParserFeedback] = useState<string | null>(null);

  // Customer & Social Channel Info
  const [orderSource, setOrderSource] = useState<SocialPlatform>('instagram');
  const [socialHandle, setSocialHandle] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('');

  // UK Delivery Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postcode, setPostcode] = useState('');

  // Order Items
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [pickProductId, setPickProductId] = useState('');
  const [pickVariant, setPickVariant] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Shipping & Discounts
  const [deliveryPreset, setDeliveryPreset] = useState<'standard' | 'express' | 'free' | 'custom'>('standard');
  const [deliveryCost, setDeliveryCost] = useState(3.99);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountNote, setDiscountNote] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentReference, setPaymentReference] = useState('');

  // Notes
  const [customerNote, setCustomerNote] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Submission & Success
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOrderResult, setCreatedOrderResult] = useState<{
    orderId: string;
    total: number;
    customerName: string;
    petName: string;
  } | null>(null);
  const [replyCopied, setReplyCopied] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Authentication & Initial Fetch                                   */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const session = await getAdminSession();
        if (!session) {
          router.push('/admin/login');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [router]);

  const loadStock = async () => {
    try {
      const res = await fetch('/api/admin/stock');
      const data = await res.json();
      if (data.success) setVariants(data.variants || []);
    } catch (err) {
      console.error('Failed to load stock for new order:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadStock();
  }, [isAuthenticated]);

  /* ---------------------------------------------------------------- */
  /*  Products & Variants Helpers                                      */
  /* ---------------------------------------------------------------- */

  const variantMap = useMemo(() => {
    const m = new Map<string, StockVariant>();
    variants.forEach((v) => m.set(v.productvariantid, v));
    return m;
  }, [variants]);

  const productsGrouped = useMemo(() => {
    const map = new Map<string, { productid: string; product_name: string; image?: string; variants: StockVariant[] }>();
    variants.forEach((v) => {
      let group = map.get(v.productid);
      if (!group) {
        group = {
          productid: v.productid,
          product_name: v.product_name,
          image: v.primary_image || undefined,
          variants: []
        };
        map.set(v.productid, group);
      }
      group.variants.push(v);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name, 'en-GB', { sensitivity: 'base' })
    );
  }, [variants]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return productsGrouped;
    const term = productSearch.toLowerCase();
    return productsGrouped.filter(p =>
      p.product_name.toLowerCase().includes(term) ||
      p.variants.some(v => v.sku?.toLowerCase().includes(term))
    );
  }, [productsGrouped, productSearch]);

  const variantsForSelectedProduct = useMemo(() => {
    if (!pickProductId) return [];
    const group = productsGrouped.find((p) => p.productid === pickProductId);
    return (group?.variants || []).sort((a, b) => {
      const sizeA = a.characteristics.find((c) => isSizeProperty(c.property_name))?.value ?? '';
      const sizeB = b.characteristics.find((c) => isSizeProperty(c.property_name))?.value ?? '';
      return sizeA.localeCompare(sizeB, 'en-GB', { numeric: true });
    });
  }, [pickProductId, productsGrouped]);

  /* ---------------------------------------------------------------- */
  /*  Smart DM Text Parser                                             */
  /* ---------------------------------------------------------------- */

  const handleSmartParse = () => {
    if (!rawDmText.trim()) return;

    let text = rawDmText.trim();
    let fieldsFound: string[] = [];

    // 1. Detect Channel
    if (/instagram|ig|insta/i.test(text)) {
      setOrderSource('instagram');
      fieldsFound.push('Channel: Instagram');
    } else if (/tiktok/i.test(text)) {
      setOrderSource('tiktok');
      fieldsFound.push('Channel: TikTok');
    } else if (/whatsapp/i.test(text)) {
      setOrderSource('whatsapp');
      fieldsFound.push('Channel: WhatsApp');
    } else if (/facebook|messenger|fb/i.test(text)) {
      setOrderSource('facebook');
      fieldsFound.push('Channel: Facebook');
    }

    // 2. Handle / Username
    const handleMatch = text.match(/@([a-zA-Z0-9_.]+)/);
    if (handleMatch) {
      setSocialHandle(`@${handleMatch[1]}`);
      fieldsFound.push('Handle');
    }

    // 3. Email
    const emailMatch = text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
    if (emailMatch) {
      setEmail(emailMatch[1]);
      fieldsFound.push('Email');
    }

    // 4. UK Phone (07xxx or +447xxx or UK landlines)
    const phoneMatch = text.match(/(?:(?:\+44\s?\(0\)\s?|\+44\s?|0)(?:7\d{3}|1\d{3}|2\d{3})\s?\d{3}\s?\d{3,4}|\b07\d{9}\b|\b0[1-9]\d{8,9}\b)/);
    if (phoneMatch) {
      setPhone(phoneMatch[0].replace(/\s+/g, ' '));
      fieldsFound.push('Phone');
    }

    // 5. UK Postcode (e.g. SW1A 1AA, M1 1AE, B33 8TH, etc.)
    const postcodeMatch = text.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})\b/i);
    let extractedPostcode = '';
    if (postcodeMatch) {
      extractedPostcode = postcodeMatch[1].toUpperCase().replace(/\s+/, ' ');
      if (!extractedPostcode.includes(' ')) {
        extractedPostcode = `${extractedPostcode.slice(0, -3)} ${extractedPostcode.slice(-3)}`;
      }
      setPostcode(extractedPostcode);
      fieldsFound.push('Postcode');
    }

    // 6. Pet info
    const petMatch = text.match(/(?:dog|cat|pet|puppy|kitten|furbaby)[:\s]+([^\n,]+)/i);
    if (petMatch) {
      const petDetails = petMatch[1].trim();
      const parts = petDetails.split(/[-,(]/);
      setPetName(parts[0].trim());
      if (parts[1]) setPetBreed(parts[1].replace(/[)]/, '').trim());
      fieldsFound.push('Pet Info');
    }

    // 7. Payment Hints
    if (/monzo|revolut|bank transfer|bacs|transferred/i.test(text)) {
      setPaymentMethod('bank_transfer');
      setPaymentStatus('paid');
      fieldsFound.push('Payment: Bank Transfer');
    } else if (/paypal/i.test(text)) {
      setPaymentMethod('paypal');
      setPaymentStatus('paid');
      fieldsFound.push('Payment: PayPal');
    }

    // 8. Line-by-line Address & Name extraction
    const linesOfText = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const filteredLines = linesOfText.filter((line) => {
      // Exclude lines that are solely phone, email, postcode, or greeting
      if (phoneMatch && line.includes(phoneMatch[0])) return false;
      if (emailMatch && line.includes(emailMatch[1])) return false;
      if (postcodeMatch && line.toLowerCase().includes(postcodeMatch[1].toLowerCase())) return false;
      if (/^(hi|hello|hey|thanks|thank you|order|please|size|payment|paid|dog|cat|pet)/i.test(line)) return false;
      return true;
    });

    if (filteredLines.length > 0) {
      // First clean line is likely the customer's name (stripping handles if embedded like "Sophie (@sophie)")
      let nameCandidate = filteredLines[0].replace(/^(name|customer|for)[:\s]+/i, '').trim();
      nameCandidate = nameCandidate.replace(/\(@?[a-zA-Z0-9_.]+\)/g, '').replace(/@([a-zA-Z0-9_.]+)/g, '').trim();
      if (nameCandidate && nameCandidate.length < 50 && !/\d/.test(nameCandidate)) {
        setFullName(nameCandidate);
        fieldsFound.push('Name');
        filteredLines.shift();
      }
    }

    // Detect city among remaining lines or postcode context
    let detectedCity = '';
    for (let i = 0; i < filteredLines.length; i++) {
      const l = filteredLines[i];
      const foundCity = UK_MAJOR_CITIES.find(c => new RegExp(`\\b${c}\\b`, 'i').test(l));
      if (foundCity) {
        detectedCity = foundCity;
        filteredLines.splice(i, 1);
        break;
      }
    }

    if (detectedCity) {
      setCity(detectedCity);
      fieldsFound.push('City');
    }

    // Remaining lines -> Address Line 1 and Address Line 2
    if (filteredLines.length > 0) {
      setAddressLine1(filteredLines[0].replace(/^(address|delivery address)[:\s]+/i, '').trim());
      fieldsFound.push('Address Line 1');
      if (filteredLines.length > 1) {
        setAddressLine2(filteredLines[1].trim());
      }
    }

    if (fieldsFound.length > 0) {
      setParserFeedback(`Successfully extracted: ${fieldsFound.join(', ')}! Please review the fields below.`);
    } else {
      setParserFeedback('Could not detect specific fields automatically. You can enter them in the form below.');
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Order Lines Actions                                              */
  /* ---------------------------------------------------------------- */

  const addLine = () => {
    if (!pickVariant) return;
    const v = variantMap.get(pickVariant);
    if (!v) return;

    // Check if variant already in list
    const existingIndex = lines.findIndex(l => l.productVariantId === v.productvariantid);
    if (existingIndex !== -1) {
      setLines(prev => prev.map((l, idx) => idx === existingIndex ? { ...l, quantity: l.quantity + 1 } : l));
      setPickVariant('');
      return;
    }

    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        productVariantId: v.productvariantid,
        productName: v.product_name,
        variantLabel: getVariantOptionLabel(v),
        image: v.primary_image || null,
        available: v.quantity,
        quantity: 1,
        unitPrice: v.price || 0,
      },
    ]);

    setPickVariant('');
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const nextQ = Math.max(1, l.quantity + delta);
      return { ...l, quantity: nextQ };
    }));
  };

  /* ---------------------------------------------------------------- */
  /*  Delivery & Totals                                                */
  /* ---------------------------------------------------------------- */

  const handleDeliveryPreset = (preset: 'standard' | 'express' | 'free' | 'custom') => {
    setDeliveryPreset(preset);
    if (preset === 'standard') setDeliveryCost(3.99);
    else if (preset === 'express') setDeliveryCost(5.99);
    else if (preset === 'free') setDeliveryCost(0.00);
  };

  const subtotal = useMemo(() => {
    return lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
  }, [lines]);

  const total = useMemo(() => {
    const raw = subtotal + Number(deliveryCost || 0) - Number(discountAmount || 0);
    return Math.max(0, raw);
  }, [subtotal, deliveryCost, discountAmount]);

  /* ---------------------------------------------------------------- */
  /*  Form Submission                                                  */
  /* ---------------------------------------------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter the customer\'s full name.');
      return;
    }
    if (!city.trim()) {
      setErrorMessage('Please enter the customer\'s town or city.');
      return;
    }
    if (!addressLine1.trim()) {
      setErrorMessage('Please enter Address Line 1 (street address).');
      return;
    }
    if (!postcode.trim()) {
      setErrorMessage('Please enter a valid UK postcode.');
      return;
    }
    if (lines.length === 0) {
      setErrorMessage('Please select and add at least one product item to the order.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            fullName: fullName.trim(),
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim() || undefined,
            city: city.trim(),
            county: county.trim() || undefined,
            postcode: postcode.trim().toUpperCase(),
            country: 'United Kingdom',
            socialHandle: socialHandle.trim() || undefined,
            socialPlatform: orderSource,
            petName: petName.trim() || undefined,
            petBreed: petBreed.trim() || undefined,
            customerNote: customerNote.trim() || undefined,
          },
          orderSource,
          paymentMethod,
          paymentStatus,
          paymentReference: paymentReference.trim() || undefined,
          deliveryType: deliveryPreset,
          deliveryCost: Number(deliveryCost) || 0,
          discountAmount: Number(discountAmount) || 0,
          discountNote: discountNote.trim() || undefined,
          subtotal,
          total,
          internalNote: internalNote.trim() || undefined,
          items: lines.map((l) => ({
            productVariantId: l.productVariantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreatedOrderResult({
          orderId: data.orderId,
          total,
          customerName: fullName.trim(),
          petName: petName.trim(),
        });
        loadStock(); // refresh stock counts
      } else {
        setErrorMessage(data.error || 'Failed to save order. Please check your inputs.');
      }
    } catch {
      setErrorMessage('Network error occurred while creating order.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  DM Reply Message Generator                                       */
  /* ---------------------------------------------------------------- */

  const generateDmReplyMessage = () => {
    if (!createdOrderResult) return '';

    const firstName = createdOrderResult.customerName.split(' ')[0] || 'there';
    const itemsFormatted = lines
      .map(l => `• ${l.quantity}x ${l.productName} (${l.variantLabel}) - £${(l.unitPrice * l.quantity).toFixed(2)}`)
      .join('\n');

    const paymentLabel = paymentStatus === 'paid'
      ? `Paid via ${paymentMethod.replace('_', ' ').toUpperCase()}`
      : `Payment pending via ${paymentMethod.replace('_', ' ').toUpperCase()}`;

    const petSnippet = createdOrderResult.petName
      ? `We'll get this packed with lots of love for ${createdOrderResult.petName} and dispatch it right away! 🐶❤️`
      : `We'll get this packed with lots of love and dispatch it right away! 🐾❤️`;

    return `Hey ${firstName}! 🎉 Thank you so much for ordering with Meow Bark!

🐾 Order ID: #${createdOrderResult.orderId}
📦 Items:
${itemsFormatted}

🚚 Delivery Address:
${addressLine1}${addressLine2 ? ', ' + addressLine2 : ''}
${city}, ${postcode.toUpperCase()}
United Kingdom

💰 Total: £${createdOrderResult.total.toFixed(2)} (${paymentLabel})

${petSnippet}
We'll update you as soon as your parcel is on its way. Let us know if you need anything else! ✨`;
  };

  const copyDmReply = async () => {
    const text = generateDmReplyMessage();
    try {
      await navigator.clipboard.writeText(text);
      setReplyCopied(true);
      setTimeout(() => setReplyCopied(false), 3000);
    } catch (err) {
      console.error('Could not copy to clipboard:', err);
    }
  };

  const handleResetForNewOrder = () => {
    setCreatedOrderResult(null);
    setLines([]);
    setFullName('');
    setPhone('');
    setEmail('');
    setSocialHandle('');
    setPetName('');
    setPetBreed('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setCounty('');
    setPostcode('');
    setCustomerNote('');
    setInternalNote('');
    setPaymentReference('');
    setDiscountAmount(0);
    setDiscountNote('');
    setRawDmText('');
    setParserFeedback(null);
  };

  /* ---------------------------------------------------------------- */
  /*  Render Styles                                                    */
  /* ---------------------------------------------------------------- */

  const cardStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 12,
  };

  const inputStyle = {
    backgroundColor: theme.colors.cardBg || theme.colors.secondary,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 8,
  };

  const btnPrimary = {
    backgroundColor: theme.colors.primary,
    color: '#ffffff',
  };

  const btnSecondary = {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AdminLayout currentPath="/admin/order-new">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-28">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: theme.colors.border }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>
                Create DM / Custom Order
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                UK Market • £ GBP
              </span>
            </div>
            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
              Take orders from Instagram DMs, TikTok, WhatsApp, or Facebook and generate 1-click confirmation replies.
            </p>
          </div>

          {/* Smart Paste Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSmartPaste(!showSmartPaste)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs border"
            style={{
              backgroundColor: showSmartPaste ? theme.colors.primary : theme.colors.surface,
              color: showSmartPaste ? '#ffffff' : theme.colors.text,
              borderColor: showSmartPaste ? theme.colors.primary : theme.colors.border,
            }}
          >
            <Sparkles size={16} />
            <span>{showSmartPaste ? 'Close DM Parser' : 'Smart Paste from DM'}</span>
          </button>
        </div>

        {/* Smart Paste from DM Drawer/Card */}
        {showSmartPaste && (
          <div style={cardStyle} className="p-5 border-2 border-primary/40 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: theme.colors.text }}>
                <Sparkles size={16} className="text-amber-500" />
                <span>Smart Auto-Fill from Customer Message</span>
              </div>
              <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Extracts Name, Phone, Address, Postcode & Pet info
              </span>
            </div>

            <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
              Paste the text your customer sent you in Instagram DM, TikTok, or WhatsApp. We will automatically parse their details into the form below:
            </p>

            <textarea
              rows={4}
              value={rawDmText}
              onChange={(e) => setRawDmText(e.target.value)}
              placeholder={`Example:\nSophie Jenkins (@sophie_frenchie)\n07712 345678\nFlat 3, 24 Park Road\nBristol\nBS8 1TH\nDog: Bruno, Frenchie`}
              className="w-full p-3 rounded-lg text-xs outline-none font-mono"
              style={inputStyle}
            />

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleSmartParse}
                disabled={!rawDmText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                style={btnPrimary}
              >
                <Sparkles size={14} />
                Parse & Auto-Fill Form
              </button>

              <button
                type="button"
                onClick={() => setRawDmText('')}
                className="text-xs underline"
                style={{ color: theme.colors.textSecondary }}
              >
                Clear text
              </button>
            </div>

            {parserFeedback && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                <Check size={14} />
                <span>{parserFeedback}</span>
              </div>
            )}
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SECTION 1: DM Channel & Customer Contact */}
          <section style={cardStyle} className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: theme.colors.border }}>
              <MessageSquare size={18} className="text-primary" />
              <h2 className="text-base font-semibold" style={{ color: theme.colors.text }}>
                1. Order Source & Customer Contact
              </h2>
            </div>

            {/* Social Platform Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.colors.textSecondary }}>
                Order Channel
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'instagram', label: 'Instagram DM', icon: Instagram },
                  { id: 'tiktok', label: 'TikTok DM', icon: MessageSquare },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                  { id: 'facebook', label: 'Facebook', icon: MessageSquare },
                  { id: 'other', label: 'Phone / Other', icon: User },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = orderSource === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOrderSource(item.id as SocialPlatform)}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all"
                      style={{
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                        color: isSelected ? '#ffffff' : theme.colors.text,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      }}
                    >
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Contact Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  Social Handle / Username (optional)
                </label>
                <input
                  type="text"
                  value={socialHandle}
                  onChange={(e) => setSocialHandle(e.target.value)}
                  placeholder="e.g. @furbaby_bruno"
                  className="w-full px-3 py-2.5 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sophie Jenkins"
                  className="w-full px-3 py-2.5 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  UK Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 07712 345678"
                  className="w-full px-3 py-2.5 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
                <span className="text-[10px] mt-0.5" style={{ color: theme.colors.textSecondary }}>
                  Recommended for courier dispatch SMS
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  Email Address (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. customer@example.co.uk"
                  className="w-full px-3 py-2.5 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
                <span className="text-[10px] mt-0.5" style={{ color: theme.colors.textSecondary }}>
                  Auto-assigned for order tracking if left blank
                </span>
              </div>
            </div>

            {/* Pet Parent Info (Personalisation) */}
            <div className="pt-2 border-t" style={{ borderColor: theme.colors.border }}>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                <Heart size={14} className="text-rose-500" />
                <span>Pet Details (For Personalised Confirmation)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="Pet's Name (e.g. Bruno, Coco)"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={petBreed}
                  onChange={(e) => setPetBreed(e.target.value)}
                  placeholder="Breed / Animal (e.g. French Bulldog, Ragdoll Cat)"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
          </section>

          {/* SECTION 2: UK Delivery Address */}
          <section style={cardStyle} className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: theme.colors.border }}>
              <MapPin size={18} className="text-primary" />
              <h2 className="text-base font-semibold" style={{ color: theme.colors.text }}>
                2. UK Delivery Address
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  Address Line 1 (Street Address) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. 14 High Street"
                  className="w-full px-3 py-2.5 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  Address Line 2 (Flat, Suite, Unit - optional)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Flat 2B, St. Andrews Court"
                  className="w-full px-3 py-2.5 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                    Town / City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Manchester"
                    className="w-full px-3 py-2.5 rounded-lg text-xs outline-none"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                    County / Region (optional)
                  </label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    placeholder="e.g. Greater Manchester"
                    className="w-full px-3 py-2.5 rounded-lg text-xs outline-none"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                    UK Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                    placeholder="e.g. M4 1HQ"
                    className="w-full px-3 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider outline-none uppercase"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  Country: <b>United Kingdom</b>
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Standard UK Courier Format
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 3: Products & Variants */}
          <section style={cardStyle} className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.colors.border }}>
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-primary" />
                <h2 className="text-base font-semibold" style={{ color: theme.colors.text }}>
                  3. Order Items ({lines.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={loadStock}
                className="text-xs flex items-center gap-1 hover:underline"
                style={{ color: theme.colors.textSecondary }}
                title="Refresh product stock from database"
              >
                <RefreshCw size={12} />
                Refresh Stock
              </button>
            </div>

            {/* Product & Variant Pickers */}
            <div className="p-3.5 rounded-xl border space-y-3" style={{ backgroundColor: theme.colors.secondary, borderColor: theme.colors.border }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Search / Product selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.colors.textSecondary }}>
                    Select Product
                  </label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products by name..."
                    className="w-full px-3 py-2 rounded-lg text-xs mb-1.5 outline-none"
                    style={inputStyle}
                  />
                  <select
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={inputStyle}
                    value={pickProductId}
                    onChange={(e) => {
                      setPickProductId(e.target.value);
                      setPickVariant('');
                    }}
                  >
                    <option value="">-- Choose product ({filteredProducts.length}) --</option>
                    {filteredProducts.map((p) => (
                      <option key={p.productid} value={p.productid}>
                        {p.product_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variant / Size selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.colors.textSecondary }}>
                    Select Variant / Size & Stock
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none disabled:opacity-50 mt-[30px]"
                    style={inputStyle}
                    value={pickVariant}
                    disabled={!pickProductId}
                    onChange={(e) => setPickVariant(e.target.value)}
                  >
                    <option value="">-- Choose size/variant --</option>
                    {variantsForSelectedProduct.map((v) => (
                      <option key={v.productvariantid} value={v.productvariantid}>
                        {getVariantOptionLabel(v)} • £{v.price.toFixed(2)} (Stock: {v.quantity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add to order button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={addLine}
                  disabled={!pickVariant}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                  style={btnPrimary}
                >
                  <Plus size={15} />
                  Add to Order
                </button>
              </div>
            </div>

            {/* Added Lines Table */}
            {lines.length === 0 ? (
              <div className="py-8 text-center text-xs" style={{ color: theme.colors.textSecondary }}>
                <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
                No items added yet. Pick a product and size above to add to this DM order.
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => {
                  const stockAlert = line.available < line.quantity;
                  const isLowStock = line.available === 1;

                  return (
                    <div
                      key={line.id}
                      className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {line.image ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border shrink-0" style={{ borderColor: theme.colors.border }}>
                            <Image src={line.image} alt={line.productName} fill className="object-cover" unoptimized />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                            <ShoppingBag size={20} style={{ color: theme.colors.textSecondary }} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: theme.colors.text }}>
                            {line.productName}
                          </p>
                          <p className="text-[11px]" style={{ color: theme.colors.textSecondary }}>
                            {line.variantLabel}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {stockAlert ? (
                              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                ⚠ Out of stock ({line.available} left in warehouse)
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                Only 1 remaining in stock
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                In stock ({line.available} available)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity & Custom Pricing */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                        {/* Quantity Counter */}
                        <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: theme.colors.border }}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.id, -1)}
                            className="px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            -
                          </button>
                          <span className="px-2.5 py-1 text-xs font-semibold">{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.id, 1)}
                            className="px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            +
                          </button>
                        </div>

                        {/* Editable Unit Price (allows DM agreed discounts) */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: theme.colors.textSecondary }}>£</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setLines(prev => prev.map(l => l.id === line.id ? { ...l, unitPrice: val } : l));
                            }}
                            className="w-16 px-1.5 py-1 text-xs rounded border text-right font-medium"
                            style={inputStyle}
                            title="Edit unit price in case of special DM agreement"
                          />
                        </div>

                        {/* Line Total */}
                        <span className="text-xs font-bold w-16 text-right" style={{ color: theme.colors.text }}>
                          £{(line.unitPrice * line.quantity).toFixed(2)}
                        </span>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 4: Shipping, Discounts & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Shipping & Discounts */}
            <section style={cardStyle} className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: theme.colors.border }}>
                <Truck size={18} className="text-primary" />
                <h2 className="text-base font-semibold" style={{ color: theme.colors.text }}>
                  4. Shipping & Discounts
                </h2>
              </div>

              {/* Delivery presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.colors.textSecondary }}>
                  UK Delivery Option
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeliveryPreset('standard')}
                    className="p-2 rounded-lg text-xs font-medium border text-center transition-all"
                    style={{
                      backgroundColor: deliveryPreset === 'standard' ? theme.colors.primary : theme.colors.surface,
                      color: deliveryPreset === 'standard' ? '#ffffff' : theme.colors.text,
                      borderColor: deliveryPreset === 'standard' ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <div>Standard</div>
                    <div className="text-[11px] opacity-80">£3.99</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeliveryPreset('express')}
                    className="p-2 rounded-lg text-xs font-medium border text-center transition-all"
                    style={{
                      backgroundColor: deliveryPreset === 'express' ? theme.colors.primary : theme.colors.surface,
                      color: deliveryPreset === 'express' ? '#ffffff' : theme.colors.text,
                      borderColor: deliveryPreset === 'express' ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <div>Express</div>
                    <div className="text-[11px] opacity-80">£5.99</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeliveryPreset('free')}
                    className="p-2 rounded-lg text-xs font-medium border text-center transition-all"
                    style={{
                      backgroundColor: deliveryPreset === 'free' ? theme.colors.primary : theme.colors.surface,
                      color: deliveryPreset === 'free' ? '#ffffff' : theme.colors.text,
                      borderColor: deliveryPreset === 'free' ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <div>Free Delivery</div>
                    <div className="text-[11px] opacity-80">£0.00</div>
                  </button>
                </div>
              </div>

              {/* Custom Delivery Cost */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  Delivery Charge (£)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryCost}
                  onChange={(e) => {
                    setDeliveryPreset('custom');
                    setDeliveryCost(parseFloat(e.target.value) || 0);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
              </div>

              {/* DM Discount */}
              <div className="pt-2 border-t" style={{ borderColor: theme.colors.border }}>
                <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.colors.textSecondary }}>
                  <BadgePercent size={14} className="text-amber-500" />
                  <span>Discount / Agreed Off (£)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="£ Discount amount"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={discountNote}
                    onChange={(e) => setDiscountNote(e.target.value)}
                    placeholder="Reason (e.g. DM 10% off)"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            </section>

            {/* Payment & Status */}
            <section style={cardStyle} className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: theme.colors.border }}>
                <CreditCard size={18} className="text-primary" />
                <h2 className="text-base font-semibold" style={{ color: theme.colors.text }}>
                  5. Payment Details
                </h2>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.colors.textSecondary }}>
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 rounded-lg text-xs outline-none"
                  style={inputStyle}
                >
                  <option value="bank_transfer">Bank Transfer (BACS / Monzo / Revolut)</option>
                  <option value="paypal">PayPal (Friends & Family / Business)</option>
                  <option value="stripe_link">Stripe / Payment Link</option>
                  <option value="cod">Cash on Delivery / In Person</option>
                  <option value="other">Other / Custom Agreement</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.colors.textSecondary }}>
                  Payment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('paid')}
                    className="py-2.5 px-3 rounded-lg text-xs font-bold border transition-all text-center"
                    style={{
                      backgroundColor: paymentStatus === 'paid' ? '#10b981' : theme.colors.surface,
                      color: paymentStatus === 'paid' ? '#ffffff' : theme.colors.text,
                      borderColor: paymentStatus === 'paid' ? '#10b981' : theme.colors.border,
                    }}
                  >
                    ✓ Paid (Ready)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pending')}
                    className="py-2.5 px-3 rounded-lg text-xs font-bold border transition-all text-center"
                    style={{
                      backgroundColor: paymentStatus === 'pending' ? '#f59e0b' : theme.colors.surface,
                      color: paymentStatus === 'pending' ? '#ffffff' : theme.colors.text,
                      borderColor: paymentStatus === 'pending' ? '#f59e0b' : theme.colors.border,
                    }}
                  >
                    ⏳ Pending Payment
                  </button>
                </div>
              </div>

              {/* Payment Reference */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  Payment Ref / Transaction ID (optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. Monzo ref #1049, PayPal trans #ABC"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Totals Summary */}
              <div className="pt-3 border-t space-y-1.5 text-xs" style={{ borderColor: theme.colors.border }}>
                <div className="flex justify-between" style={{ color: theme.colors.textSecondary }}>
                  <span>Subtotal:</span>
                  <span>£{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between" style={{ color: theme.colors.textSecondary }}>
                  <span>Delivery:</span>
                  <span>£{Number(deliveryCost || 0).toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discount:</span>
                    <span>-£{Number(discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-1 border-t" style={{ color: theme.colors.text, borderColor: theme.colors.border }}>
                  <span>Total:</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
              </div>
            </section>
          </div>

          {/* SECTION 5: Notes & Special Requests */}
          <section style={cardStyle} className="p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: theme.colors.border }}>
              <FileText size={18} className="text-primary" />
              <h2 className="text-base font-semibold" style={{ color: theme.colors.text }}>
                6. Order Notes
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  Customer Note / Instructions (e.g. leave in porch)
                </label>
                <textarea
                  rows={2}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="e.g. Please leave behind the garden gate if no answer..."
                  className="w-full p-2.5 rounded-lg text-xs outline-none resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.text }}>
                  Internal Admin Note (visible to staff only)
                </label>
                <textarea
                  rows={2}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="e.g. Customer promised to tag us on TikTok when received..."
                  className="w-full p-2.5 rounded-lg text-xs outline-none resize-none"
                  style={inputStyle}
                />
              </div>
            </div>
          </section>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={btnPrimary}
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Processing & Reserving Warehouse Stock...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Create DM Order • £{total.toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* SUCCESS MODAL & 1-CLICK DM CONFIRMATION GENERATOR */}
        {createdOrderResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div
              style={cardStyle}
              className="w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5 border-2 animate-in zoom-in-95"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: theme.colors.text }}>
                      Order Created Successfully!
                    </h3>
                    <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      Order ID: <b className="font-mono">{createdOrderResult.orderId}</b> • Total: <b>£{createdOrderResult.total.toFixed(2)}</b>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedOrderResult(null)}
                  className="p-1 rounded hover:bg-black/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 1-Click Copy DM Confirmation Box */}
              <div className="p-4 rounded-xl border space-y-2.5" style={{ backgroundColor: theme.colors.secondary, borderColor: theme.colors.border }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: theme.colors.text }}>
                    <MessageSquare size={14} className="text-primary" />
                    <span>Ready-to-Paste DM Confirmation Reply</span>
                  </span>
                  {replyCopied && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-white animate-pulse">
                      Copied to Clipboard!
                    </span>
                  )}
                </div>

                <textarea
                  readOnly
                  rows={8}
                  value={generateDmReplyMessage()}
                  className="w-full p-3 rounded-lg text-xs font-mono outline-none resize-none leading-relaxed"
                  style={inputStyle}
                />

                <button
                  type="button"
                  onClick={copyDmReply}
                  className="w-full py-2.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                  style={btnPrimary}
                >
                  <Copy size={14} />
                  <span>{replyCopied ? 'Copied to Clipboard!' : 'Copy DM Message for Customer'}</span>
                </button>
              </div>

              {/* Navigation CTAs */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetForNewOrder}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all border text-center"
                  style={btnSecondary}
                >
                  + Create Another DM Order
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/admin/orders')}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all border text-center flex items-center justify-center gap-1.5"
                  style={btnSecondary}
                >
                  <span>View All Orders</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
