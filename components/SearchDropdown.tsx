'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Product } from '@/lib/data';
import { searchSite, SearchCategoryItem, SearchPageItem } from '@/lib/siteSearch';
import { ShoppingBag, Tag, FileText, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';

interface SearchDropdownProps {
  query: string;
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function SearchDropdown({
  query,
  products,
  isOpen,
  onClose,
  className = '',
}: SearchDropdownProps) {
  const router = useRouter();

  const results = useMemo(() => {
    return searchSite(query, products);
  }, [query, products]);

  if (!isOpen || !query.trim()) {
    return null;
  }

  const handleProductClick = (productId: string | number) => {
    onClose();
    router.push(`/products/${productId}`);
  };

  const handleLinkClick = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleViewAllProducts = () => {
    onClose();
    router.push(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '£0.00';
    return `£${price.toFixed(2)}`;
  };

  const hasAnyResults = results.totalMatches > 0;

  return (
    <div
      className={`absolute left-0 right-0 sm:left-auto sm:right-0 w-full sm:w-[480px] lg:w-[540px] max-h-[75vh] sm:max-h-[580px] bg-white rounded-2xl border border-neutral-200/90 shadow-2xl overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-neutral-100 ${className}`}
      style={{
        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Search Header Status */}
      <div className="px-4 py-2.5 bg-neutral-50/80 flex items-center justify-between text-[11px] text-neutral-500 font-medium">
        <span>
          Search results for &quot;<strong className="text-neutral-900 font-semibold">{query}</strong>&quot;
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-neutral-400">
          Press <CornerDownLeft size={10} /> to view all
        </span>
      </div>

      {!hasAnyResults ? (
        <div className="p-6 text-center space-y-3">
          <p className="text-xs sm:text-sm font-semibold text-neutral-900">
            No matching products, categories, or pages
          </p>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto font-light">
            We couldn&apos;t find anything matching &quot;{query}&quot;. Try checking for spelling or explore our popular categories below:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              { label: 'Collars', href: '/for-him' },
              { label: 'Harnesses', href: '/for-her' },
              { label: 'Dogs', href: '/products?pet=dogs' },
              { label: 'Cats', href: '/products?pet=cats' },
              { label: 'Size Guide', href: '/size-guide' },
              { label: 'Delivery & Help', href: '/support' },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => handleLinkClick(s.href)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 hover:bg-neutral-950 hover:text-white transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {/* 1. CATEGORIES */}
          {results.categories.length > 0 && (
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 mb-2 px-1">
                <Tag size={12} className="text-neutral-500" />
                <span>Categories ({results.categories.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {results.categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleLinkClick(cat.href)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100/80 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-neutral-900 group-hover:text-neutral-950 truncate">
                        {cat.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate leading-tight mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                    <ArrowRight size={13} className="text-neutral-400 group-hover:text-neutral-900 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. PAGES */}
          {results.pages.length > 0 && (
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 mb-2 px-1">
                <FileText size={12} className="text-neutral-500" />
                <span>Pages &amp; Support ({results.pages.length})</span>
              </div>
              <div className="space-y-1">
                {results.pages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => handleLinkClick(page.href)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100/80 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-neutral-900 group-hover:text-neutral-950 flex items-center gap-1.5">
                        <span>{page.title}</span>
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate leading-tight mt-0.5">
                        {page.description}
                      </p>
                    </div>
                    <ArrowRight size={13} className="text-neutral-400 group-hover:text-neutral-900 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. PRODUCTS */}
          {results.products.length > 0 && (
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  <ShoppingBag size={12} className="text-neutral-500" />
                  <span>Products ({results.products.length})</span>
                </div>
                {results.products.length > 4 && (
                  <button
                    type="button"
                    onClick={handleViewAllProducts}
                    className="text-[11px] font-medium text-neutral-700 hover:text-neutral-950 underline"
                  >
                    See all
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {results.products.slice(0, 4).map((product) => {
                  const imageSrc =
                    (product.images && product.images[0]) ||
                    (product as any).image ||
                    (product as any).imageurl ||
                    '/placeholder.png';

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductClick(product.id)}
                      className="w-full text-left p-2 rounded-xl hover:bg-neutral-100/80 transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-11 h-11 rounded-lg bg-neutral-100 border border-neutral-200/80 overflow-hidden relative shrink-0">
                        <Image
                          src={imageSrc}
                          alt={product.name || 'Product'}
                          fill
                          sizes="44px"
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-neutral-900 group-hover:text-neutral-950 truncate leading-tight">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5 font-light">
                          {product.category || product.brand || 'MB-Paws'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-neutral-950">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* BOTTOM BAR: View all on products page */}
          <div className="p-3 bg-neutral-50/90 text-center">
            <button
              type="button"
              onClick={handleViewAllProducts}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-[0.12em] bg-neutral-950 hover:bg-neutral-800 text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View all results for &quot;{query}&quot;</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
