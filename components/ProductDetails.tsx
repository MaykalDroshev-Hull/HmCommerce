'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Product } from '@/lib/data';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Heart, Share2, ChevronDown, ChevronUp, RotateCcw, Truck, ShieldCheck, Check, Info, X, Star } from 'lucide-react';
import KlarnaWidget from './KlarnaWidget';
import QuickLoginModal from './QuickLoginModal';
import { PaymentBadgesRow } from './PaymentIcons';
import PayPalButtons from './PayPalButtons';

interface ProductDetailsProps {
  product: Product;
  onVariantChange?: (images: string[] | string | undefined) => void;
  onAddToCartTrigger?: () => void;
  onOptionChangeCallback?: (colour: string, colourHex: string, size: string) => void;
  buyButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

interface Variant {
  productvariantid: string;
  sku?: string;
  price?: number;
  quantity: number;
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

const COLOUR_HEX_MAP: Record<string, string> = {
  'heathered graphite grey': '#4A4D50',
  'graphite grey': '#4A4D50',
  'grey': '#4A4D50',
  'sand khaki': '#C2B29A',
  'khaki': '#C2B29A',
  'sand': '#C2B29A',
  'black': '#1A1A1A',
  'midnight black': '#1A1A1A',
  'navy': '#1E293B',
  'olive': '#4D5B44',
};

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

