'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageSlider from './ImageSlider';
import AddToCartModal from './AddToCartModal';
import QuickLoginModal from './QuickLoginModal';
import { Product } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { translations } from '@/lib/translations';
import { ShoppingCart, Heart, ShoppingBag } from 'lucide-react';
import { isAwaitingRestock } from '@/lib/product-availability';
import { normalizeProductImages } from '@/lib/product-images';
import {
  getProductCardPricing,
} from '@/lib/product-promo';
import {
  getProductCardStockDisplay,
  productHasAnyVariantInStock,
} from '@/lib/variant-stock';

interface ProductCardProps {
  product: Product;
  isFavorited?: boolean;
}

export default function ProductCard({ product, isFavorited: initialIsFavorited }: ProductCardProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const t = translations[language];
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited || false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const showOutOfStockOverlay = isAwaitingRestock(product);
  const cardPricing = getProductCardPricing(product);
  const promoActive = cardPricing.promoActive;
  const promoPercent = cardPricing.promoPercent;
  const displayPrice = cardPricing.sale;

  const uniqueImages = normalizeProductImages(product.images);

  const getCategoryLabel = () => {
    if (product.category === 'clothes') return product.type || t.clothes;
    if (product.category === 'shoes') return t.shoes;
    if (product.category === 'accessories') return t.accessories;
    return '';
  };

  useEffect(() => {
    if (initialIsFavorited !== undefined) {
      setIsFavorited(initialIsFavorited);
      return;
    }

    if (isAuthenticated && user) {
      const checkFavorite = async () => {
        try {
          const response = await fetch('/api/favorites/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              productId: String(product.id || product.productid || '')
            })
          });
          const data = await response.json();
          if (data.success) {
            setIsFavorited(data.isFavorited);
          }
        } catch (error) {
        }
      };
      checkFavorite();
    }
  }, [isAuthenticated, user, product.id, product.productid, initialIsFavorited]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }

    setIsTogglingFavorite(true);
    const productId = product.id || product.productid;

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          productId: String(productId || '')
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsFavorited(data.isFavorited);
      }
    } catch (error) {
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (showAddToCartModal) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-express-checkout]')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    router.push(`/products/${product.id}`);
  };

  const productTitle = `${product.brand} ${product.model}`.trim();
  const categoryLabel = getCategoryLabel();
  const showNewBadge = product.isfeatured;
  const stockUnit = product.category === 'shoes' ? t.pairs : t.pcs;
  const stockDisplay = getProductCardStockDisplay(product, language, stockUnit);
  const canPurchase = product.visible && productHasAnyVariantInStock(product) && !showOutOfStockOverlay;

  return (
    <>
      <div
        className="group relative flex flex-col h-full bg-white border border-neutral-200/80 rounded-xl overflow-hidden hover:border-neutral-900 transition-all duration-300 shadow-2xs hover:shadow-sm cursor-pointer"
        onClick={handleClick}
      >
        <div className="relative aspect-[4/5] sm:aspect-square bg-neutral-100 overflow-hidden">
          <div className={`w-full h-full ${showOutOfStockOverlay ? 'opacity-55 grayscale-[35%]' : ''}`}>
            <ImageSlider images={uniqueImages} />
          </div>

          {/* Out of Stock Overlay */}
          {showOutOfStockOverlay && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-3 bg-white/80 backdrop-blur-xs pointer-events-none">
              <div className="text-center px-3 py-2 bg-white/95 rounded-lg border border-neutral-200 shadow-xs">
                <ShoppingBag size={18} className="mx-auto mb-1 text-neutral-800" strokeWidth={1.5} />
                <p className="text-xs font-semibold text-neutral-900 leading-tight">
                  {t.outOfStockTitle || 'Sold Out'}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {t.restockComingSoon || 'Restock soon'}
                </p>
              </div>
            </div>
          )}

          {/* Clean Editorial Status Badges */}
          {promoActive && !showOutOfStockOverlay && (
            <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-white rounded-sm">
              SALE{promoPercent > 0 ? ` −${promoPercent}%` : ''}
            </span>
          )}

          {showNewBadge && !showOutOfStockOverlay && !promoActive && (
            <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white border border-neutral-300 text-neutral-900 rounded-sm">
              NEW
            </span>
          )}

          {/* Wishlist Heart Button */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            disabled={isTogglingFavorite}
            className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-neutral-200/70 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xs text-neutral-700 hover:text-neutral-950 disabled:opacity-50"
            title={isFavorited ? 'Remove from favourites' : 'Add to favourites'}
            aria-label={isFavorited ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart
              size={15}
              className={isFavorited ? 'fill-[#D31336] text-[#D31336]' : 'text-neutral-700'}
            />
          </button>
        </div>

        {/* Product Meta & Pricing */}
        <div className="p-3 sm:p-4 flex flex-col flex-1">
          {categoryLabel && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1 line-clamp-1">
              {product.brand} {categoryLabel ? `• ${categoryLabel}` : ''}
            </p>
          )}

          <h3 className="text-xs sm:text-sm font-semibold text-neutral-950 leading-snug line-clamp-2 mb-1 group-hover:text-neutral-700 transition-colors">
            {productTitle}
            {product.color ? ` - ${product.color}` : ''}
          </h3>

          <p className="text-[11px] text-neutral-600 mb-2">
            In Stock: <span className="font-medium text-neutral-900">{stockDisplay}</span>
          </p>

          <div className="mt-auto pt-2 border-t border-neutral-100">
            <div className="flex items-baseline gap-2">
              {promoActive ? (
                <>
                  <span className="text-sm sm:text-base font-bold text-neutral-950">
                    £{displayPrice.toFixed(2)}
                  </span>
                  <span className="text-xs text-neutral-600 line-through">
                    £{cardPricing.original.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-sm sm:text-base font-bold text-neutral-950">
                  £{product.price.toFixed(2)}
                </span>
              )}
            </div>

            <p className="text-[10px] sm:text-[11px] text-neutral-600 mt-1">
              or 3 payments of <span className="font-semibold text-neutral-900">£{((promoActive ? displayPrice : (product.price || 36)) / 3).toFixed(2)}</span> with Klarna
            </p>

            {canPurchase && (
              <div data-express-checkout className="mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAddToCartModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs active:scale-[0.99]"
                >
                  <ShoppingCart size={13} />
                  <span>{t.expressAdd || 'Quick Add'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>


      <AddToCartModal
        isOpen={showAddToCartModal}
        onClose={() => setShowAddToCartModal(false)}
        product={product}
      />
      <QuickLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        productId={String(product.id || product.productid || '')}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          if (isAuthenticated && user) {
            const checkFavorite = async () => {
              try {
                const response = await fetch('/api/favorites/check', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user.id,
                    productId: String(product.id || product.productid || '')
                  })
                });
                const data = await response.json();
                if (data.success) {
                  setIsFavorited(data.isFavorited);
                }
              } catch (error) {
              }
            };
            checkFavorite();
          }
        }}
      />
    </>
  );
}
