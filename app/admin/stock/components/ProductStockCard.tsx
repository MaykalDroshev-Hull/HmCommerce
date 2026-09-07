'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Badge from '../../components/Badge';
import {
  type GroupedStockProduct,
  type StockVariant,
  getVariantColor,
  getVariantSize,
  getVariantStockStatus,
} from '@/lib/admin-stock-utils';
import { getDiscountPercentFromPrices } from '@/lib/product-promo';
import { useTheme } from '@/context/ThemeContext';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  CheckSquare,
  Square,
} from 'lucide-react';

const LARGE_REDUCTION_THRESHOLD = 10;

interface ProductStockCardProps {
  product: GroupedStockProduct;
  isExpanded: boolean;
  onToggleExpand: () => void;
  matchedVariantIds: Set<string>;
  editedQuantities: Record<string, number>;
  savedQuantities: Record<string, number>;
  editedPrices: Record<string, number>;
  savedPrices: Record<string, number>;
  editedPromoPrices: Record<string, number | null>;
  savedPromoPrices: Record<string, number | null>;
  onQuantityChange: (variantId: string, value: number) => void;
  onAdjustQuantity: (variantId: string, delta: number) => void;
  onPriceChange: (variantId: string, value: number) => void;
  onPromoPriceChange: (variantId: string, value: number | null) => void;
  selectedVariantIds: Set<string>;
  onToggleVariantSelection: (variantId: string) => void;
  onSelectAllVariants: (productId: string, variantIds: string[]) => void;
  isProductSelected: boolean;
  onToggleProductSelection: (productId: string) => void;
  isSaving: boolean;
  language: 'bg' | 'en';
}

function PriceInput({
  value,
  disabled,
  onChange,
  theme,
  className = 'w-24',
}: {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  theme: ReturnType<typeof useTheme>['theme'];
  className?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      step="0.01"
      value={Number.isFinite(value) ? value : 0}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={`${className} px-2 py-1 text-sm text-center border rounded`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text,
      }}
    />
  );
}

function PromoPriceInput({
  value,
  price,
  disabled,
  language,
  onChange,
  theme,
}: {
  value: number | null;
  price: number;
  disabled?: boolean;
  language: 'bg' | 'en';
  onChange: (value: number | null) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const displayValue = value == null ? '' : value;
  const discount =
    value != null && value > 0 && price > 0 && value < price
      ? getDiscountPercentFromPrices(price, value)
      : 0;

  return (
    <div className="space-y-1">
      <input
        type="number"
        min={0}
        step="0.01"
        placeholder="—"
        value={displayValue}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) {
            onChange(null);
            return;
          }
          onChange(parseFloat(raw) || 0);
        }}
        className="w-24 px-2 py-1 text-sm text-center border rounded"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          color: theme.colors.text,
        }}
      />
      {discount > 0 && (
        <span className="inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded text-white bg-red-600">
          −{discount}%
        </span>
      )}
    </div>
  );
}

function statusLabel(status: ReturnType<typeof getVariantStockStatus>, _language?: 'bg' | 'en') {
  switch (status) {
    case 'in_stock':
      return 'In stock';
    case 'low_stock':
      return 'Low stock';
    case 'out_of_stock':
      return 'Out of stock';
    case 'negative':
      return 'Negative';
    default:
      return 'Untracked';
  }
}