      // Default selections: pick first option for each property
      const initial: Record<string, string> = {};
      Object.entries(optionsMap).forEach(([k, set]) => {
        initial[k] = Array.from(set)[0];
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

  // Current Price
  const currentPrice = useMemo(() => {
    if (selectedVariant?.price != null) return Number(selectedVariant.price);
    if (variants.length > 0 && variants[0].price != null) return Number(variants[0].price);
    if (product.price != null) return Number(product.price);
    return 36.00;
  }, [selectedVariant, variants, product.price]);

  // Handle Option Click (Colour or Size)
  const handleOptionSelect = (propertyKey: string, value: string) => {
    const updated = { ...selectedOptions, [propertyKey]: value };
    setSelectedOptions(updated);

    const match = variants.find((v) => {
      const pvs =
        v.ProductVariantPropertyvalues ||
        v.ProductVariantPropertyValues ||
        v.product_variant_property_values ||
        [];
      return Object.entries(updated).every(([k, val]) =>
        pvs.some((pv: any) => {
          const name = (pv.Property?.name || pv.properties?.name || pv.propertyid || '').toLowerCase();
          return name === k && (pv.value || pv.Value) === val;
        })
      );
    });

    if (match) {
      setSelectedVariant(match);
      if (match.imageurl && onVariantChange) {
        onVariantChange([match.imageurl]);
      }
    }

    // Notify parent for sticky banner
    const colourVal = updated['colour'] || updated['color'] || '';
    const sizeVal = updated['size'] || '';
    const hex = COLOUR_HEX_MAP[colourVal.toLowerCase()] || '#4A4D50';
    onOptionChangeCallback?.(colourVal, hex, sizeVal);
  };

  const selectedColour = selectedOptions['colour'] || selectedOptions['color'] || 'Heathered Graphite Grey';
  const selectedSize = selectedOptions['size'] || 'XS';
  const selectedColourHex = COLOUR_HEX_MAP[selectedColour.toLowerCase()] || '#4A4D50';

  useEffect(() => {
    onOptionChangeCallback?.(selectedColour, selectedColourHex, selectedSize);
  }, [selectedColour, selectedColourHex, selectedSize]);

  const handleAddToCart = () => {
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

  const colourOptions = availableOptions['colour'] || availableOptions['color'] || new Set(['Heathered Graphite Grey', 'Sand Khaki']);
  const sizeOptions = availableOptions['size'] || new Set(['XS', 'S', 'M', 'L', 'XL']);

  const productName = product.name || `${product.brand || ''} ${product.model || ''}`.trim() || 'Daydrift Adventure Dog Collar';
  const subtitle = product.subtitle || (product as any).subTitle || 'DESIGNED FOR EVERYDAY WALKS';

  return (
    <div className="product-purchase-panel flex flex-col space-y-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-[11px] text-neutral-500 tracking-wide uppercase flex items-center gap-1.5">
        <span>Shop</span>
        <span>/</span>
        <span>Collars</span>
        <span>/</span>
        <span className="text-neutral-900 font-semibold truncate">Adventure Collar</span>
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
        <div className="text-xl sm:text-2xl font-bold text-neutral-950">
          £{currentPrice.toFixed(2)}
        </div>
        <KlarnaWidget price={currentPrice} currencySymbol="£" />
      </div>

      {/* Colour Swatches */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-neutral-900">
            Select Colour
          </span>
          <span className="text-neutral-600">
            {selectedColour}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {Array.from(colourOptions).map((colName) => {
            const isSelected = selectedColour.toLowerCase() === colName.toLowerCase();
            const hex = COLOUR_HEX_MAP[colName.toLowerCase()] || '#4A4D50';

            return (
              <button
                key={colName}
                type="button"
                onClick={() => handleOptionSelect('colour', colName)}
                className={`relative p-0.5 rounded-full transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-neutral-900 ring-offset-2' : 'hover:scale-105'
                }`}
                title={colName}
                aria-label={`Select colour ${colName}`}
              >
                <span
                  className="block w-8 h-8 rounded-full border border-neutral-300 shadow-inner"
                  style={{ backgroundColor: hex }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Selector */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-neutral-900">
            Size : <span className="font-normal text-neutral-700">{selectedSize}</span>
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
            return (
              <button
                key={sz}
                type="button"
                onClick={() => handleOptionSelect('size', sz)}
                className={`py-3 px-2 text-center text-xs font-bold uppercase rounded border transition-all ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900'
                }`}
                aria-label={`Select size ${sz}`}
              >
                {sz}
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
            Free delivery on orders over £50 · Standard delivery £3.99
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
          className="w-full py-4 px-6 bg-[#D31336] hover:bg-[#B70F2D] text-white text-sm font-bold uppercase tracking-wider rounded transition-colors shadow-sm active:scale-[0.99] text-center"
        >
          ADD TO BAG - £{currentPrice.toFixed(2)}
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

      {/* Trust Badges / Perks below button */}
      <div className="pt-2 space-y-3 text-xs text-neutral-600 border-b border-neutral-100 pb-6">
        <div className="flex items-start gap-3">
          <RotateCcw size={16} className="text-neutral-900 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-900 block">Free 30-day returns</span>
            <span className="text-[11px] text-neutral-500">Hassle-free returns within 30 days of delivery.</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Truck size={16} className="text-neutral-900 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-900 block">Free shipping over £50</span>
            <span className="text-[11px] text-neutral-500">Standard delivery £3.99 for orders under £50.</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ShieldCheck size={16} className="text-neutral-900 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-900 block">1-Year Hardware Guarantee</span>
            <span className="text-[11px] text-neutral-500">Anodised alloy hardware covered against mechanical defects.</span>
          </div>
        </div>
      </div>

      {/* Product Accordions (from Screenshot #2 & #5) */}
      <div className="space-y-0 divide-y divide-neutral-200 text-xs">
        {/* Fit and Features */}
        <div>
          <button
            type="button"
            onClick={() => setFeaturesOpen(!featuresOpen)}
            className="w-full py-4 flex items-center justify-between text-left font-bold text-sm text-neutral-900 hover:text-neutral-700"
          >
            <span>Fit and Features</span>
            {featuresOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {featuresOpen && (
            <div className="pb-4 text-neutral-600 space-y-2 leading-relaxed">
              <p className="font-medium text-neutral-900">Engineered for Daily Reliability</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Heavy-duty matte gunmetal quick-release alloy buckle</li>
                <li>Welded stainless steel D-ring for secure lead fastening</li>
                <li>Dedicated secondary quick-tag loop to eliminate tag jingle</li>
                <li>Adjustable slider provides custom snug fit across neck shapes</li>
                <li>Soft-folded tubular webbing edges prevent friction and coat breakage</li>
              </ul>
            </div>
          )}
        </div>

        {/* Fabric & Materials */}
        <div>
          <button
            type="button"
            onClick={() => setFabricOpen(!fabricOpen)}
            className="w-full py-4 flex items-center justify-between text-left font-bold text-sm text-neutral-900 hover:text-neutral-700"
          >
            <span>Fabric & Materials</span>
            {fabricOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {fabricOpen && (
            <div className="pb-4 text-neutral-600 space-y-2 leading-relaxed">
              <p className="font-medium text-neutral-900">Technical Webbing & Alloy Hardware</p>
              <ul className="list-disc list-inside space-y-1">
                <li>High-density woven ripstop nylon webbing</li>
                <li>Water-repellent and mud-resistant finish for wet weather and muddy walks</li>
                <li>Anodised zinc-alloy buckle with corrosion-resistant coating</li>
                <li>Tensile strength tested to withstand up to 250 kg pull force</li>
              </ul>
            </div>
          )}
        </div>

        {/* Materials and Care */}
        <div>
          <button
            type="button"
            onClick={() => setCareOpen(!careOpen)}
            className="w-full py-4 flex items-center justify-between text-left font-bold text-sm text-neutral-900 hover:text-neutral-700"
          >
            <span>Materials and Care</span>
            {careOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {careOpen && (
            <div className="pb-4 text-neutral-600 space-y-2 leading-relaxed">
              <ul className="list-disc list-inside space-y-1">
                <li>Hand wash with warm soapy water after muddy trails</li>
                <li>Rinse thoroughly and air dry away from direct sunlight</li>
                <li>Do not machine wash or tumble dry</li>
                <li>Do not bleach or iron</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Share & Wishlist footer line */}
      <div className="pt-2 flex items-center justify-between text-xs text-neutral-500">
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:text-neutral-900 transition-colors"
        >
          <Share2 size={14} />
          <span>{shareCopied ? 'Link Copied!' : 'Share'}</span>
        </button>

        <span className="text-[11px] text-neutral-400">SKU: DD-COL-001</span>
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
              <h3 className="text-base font-bold text-neutral-900">Collar Size Guide</h3>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-600 my-4 leading-relaxed">
              Measure around your dog&apos;s neck with a soft tape measure where the collar would naturally sit. Allow space for two fingers between the collar and neck for optimal comfort.
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
