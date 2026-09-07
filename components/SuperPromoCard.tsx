'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { translations } from '@/lib/translations';
import type { SuperPromoDisplayItem } from '@/lib/super-promo';

interface SuperPromoCardProps {
  item: SuperPromoDisplayItem;
}

export default function SuperPromoCard({ item }: SuperPromoCardProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { addItem, openCart } = useCart();
  const t = translations[language];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!item.inStock) return;

    addItem({
      id: item.productvariantid,
      name: item.name,
      brand: item.brand,
      model: item.model,
      color: item.color,
      size: item.size,
      price: item.promoPrice,
      imageUrl: item.imageUrl,
      category: item.category,
    });
    openCart();
  };

  return (
    <div
      className="rounded-2xl overflow-hidden border flex flex-col h-full transition-all duration-300"
      style={{
        backgroundColor: theme.colors.cardBg,
        borderColor: theme.colors.border,
        boxShadow: theme.effects.shadow,
      }}
    >
      <Link href={item.productPath} className="relative block">
        <div
          className="relative aspect-[4/5] sm:aspect-square overflow-hidden"
          style={{ backgroundColor: theme.colors.secondary }}
        >
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain object-center p-3 sm:p-4"
          />
        </div>
        <span
          className="absolute top-3 left-3 z-10 px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md text-white tracking-wider"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}
        >
          SUPER PROMO
        </span>
        {item.discountPercent > 0 && (
          <span
            className="absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] sm:text-xs font-semibold rounded-md text-white"
            style={{ backgroundColor: '#b91c1c' }}
          >
            −{item.discountPercent}%
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link href={item.productPath} className="group">
          <h3
            className="text-sm sm:text-base font-semibold mb-1 line-clamp-2 leading-snug group-hover:underline"
            style={{ color: theme.colors.text }}
          >
            {item.brand} {item.model}
          </h3>
        </Link>

        <p className="text-xs mb-3" style={{ color: theme.colors.textSecondary }}>
          {[item.color, item.size ? `Size ${item.size}` : '']
            .filter(Boolean)
            .join(' • ')}
        </p>

        <div className="mt-auto">
          <div
            className="text-xs sm:text-sm line-through"
            style={{ color: theme.colors.textSecondary }}
          >
            £{item.originalPrice.toFixed(2)}
          </div>
          <div className="text-lg sm:text-xl font-bold" style={{ color: '#dc2626' }}>
            £{item.promoPrice.toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>
            {t.inclVAT || 'Inclusive of VAT'}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {item.inStock ? (
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full px-4 py-2.5 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <ShoppingCart size={16} />
              {t.expressAdd || 'Add to Bag'}
            </button>
          ) : (
            <div
              className="w-full px-4 py-2.5 rounded-xl text-center text-sm font-medium"
              style={{ backgroundColor: theme.colors.secondary, color: theme.colors.textSecondary }}
            >
              {t.outOfStockTitle || 'Out of Stock'}
            </div>
          )}

          <Link
            href={item.productPath}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium"
            style={{ color: theme.colors.primary }}
          >
            {t.viewProductDetails || 'View Product'}
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