function statusBadgeVariant(status: ReturnType<typeof getVariantStockStatus>) {
  switch (status) {
    case 'in_stock':
      return 'success' as const;
    case 'low_stock':
      return 'warning' as const;
    case 'out_of_stock':
    case 'negative':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

function SizeBadge({
  variant,
  language,
}: {
  variant: StockVariant;
  language: 'bg' | 'en';
}) {
  const size = getVariantSize(variant) || ('—');
  const status = getVariantStockStatus(variant);
  const colorClass =
    status === 'out_of_stock' || status === 'negative'
      ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
      : status === 'low_stock'
        ? 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300'
        : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${colorClass}`}
      title={`${size}: ${variant.quantity}`}
    >
      <span>{size}</span>
      <span className="opacity-70">:</span>
      <span>{variant.quantity}</span>
    </span>
  );
}

function VariantRowControls({
  variant,
  currentQuantity,
  currentPrice,
  currentPromoPrice,
  isHighlighted,
  isSelected,
  isSaving,
  language,
  theme,
  onQuantityChange,
  onAdjustQuantity,
  onPriceChange,
  onPromoPriceChange,
  onToggleSelection,
}: {
  variant: StockVariant;
  currentQuantity: number;
  currentPrice: number;
  currentPromoPrice: number | null;
  isHighlighted: boolean;
  isSelected: boolean;
  isSaving: boolean;
  language: 'bg' | 'en';
  theme: ReturnType<typeof useTheme>['theme'];
  onQuantityChange: (variantId: string, value: number) => void;
  onAdjustQuantity: (variantId: string, delta: number) => void;
  onPriceChange: (variantId: string, value: number) => void;
  onPromoPriceChange: (variantId: string, value: number | null) => void;
  onToggleSelection: (variantId: string) => void;
}) {
  const status = getVariantStockStatus(variant);
  const size = getVariantSize(variant) || '—';
  const color = getVariantColor(variant) || '—';

  const rowStyle = isHighlighted
    ? { backgroundColor: `${theme.colors.primary}12`, borderColor: theme.colors.primary }
    : { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border };

  return (
    <div
      className="rounded-lg border p-3 space-y-3 lg:hidden"
      style={rowStyle}
      data-variant-id={variant.productvariantid}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onToggleSelection(variant.productvariantid)}
          className="mt-0.5 shrink-0"
          aria-label={'Select variant'}
        >
          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{size}</span>
            <span className="text-sm opacity-70">{color}</span>
            <Badge variant={statusBadgeVariant(status)}>{statusLabel(status, language)}</Badge>
          </div>
          {variant.sku && (
            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
              SKU: {variant.sku}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 space-y-2">
          <div>
            <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
              {'Price'}
            </p>
            <PriceInput
              value={currentPrice}
              disabled={isSaving}
              onChange={(v) => onPriceChange(variant.productvariantid, v)}
              theme={theme}
              className="w-20"
            />
          </div>
          <div>
            <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
              {'Promo'}
            </p>
            <PromoPriceInput
              value={currentPromoPrice}
              price={currentPrice}
              disabled={isSaving}
              language={language}
              onChange={(v) => onPromoPriceChange(variant.productvariantid, v)}
              theme={theme}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs mb-1" style={{ color: theme.colors.textSecondary }}>
            {'Stock'}
          </p>
          <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onAdjustQuantity(variant.productvariantid, -1)}
          className="p-2 rounded-lg border disabled:opacity-50"
          style={{ borderColor: theme.colors.border }}
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          min={0}
          value={currentQuantity}
          disabled={isSaving || !variant.trackquantity}
          onChange={(e) => onQuantityChange(variant.productvariantid, parseInt(e.target.value, 10) || 0)}
          className="w-20 px-2 py-1.5 text-sm text-center border rounded-lg"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
        />
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onAdjustQuantity(variant.productvariantid, 1)}
          className="p-2 rounded-lg border disabled:opacity-50"
          style={{ borderColor: theme.colors.border }}
        >
          <Plus size={14} />
        </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductStockCard({
  product,
  isExpanded,
  onToggleExpand,
  matchedVariantIds,
  editedQuantities,
  savedQuantities,
  editedPrices,
  savedPrices,
  editedPromoPrices,
  savedPromoPrices,
  onQuantityChange,
  onAdjustQuantity,
  onPriceChange,
  onPromoPriceChange,
  selectedVariantIds,
  onToggleVariantSelection,
  onSelectAllVariants,
  isProductSelected,
  onToggleProductSelection,
  isSaving,
  language,
}: ProductStockCardProps) {
  const { theme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchedVariantIds.size === 0 || !isExpanded) return;
    const firstMatch = product.variants.find((v) => matchedVariantIds.has(v.productvariantid));
    if (!firstMatch) return;
    const el = cardRef.current?.querySelector(`[data-variant-id="${firstMatch.productvariantid}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isExpanded, matchedVariantIds, product.variants]);

  const allSelected = product.variants.every((v) => selectedVariantIds.has(v.productvariantid));
  const hasWarning = product.has_out_of_stock || product.has_low_stock || product.has_negative_stock;

  return (
    <div
      ref={cardRef}
      className="rounded-lg border shadow-sm overflow-hidden"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onToggleProductSelection(product.productid)}
            className="mt-1 shrink-0 self-start touch-manipulation"
            aria-label={'Select product'}
          >
            {isProductSelected ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>

          {product.primary_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.primary_image}
              alt=""
              loading="lazy"
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border shrink-0"
              style={{ borderColor: theme.colors.border }}
            />
          ) : (
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border shrink-0 flex items-center justify-center text-xs opacity-50"
              style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
            >
              {'None'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href="/admin/products"
                  className="font-semibold text-sm sm:text-base hover:underline line-clamp-2"
                  style={{ color: theme.colors.primary }}
                >
                  {product.product_name}
                </Link>
                {product.colors.length > 0 && (
                  <p className="text-xs sm:text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                    {product.colors.join(', ')}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {product.isdisabled && (
                    <Badge variant="neutral">
                      {'Hidden from shop'}
                    </Badge>
                  )}
                  {product.awaitingrestock && (
                    <Badge variant="warning">
                      {'Out of stock display'}
                    </Badge>
                  )}
                </div>
              </div>
              {hasWarning && (
                <AlertCircle
                  size={18}
                  className={`shrink-0 ${
                    product.has_out_of_stock || product.has_negative_stock
                      ? 'text-red-500'
                      : 'text-yellow-500'
                  }`}
                />
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
              <span style={{ color: theme.colors.textSecondary }}>
                {'Total stock'}:{' '}
                <strong style={{ color: theme.colors.text }}>{product.total_stock}</strong>
              </span>
              <span style={{ color: theme.colors.textSecondary }}>
                {'Variants'}:{' '}
                <strong style={{ color: theme.colors.text }}>{product.variant_count}</strong>
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {product.variants.map((variant) => (
                <SizeBadge key={variant.productvariantid} variant={variant} language={language} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.cardBg,
            }}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded
              ? 'Hide sizes'
              : 'Show sizes'}
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#ffffff',
            }}
          >
            {'Manage sizes'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div
          className="border-t px-4 sm:px-5 py-4 space-y-3"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBg }}
        >
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              onClick={() =>
                onSelectAllVariants(
                  product.productid,
                  product.variants.map((v) => v.productvariantid)
                )
              }
              className="text-xs sm:text-sm underline"
              style={{ color: theme.colors.primary }}
            >
              {allSelected
                ? 'Clear selection'
                : 'Select all'}
            </button>
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: theme.colors.textSecondary }}>
                  <th className="text-left py-2 pr-2 w-8" />
                  <th className="text-left py-2 pr-3">{'Size'}</th>
                  <th className="text-left py-2 pr-3">{'Color'}</th>
                  <th className="text-left py-2 pr-3">SKU</th>
                  <th className="text-left py-2 pr-3">{'Stock'}</th>
                  <th className="text-left py-2 pr-3">{'Adjustment'}</th>
                  <th className="text-left py-2 pr-3">{'Price'}</th>
                  <th className="text-left py-2 pr-3">{'Promo'}</th>
                  <th className="text-left py-2">{'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => {
                  const currentQuantity =
                    editedQuantities[variant.productvariantid] ??
                    savedQuantities[variant.productvariantid] ??
                    variant.quantity;
                  const currentPrice =
                    editedPrices[variant.productvariantid] ??
                    savedPrices[variant.productvariantid] ??
                    variant.price;
                  const currentPromoPrice =
                    editedPromoPrices[variant.productvariantid] !== undefined
                      ? editedPromoPrices[variant.productvariantid]
                      : savedPromoPrices[variant.productvariantid] !== undefined
                        ? savedPromoPrices[variant.productvariantid]
                        : variant.promotional_price;
                  const isHighlighted = matchedVariantIds.has(variant.productvariantid);
                  const isSelected = selectedVariantIds.has(variant.productvariantid);
                  const status = getVariantStockStatus(variant);

                  return (
                    <tr
                      key={variant.productvariantid}
                      data-variant-id={variant.productvariantid}
                      style={{
                        backgroundColor: isHighlighted ? `${theme.colors.primary}12` : undefined,
                      }}
                    >
                      <td className="py-2 pr-2 align-middle">
                        <button
                          type="button"
                          onClick={() => onToggleVariantSelection(variant.productvariantid)}
                          aria-label={'Select'}
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="py-2 pr-3 align-middle font-medium">
                        {getVariantSize(variant) || '—'}
                      </td>
                      <td className="py-2 pr-3 align-middle">{getVariantColor(variant) || '—'}</td>
                      <td className="py-2 pr-3 align-middle text-xs">{variant.sku || '—'}</td>
                      <td className="py-2 pr-3 align-middle font-semibold">{currentQuantity}</td>
                      <td className="py-2 pr-3 align-middle">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => onAdjustQuantity(variant.productvariantid, -1)}
                            className="p-1.5 rounded border disabled:opacity-50"
                            style={{ borderColor: theme.colors.border }}
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={currentQuantity}
                            disabled={isSaving || !variant.trackquantity}
                            onChange={(e) =>
                              onQuantityChange(
                                variant.productvariantid,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-16 px-2 py-1 text-center border rounded"
                            style={{
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                              color: theme.colors.text,
                            }}
                          />
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => onAdjustQuantity(variant.productvariantid, 1)}
                            className="p-1.5 rounded border disabled:opacity-50"
                            style={{ borderColor: theme.colors.border }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 pr-3 align-middle">
                        <PriceInput
                          value={currentPrice}
                          disabled={isSaving}
                          onChange={(v) => onPriceChange(variant.productvariantid, v)}
                          theme={theme}
                        />
                      </td>
                      <td className="py-2 pr-3 align-middle">
                        <PromoPriceInput
                          value={currentPromoPrice}
                          price={currentPrice}
                          disabled={isSaving}
                          language={language}
                          onChange={(v) => onPromoPriceChange(variant.productvariantid, v)}
                          theme={theme}
                        />
                      </td>
                      <td className="py-2 align-middle">
                        <Badge variant={statusBadgeVariant(status)}>
                          {statusLabel(status, language)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-2">
            {product.variants.map((variant) => (
              <VariantRowControls
                key={variant.productvariantid}
                variant={variant}
                currentQuantity={
                  editedQuantities[variant.productvariantid] ??
                  savedQuantities[variant.productvariantid] ??
                  variant.quantity
                }
                currentPrice={
                  editedPrices[variant.productvariantid] ??
                  savedPrices[variant.productvariantid] ??
                  variant.price
                }
                currentPromoPrice={
                  editedPromoPrices[variant.productvariantid] !== undefined
                    ? editedPromoPrices[variant.productvariantid]
                    : savedPromoPrices[variant.productvariantid] !== undefined
                      ? savedPromoPrices[variant.productvariantid]
                      : variant.promotional_price
                }
                isHighlighted={matchedVariantIds.has(variant.productvariantid)}
                isSelected={selectedVariantIds.has(variant.productvariantid)}
                isSaving={isSaving}
                language={language}
                theme={theme}
                onQuantityChange={onQuantityChange}
                onAdjustQuantity={onAdjustQuantity}
                onPriceChange={onPriceChange}
                onPromoPriceChange={onPromoPriceChange}
                onToggleSelection={onToggleVariantSelection}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { LARGE_REDUCTION_THRESHOLD };
