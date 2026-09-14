'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Product } from '@/lib/data';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Heart, Share2, ChevronDown, ChevronUp, Truck, Check, Info, X, Star } from 'lucide-react';
import KlarnaWidget from './KlarnaWidget';
import QuickLoginModal from './QuickLoginModal';
import { PaymentBadgesRow } from './PaymentIcons';
import PayPalButtons from './PayPalButtons';
import { getVariantEffectivePrice } from '@/lib/product-promo';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { parseShippingSettings } from '@/lib/shipping-rules';
import { getColourHex } from '@/lib/colours';
import { getOptionStockQuantity, isSizePropertyKey } from '@/lib/variant-stock';

interface ProductDetailsProps {
  product: Product;
  onVariantChange?: (images: string[] | string | undefined) => void;
  onAddToCartTrigger?: () => void;
  onOptionChangeCallback?: (colour: string, colourHex: string, size: string, price?: number, isOutOfStock?: boolean) => void;
  buyButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

interface Variant {
  productvariantid: string;
  sku?: string;
  price?: number;
  promotional_price?: number | null;
  compare_at_price?: number | null;
  promotionalprice?: number | null;
  compareatprice?: number | null;
  quantity: number;
  trackquantity?: boolean | null;
  isvisible: boolean;
  ProductVariantPropertyvalues?: Array<{
    propertyid: string;
    Property?: { propertyid: string; name: string };
    value: string;
  }>;
  ProductVariantPropertyValues?: Array<{
    propertyid: string;
    Property?: { propertyid: string; name: string };
    value: string;
  }>;
  product_variant_property_values?: Array<{
    propertyid: string;
    properties?: { name: string };
    value: string;
  }>;
  imageurl?: string;
  images?: string[];
  IsPrimaryImage?: boolean;
}

interface ParsedProductDescription {
  intro: string;
  featuresTitle: string;
  features: string[];
  sizing: string;
  care: string;
  rawText: string;
}

function parseProductDescription(raw?: string): ParsedProductDescription {
  if (!raw || typeof raw !== 'string') {
    return {
      intro: '',
      featuresTitle: 'Fit and Features',
      features: [],
      sizing: '',
      care: '',
      rawText: '',
    };
  }

  const cleanRaw = raw.trim();

  // Look for standard section headers
  const featuresHeaderMatch = cleanRaw.match(/(?:Why Devoted Pet Parents Love It|Fit and Features|Features & Highlights|Features|Highlights):?/i);
  const sizingHeaderMatch = cleanRaw.match(/(?:Sizing & Fit|Sizing and Fit|Sizing Guide|Size & Fit):?/i);
  const careHeaderMatch = cleanRaw.match(/(?:Care Instructions|Materials and Care|Fabric & Materials|Fabric & Care|Care & Materials):?/i);

  // Intro text: everything before the first recognized section header
  const headerPositions = [
    featuresHeaderMatch?.index,
    sizingHeaderMatch?.index,
    careHeaderMatch?.index,
  ].filter((idx): idx is number => idx !== undefined && idx >= 0);

  let intro = '';
  if (headerPositions.length > 0) {
    const firstHeader = Math.min(...headerPositions);
    intro = cleanRaw.substring(0, firstHeader).trim();
  } else {
    intro = cleanRaw;
  }

  // Extract Features & Highlights
  let featuresTitle = 'Fit and Features';
  let features: string[] = [];
  if (featuresHeaderMatch && featuresHeaderMatch.index !== undefined) {
    featuresTitle = featuresHeaderMatch[0].replace(/:$/, '').trim() || 'Fit and Features';
    const startIdx = featuresHeaderMatch.index + featuresHeaderMatch[0].length;
    const remainingHeaders = [sizingHeaderMatch?.index, careHeaderMatch?.index]
      .filter((idx): idx is number => idx !== undefined && idx > startIdx);
    const endIdx = remainingHeaders.length > 0 ? Math.min(...remainingHeaders) : cleanRaw.length;
    const featuresBlock = cleanRaw.substring(startIdx, endIdx).trim();

    features = featuresBlock
      .split(/\n+/)
      .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
      .filter(Boolean);
  }

  // Extract Sizing & Fit
  let sizing = '';
  if (sizingHeaderMatch && sizingHeaderMatch.index !== undefined) {
    const startIdx = sizingHeaderMatch.index + sizingHeaderMatch[0].length;
    const remainingHeaders = [careHeaderMatch?.index]
      .filter((idx): idx is number => idx !== undefined && idx > startIdx);
    const endIdx = remainingHeaders.length > 0 ? Math.min(...remainingHeaders) : cleanRaw.length;
    sizing = cleanRaw.substring(startIdx, endIdx).trim();
  }

  // Extract Care Instructions
  let care = '';
  if (careHeaderMatch && careHeaderMatch.index !== undefined) {
    const startIdx = careHeaderMatch.index + careHeaderMatch[0].length;
    care = cleanRaw.substring(startIdx).trim();
  }

  return {
    intro,
    featuresTitle,
    features,
    sizing,
    care,
    rawText: cleanRaw,
  };
}

const SIZE_GUIDE_DATA = [
  { size: 'XXS', neck: '9.4"–11.0" (24–28 cm)', chest: '11.8"–13.7" (30–35 cm)', leash: '5/8" × 5 ft', breeds: 'Chihuahua, Teacup, Cats' },
  { size: 'XS', neck: '11.8"–13.7" (30–35 cm)', chest: '14.6"–17.7" (37–45 cm)', leash: '5/8" × 5 ft', breeds: 'Miniature Dachshund, Pomeranian' },
  { size: 'S', neck: '14.2"–15.7" (36–40 cm)', chest: '17.3"–18.8" (44–48 cm)', leash: '5/8" × 5 ft', breeds: 'Standard Dachshund, Jack Russell, Pug' },
  { size: 'M', neck: '15.7"–18.8" (40–48 cm)', chest: '18.8"–21.6" (48–55 cm)', leash: '3/4" × 5 ft', breeds: 'Cocker Spaniel, French Bulldog, Beagle' },
  { size: 'L', neck: '16.9"–19.6" (43–50 cm)', chest: '22.0"–25.5" (56–65 cm)', leash: '3/4" × 5 ft', breeds: 'Labrador, Golden Retriever, Boxer' },
  { size: 'XL', neck: '17.3"–21.6" (44–55 cm)', chest: '25.5"–29.5" (65–75 cm)', leash: '3/4" × 5 ft', breeds: 'German Shepherd, Great Dane, Rottweiler' },
];

export default function ProductDetails({
  product,
  onVariantChange,
  onAddToCartTrigger,
  onOptionChangeCallback,
  buyButtonRef,
}: ProductDetailsProps) {
  const { addItem, openCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { settings: storeSettings } = useStoreSettings();
  const { threshold: freeDeliveryThreshold, standardFee: standardDeliveryFee } = parseShippingSettings(storeSettings);
  const router = useRouter();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [availableOptions, setAvailableOptions] = useState<Record<string, Set<string>>>({});
  const [propertyNameMap, setPropertyNameMap] = useState<Record<string, string>>({});

  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Accordion states
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const [fabricOpen, setFabricOpen] = useState(false);
  const [careOpen, setCareOpen] = useState(false);

  const internalBuyButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeBuyButtonRef = buyButtonRef || internalBuyButtonRef;

  const parsedDesc = useMemo(() => {
    return parseProductDescription(product.description || (product as any).Description);
  }, [product.description, (product as any).Description]);

  // Extract variants & options
  useEffect(() => {
    const rawVariants = product.variants || (product as any).Variants || [];
    if (Array.isArray(rawVariants) && rawVariants.length > 0) {
      const visible = rawVariants.filter((v: any) => v.isvisible !== false);
      setVariants(visible);

      const optionsMap: Record<string, Set<string>> = {};
      const nameMap: Record<string, string> = {};

      visible.forEach((v: any) => {
        const propVals =
          v.ProductVariantPropertyvalues ||
          v.ProductVariantPropertyValues ||
          v.product_variant_property_values ||
          [];

        propVals.forEach((pv: any) => {
          const propName = pv.Property?.name || pv.properties?.name || pv.propertyid || '';
          const key = propName.toLowerCase();
          const val = pv.value || pv.Value || '';
          if (key && val) {
            nameMap[key] = propName;
            if (!optionsMap[key]) optionsMap[key] = new Set();
            optionsMap[key].add(val);
          }
        });
      });

      setAvailableOptions(optionsMap);
      setPropertyNameMap(nameMap);

      // Default selections: pick first option for each property (prefer in-stock for size)
      const initial: Record<string, string> = {};
      Object.entries(optionsMap).forEach(([k, set]) => {
        const arr = Array.from(set);
        if (isSizePropertyKey(k)) {
          const inStockSize = arr.find((sz) => getOptionStockQuantity(visible, initial, k, sz) > 0);
          initial[k] = inStockSize || arr[0];
        } else {
          initial[k] = arr[0];
        }
      });
      setSelectedOptions(initial);

      // Find initial matching variant
      const match = visible.find((v: any) => {
        const pvs =
          v.ProductVariantPropertyvalues ||
          v.ProductVariantPropertyValues ||
          v.product_variant_property_values ||
          [];
        return Object.entries(initial).every(([propKey, propVal]) =>
          pvs.some((pv: any) => {
            const name = (pv.Property?.name || pv.properties?.name || pv.propertyid || '').toLowerCase();
            return name === propKey && (pv.value || pv.Value) === propVal;
          })
        );
      });

      if (match) {
        setSelectedVariant(match);
        if (match.imageurl && onVariantChange) {
          onVariantChange([match.imageurl]);
        }
      }
    }
  }, [product.variants, (product as any).Variants]);

  // Effective Price calculation
  const effectivePricing = useMemo(() => {
    const targetVariant = selectedVariant || (variants.length > 0 ? variants[0] : null);
    const variantSource = targetVariant
      ? {
          price: targetVariant.price != null ? Number(targetVariant.price) : Number(product.price || 36.00),
          promotional_price: (targetVariant as any).promotional_price ?? (targetVariant as any).promotionalprice,
          compare_at_price: (targetVariant as any).compare_at_price ?? (targetVariant as any).compareatprice,
        }
      : { price: Number(product.price || 36.00) };
    return getVariantEffectivePrice(variantSource, product);
  }, [selectedVariant, variants, product]);

  const currentPrice = effectivePricing.sale;

  // Handle Option Click (Colour or Size)
  const handleOptionSelect = (propertyKey: string, value: string) => {
    const updated = { ...selectedOptions, [propertyKey]: value };
    setSelectedOptions(updated);

    let match = variants.find((v) => {
      const pvs =
        v.ProductVariantPropertyvalues ||
        v.ProductVariantPropertyValues ||
        v.product_variant_property_values ||
        [];
      return Object.entries(updated).every(([k, val]) =>
        pvs.some((pv: any) => {
          const name = (pv.Property?.name || pv.properties?.name || pv.propertyid || '').toLowerCase();
          return name === k && (pv.value || pv.Value)?.toLowerCase() === val?.toLowerCase();
        })
      );
    });

    // Fallback: If no exact combination match, find any variant matching the clicked property
    if (!match) {
      match = variants.find((v) => {
        const pvs =
          v.ProductVariantPropertyvalues ||
          v.ProductVariantPropertyValues ||
          v.product_variant_property_values ||
          [];
        return pvs.some((pv: any) => {
          const name = (pv.Property?.name || pv.properties?.name || pv.propertyid || '').toLowerCase();
          return name === propertyKey && (pv.value || pv.Value)?.toLowerCase() === value?.toLowerCase();
        });
      });
    }

    if (match) {
      setSelectedVariant(match);
      const variantImages = match.images && match.images.length > 0 ? match.images : match.imageurl ? [match.imageurl] : undefined;
      if (variantImages && onVariantChange) {
        onVariantChange(variantImages);
      }
    }

    const eff = getVariantEffectivePrice(
      match
        ? {
            price: match.price != null ? Number(match.price) : Number(product.price || 36.00),
            promotional_price: (match as any).promotional_price ?? (match as any).promotionalprice,
            compare_at_price: (match as any).compare_at_price ?? (match as any).compareatprice,
          }
        : { price: Number(product.price || 36.00) },
      product
    );

    // Notify parent for sticky banner
    const colourVal = updated['colour'] || updated['color'] || '';
    const sizeVal = updated['size'] || '';
    const hex = getColourHex(colourVal);
    onOptionChangeCallback?.(colourVal, hex, sizeVal, eff.sale);
  };

  const colourOptions = availableOptions['colour'] || availableOptions['color'] || new Set<string>();
  const sizeOptions = availableOptions['size'] || new Set<string>();

  const selectedColour =
    selectedOptions['colour'] ||
    selectedOptions['color'] ||
    (colourOptions.size > 0 ? Array.from(colourOptions)[0] : '') ||
    'Heathered Graphite Grey';

  const selectedSize =
    selectedOptions['size'] ||
    (sizeOptions.size > 0 ? Array.from(sizeOptions)[0] : '') ||
    'XS';

  const selectedColourHex = getColourHex(selectedColour);

  const isCurrentVariantOutOfStock = useMemo(() => {
    if (!selectedVariant) return false;
    if (selectedVariant.trackquantity === false || selectedVariant.trackquantity === null) return false;
    return Number(selectedVariant.quantity || 0) <= 0;
  }, [selectedVariant]);

  useEffect(() => {
    onOptionChangeCallback?.(selectedColour, selectedColourHex, selectedSize, effectivePricing.sale, isCurrentVariantOutOfStock);
  }, [selectedColour, selectedColourHex, selectedSize, effectivePricing.sale, isCurrentVariantOutOfStock, onOptionChangeCallback]);

  const handleAddToCart = () => {
    if (isCurrentVariantOutOfStock) return;
    const cartProps: Record<string, string> = {};
    Object.entries(selectedOptions).forEach(([k, v]) => {
      const displayName = propertyNameMap[k] || k;
      cartProps[displayName] = v;
    });

    const productName = product.name || `${product.brand || ''} ${product.model || ''}`.trim() || 'Daydrift Adventure Dog Collar';

    addItem({
      id: selectedVariant?.productvariantid || (product.id || (product as any).productid),
      name: productName,
      brand: product.brand || 'MB-Paws',
      model: product.model || 'Daydrift Collar',
      type: 'Dog Collar',
      color: selectedColour,
      size: selectedSize,
      price: currentPrice,
      quantity: 1,
      imageUrl: selectedVariant?.imageurl || product.images?.[0] || '/products/collar-graphite-grey.jpg',
      category: 'accessories',
      propertyValues: Object.keys(cartProps).length > 0 ? cartProps : undefined,
    });

    onAddToCartTrigger?.();
    openCart();
  };



  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {
      // ignore
    }
  };



  const productName = product.name || `${product.brand || ''} ${product.model || ''}`.trim() || 'Daydrift Adventure Dog Collar';
  const subtitle = product.subtitle || (product as any).subTitle || 'DESIGNED FOR EVERYDAY WALKS';

  return (
    <div className="product-purchase-panel flex flex-col space-y-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-[11px] text-neutral-500 tracking-wide uppercase flex items-center gap-1.5">
        <Link href="/products" className="hover:text-neutral-900 transition-colors">
          Shop
        </Link>
        <span>/</span>
        <Link href="/for-him" className="hover:text-neutral-900 transition-colors">
          Collars
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-semibold truncate">{productName}</span>
      </nav>

      {/* Header: Title, Subtitle, Rating */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight leading-tight">
          {productName}
        </h1>
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-neutral-600">
          {subtitle}
        </p>

        {/* Rating Stars */}
        <div className="flex items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-0.5 text-neutral-900">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={13} className="fill-neutral-950 text-neutral-950" />
            ))}
          </div>
          <span className="text-neutral-500 underline cursor-pointer hover:text-neutral-900">(12 reviews)</span>
        </div>
      </div>

      {/* Price & Klarna */}
      <div className="space-y-2 pt-2 border-t border-neutral-100">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="text-xl sm:text-2xl font-bold text-neutral-950">
            £{effectivePricing.sale.toFixed(2)}
          </span>
          {effectivePricing.promoActive && (
            <>
              <span className="text-sm sm:text-base text-neutral-400 line-through font-normal">
                £{effectivePricing.original.toFixed(2)}
              </span>
              <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Save {effectivePricing.promoPercent}%
              </span>
            </>
          )}
        </div>
        <KlarnaWidget price={currentPrice} currencySymbol="£" />
      </div>

      {/* Colour Swatches */}
      {colourOptions.size > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-900">
              Select Colour
            </span>
            <span className="text-neutral-600 font-medium">
              {selectedColour}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {Array.from(colourOptions).map((colName) => {
              const isSelected = selectedColour.toLowerCase() === colName.toLowerCase();
              const hex = getColourHex(colName);
              const isWhiteOrLight =
                hex.toLowerCase() === '#ffffff' ||
                hex.toLowerCase() === '#fafafa' ||
                hex.toLowerCase() === '#f8fafc' ||
                hex.toLowerCase() === '#fef3c7';

              return (
                <button
                  key={colName}
                  type="button"
                  onClick={() => handleOptionSelect('colour', colName)}
                  className={`group relative p-0.5 rounded-full transition-all duration-200 cursor-pointer ${
                    isSelected ? 'ring-2 ring-neutral-900 ring-offset-2 scale-110' : 'hover:scale-105 opacity-90 hover:opacity-100'
                  }`}
                  title={colName}
                  aria-label={`Select colour ${colName}`}
                >
                  <span
                    className={`block w-8 h-8 rounded-full shadow-inner transition-transform ${
                      isWhiteOrLight ? 'border border-neutral-300' : 'border border-black/10'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size Selector */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
            <span>Size : <span className="font-normal text-neutral-700">{selectedSize}</span></span>
            {isCurrentVariantOutOfStock && (
              <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Out of stock
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setShowSizeGuide(true)}
            className="text-neutral-600 hover:text-neutral-900 underline text-xs transition-colors"
          >
            Size guide
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {Array.from(sizeOptions).map((sz) => {
            const isSelected = selectedSize.toLowerCase() === sz.toLowerCase();
            const sizeQty = getOptionStockQuantity(variants, selectedOptions, 'size', sz);
            const isOutOfStock = sizeQty <= 0;

            return (
              <button
                key={sz}
                type="button"
                onClick={() => handleOptionSelect('size', sz)}
                className={`py-3 px-2 text-center text-xs font-bold uppercase rounded border transition-all relative overflow-hidden ${
                  isSelected && !isOutOfStock
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : isSelected && isOutOfStock
                      ? 'bg-neutral-100 text-neutral-500 border-neutral-900 ring-1 ring-neutral-900'
                      : isOutOfStock
                        ? 'bg-neutral-50/70 text-neutral-400 border-dashed border-neutral-300 hover:border-neutral-400'
                        : 'bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900'
                }`}
                aria-label={`Select size ${sz}${isOutOfStock ? ' (Out of stock)' : ''}`}
              >
                <span className={isOutOfStock ? 'line-through opacity-70' : ''}>{sz}</span>
                {isOutOfStock && (
                  <span className="block text-[8px] font-medium tracking-normal text-neutral-400 leading-none mt-0.5">
                    Sold out
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Delivery Highlights */}
      <div className="border border-neutral-200 rounded-lg p-3.5 bg-neutral-50/60 text-xs flex items-center justify-between">
        <div>
          <span className="font-bold text-neutral-900 block">
            Direct Tracked Delivery
          </span>
          <span className="text-neutral-500 text-[11px] block mt-0.5">
            Free delivery on orders over £{freeDeliveryThreshold} · Standard delivery £{standardDeliveryFee.toFixed(2)}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Tracked
        </span>
      </div>

      {/* Primary ADD TO BAG Button */}
      <div className="pt-2">
        <button
          ref={activeBuyButtonRef as any}
          type="button"
          onClick={handleAddToCart}
          disabled={isCurrentVariantOutOfStock}
          className={`w-full py-4 px-6 text-sm font-bold uppercase tracking-wider rounded transition-colors shadow-sm text-center ${
            isCurrentVariantOutOfStock
              ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed border border-neutral-300'
              : 'bg-[#D31336] hover:bg-[#B70F2D] text-white active:scale-[0.99]'
          }`}
        >
          {isCurrentVariantOutOfStock ? 'OUT OF STOCK' : `ADD TO BAG - £${currentPrice.toFixed(2)}`}
        </button>
      </div>

      {/* Express Checkout (Dedicated PayPal - UK GBP) */}
      <div className="pt-2 space-y-2">
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-neutral-200"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Instant Express Checkout
          </span>
          <div className="flex-grow border-t border-neutral-200"></div>
        </div>

        <PayPalButtons
          mode="product"
          productData={{
            productId: product.id || (product as any).productid,
            variantId: selectedVariant?.productvariantid,
            price: currentPrice,
            quantity: 1,
            title: productName,
            colour: selectedColour,
            size: selectedSize,
          }}
          onValidate={() => {
            if (sizeOptions.size > 0 && !selectedSize) {
              return 'Please select a size before checking out with PayPal';
            }
            return true;
          }}
        />
      </div>

      {/* Payment Security & Badges */}
      <div className="pt-3 pb-2 flex flex-col items-center sm:items-start gap-1.5 border-b border-neutral-100">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
          Guaranteed Safe &amp; Secure Checkout
        </span>
        <PaymentBadgesRow />
      </div>

      {/* Shipping Perk below button */}
      <div className="pt-2 text-xs text-neutral-600 border-b border-neutral-100 pb-6">
        <div className="flex items-start gap-3">
          <Truck size={16} className="text-neutral-900 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-900 block">Free shipping over £{freeDeliveryThreshold}</span>
            <span className="text-[11px] text-neutral-500">Standard delivery £{standardDeliveryFee.toFixed(2)} for orders under £{freeDeliveryThreshold}.</span>
          </div>
        </div>
      </div>

      {/* Product Overview Story from DB */}
      {parsedDesc.intro && (
        <div className="pt-2 text-xs sm:text-[13px] text-neutral-700 leading-relaxed font-normal border-b border-neutral-100 pb-4">
          <p>{parsedDesc.intro}</p>
        </div>
      )}

      {/* Product Accordions (Dynamic from DB Description) */}
      <div className="space-y-0 divide-y divide-neutral-200 text-xs">
        {/* Fit and Features / Why Pet Parents Love It */}
        <div>
          <button
            type="button"
            onClick={() => setFeaturesOpen(!featuresOpen)}
            className="w-full py-4 flex items-center justify-between text-left font-bold text-sm text-neutral-900 hover:text-neutral-700 cursor-pointer"
          >
            <span>{parsedDesc.features.length > 0 ? parsedDesc.featuresTitle : 'Fit and Features'}</span>
            {featuresOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {featuresOpen && (
            <div className="pb-4 text-neutral-600 space-y-2 leading-relaxed">
              {parsedDesc.features.length > 0 ? (
                <ul className="list-disc list-inside space-y-2">
                  {parsedDesc.features.map((feature, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : parsedDesc.rawText ? (
                <p className="whitespace-pre-line leading-relaxed">{parsedDesc.rawText}</p>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  <li>Engineered with skin-friendly materials for all-day comfort</li>
                  <li>Secure, fuss-free fastening for effortless dressing</li>
                  <li>Reinforced stitching designed for active, playful dogs</li>
                  <li>Lightweight design to prevent restriction of movement</li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Fabric, Materials & Care */}
        <div>
          <button
            type="button"
            onClick={() => setFabricOpen(!fabricOpen)}
            className="w-full py-4 flex items-center justify-between text-left font-bold text-sm text-neutral-900 hover:text-neutral-700 cursor-pointer"
          >
            <span>Fabric, Materials &amp; Care</span>
            {fabricOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {fabricOpen && (
            <div className="pb-4 text-neutral-600 space-y-2 leading-relaxed">
              {parsedDesc.care ? (
                <div className="space-y-1.5">
                  <p className="font-semibold text-neutral-900">Care Instructions:</p>
                  <p className="leading-relaxed whitespace-pre-line">{parsedDesc.care}</p>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  <li>Gentle hand or machine wash on cold cycle (30°C)</li>
                  <li>Air dry naturally away from direct sunlight</li>
                  <li>Do not tumble dry or bleach to preserve fabric softness</li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Sizing, Delivery & Returns */}
        <div>
          <button
            type="button"
            onClick={() => setCareOpen(!careOpen)}
            className="w-full py-4 flex items-center justify-between text-left font-bold text-sm text-neutral-900 hover:text-neutral-700 cursor-pointer"
          >
            <span>Sizing, Delivery &amp; Returns</span>
            {careOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {careOpen && (
            <div className="pb-4 text-neutral-600 space-y-3 leading-relaxed">
              {parsedDesc.sizing ? (
                <div>
                  <p className="font-semibold text-neutral-900 mb-1">Sizing Advice:</p>
                  <p className="leading-relaxed whitespace-pre-line">{parsedDesc.sizing}</p>
                </div>
              ) : (
                <p className="leading-relaxed">
                  We recommend measuring your dog&apos;s neck and chest girth before ordering to ensure the most comfortable fit.
                </p>
              )}

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-neutral-500">Need sizing measurements?</span>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="font-semibold text-neutral-900 underline hover:text-neutral-700 cursor-pointer"
                >
                  View Sizing Guide
                </button>
              </div>

              <div className="pt-2 border-t border-neutral-100 space-y-1">
                <p className="font-semibold text-neutral-900">Tracked UK Delivery &amp; Returns:</p>
                <p className="text-neutral-500 leading-relaxed">
                  Free standard delivery on orders over £{freeDeliveryThreshold}. Dispatched with tracking. 30-day returns on unworn items with original tags.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share & Wishlist footer line */}
      <div className="pt-2 flex items-center justify-between text-xs text-neutral-500">
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <Share2 size={14} />
          <span>{shareCopied ? 'Link Copied!' : 'Share'}</span>
        </button>

        <span className="text-[11px] text-neutral-400 font-mono uppercase">
          SKU: {selectedVariant?.sku || product.sku || (product as any).skucode || 'N/A'}
        </span>
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowSizeGuide(false)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl relative animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">
                {product.type?.toLowerCase().includes('collar') ? 'Collar Size Guide' : 'Pet Sizing Guide'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-600 my-4 leading-relaxed">
              {product.type?.toLowerCase().includes('collar')
                ? "Measure around your dog's neck with a soft tape measure where the collar would naturally sit. Allow space for two fingers between the collar and neck for optimal comfort."
                : "Measure around your dog's neck and the widest part of their chest girth. Allow comfortable breathing room to ensure a snug, happy fit."}
            </p>

            <div className="overflow-x-auto max-h-[50vh] border border-neutral-200 rounded-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-900 bg-neutral-50 sticky top-0 z-20">
                    <th className="py-2.5 px-3 font-bold sticky left-0 z-30 bg-neutral-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Size</th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">Neck</th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">Chest</th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">Matching Leash</th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">Ideal Breeds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700 bg-white">
                  {SIZE_GUIDE_DATA.map((row) => {
                    const isRowSelected = selectedSize === row.size;
                    return (
                      <tr key={row.size} className={isRowSelected ? 'bg-neutral-100/80 font-semibold text-neutral-950' : 'hover:bg-neutral-50/50'}>
                        <td className={`py-2.5 px-3 font-bold sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] ${
                          isRowSelected ? 'bg-neutral-100' : 'bg-white'
                        }`}>
                          <span className="inline-block px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300">
                            {row.size}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{row.neck}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{row.chest}</td>
                        <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">{row.leash}</td>
                        <td className="py-2.5 px-3 text-neutral-500 text-[11px] min-w-[150px]">{row.breeds}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Link
                href="/size-guide"
                target="_blank"
                className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-neutral-600 underline"
              >
                View Full Interactive Size Guide &rarr;
              </Link>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="py-2 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Login Modal */}
      <QuickLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        productId={String(product.id || (product as any).productid || '')}
        onLoginSuccess={() => setShowLoginModal(false)}
      />
    </div>
  );
}
