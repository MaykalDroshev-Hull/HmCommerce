'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Sparkles, X, SlidersHorizontal, Tag, FileText, ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';
import ProductFilters from './ProductFilters';
import FilterDrawer from './FilterDrawer';
import CategoryPillsNav from './CategoryPillsNav';
import { Product } from '@/lib/data';
import { searchSite } from '@/lib/siteSearch';

import { useLanguage } from '@/context/LanguageContext';
import { useProductTypes } from '@/context/ProductTypeContext';
import { useProperties } from '@/context/PropertiesContext';
import { useAuth } from '@/context/AuthContext';
import { translations } from '@/lib/translations';
import { isListedOnStorefront } from '@/lib/product-availability';
import { isSizePropertyKey, productHasSizeInStock } from '@/lib/variant-stock';

interface StorePageProps {
  products: Product[];
  currentPage: string;
}

export default function StorePage({ products, currentPage }: StorePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategoryFromUrl = searchParams.get('producttypeid') || 'all';
  const rawSearchParam = searchParams.get('search')?.trim() || '';
  const searchQuery = rawSearchParam.toLowerCase();
  const petParam = searchParams.get('pet')?.trim().toLowerCase() || '';

  const siteResults = useMemo(() => {
    if (!rawSearchParam) {
      return { products: [], categories: [], pages: [], totalMatches: 0 };
    }
    return searchSite(rawSearchParam, products);
  }, [rawSearchParam, products]);

  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState<string>('featured');

  const { language } = useLanguage();
  const { productTypes, getCategoryPath } = useProductTypes();
  const { properties } = useProperties();
  const { user, isAuthenticated } = useAuth();
  const t = translations[language];
  const [favoriteStatus, setFavoriteStatus] = useState<Record<string, boolean>>({});
  
  // Create a map from propertyId to property name for filtering
  const propertyIdToNameMap = new Map<string, string>();
  properties.forEach(property => {
    const propertyId = property.propertyid || (property as any).PropertyID || (property as any).id;
    const propertyName = property.name || (property as any).Name;
    if (propertyId && propertyName) {
      propertyIdToNameMap.set(propertyId, propertyName);
    }
  });

  // Map currentPage to rfproducttypeid for category pages
  const getRfProductTypeId = (page: string) => {
    const mapping: Record<string, number> = {
      'for-him': 1,
      'for-her': 2,
      'accessories': 3
    };
    return mapping[page];
  };

  const currentRfProductTypeId = getRfProductTypeId(currentPage);

  // Use category from URL, default to 'all' if not specified
  const activeCategoryFilter = selectedCategoryFromUrl;

  const filteredProducts = products.filter(p => {
    if (!isListedOnStorefront(p)) return false;

    // Search query filter (tokenized matching)
    if (searchQuery) {
      const tokens = searchQuery.split(/\s+/).filter(Boolean);
      const matchTarget = `${p.brand || ''} ${p.model || ''} ${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase();
      const matchesAll = tokens.every(token => matchTarget.includes(token));
      if (!matchesAll) return false;
    }

    // Pet category filter (dogs, cats, unipet)
    if (petParam) {
      const matchTarget = `${p.brand || ''} ${p.model || ''} ${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase();
      if (petParam === 'dogs') {
        if (matchTarget.includes('cat') && !matchTarget.includes('dog')) return false;
      } else if (petParam === 'cats') {
        if (matchTarget.includes('dog') && !matchTarget.includes('cat')) return false;
      }
    }

    // Category/Product Type filtering with hierarchy support

    if (activeCategoryFilter === 'all') {
      // Show all products
    } else {
      // Check if we're filtering by product type ID (new system)
      const productType = productTypes.find(type => type.producttypeid === activeCategoryFilter);
      if (productType) {
        // If this is a parent category, include products from all child categories
        const isParentCategory = productType.children && productType.children.length > 0;
        if (isParentCategory) {
          // Get all child category IDs
          const childCategoryIds = productType.children!.map(child => child.producttypeid);
          // Include products from parent or any child
          const matchesParent = p.productTypeID === activeCategoryFilter;
          const matchesChild = childCategoryIds.includes(p.productTypeID || '');
          if (!matchesParent && !matchesChild) return false;
        } else {
          // Leaf category - only show products from this exact category
          if (p.productTypeID !== activeCategoryFilter) return false;
        }
      } else {
        // Fallback to legacy category filtering
        if (p.category !== activeCategoryFilter) return false;
      }
    }

    // Property-based filtering
    for (const [filterKey, filterValue] of Object.entries(selectedFilters)) {
      if (!filterValue || filterValue === '') continue;

      // Handle range filters (min/max)
      if (filterKey.endsWith('_min') || filterKey.endsWith('_max')) {
        const propertyName = filterKey.replace(/_(min|max)$/, '');
        const isMin = filterKey.endsWith('_min');

        // First try propertyValues, then fallback to legacy fields
        let propertyValue = p.propertyValues?.[propertyName];
        if (!propertyValue) {
          // Fallback to legacy field (convert to lowercase for matching)
          const legacyField = propertyName.toLowerCase();
          propertyValue = (p as any)[legacyField];
        }

        if (propertyValue) {
          // Handle both string and array property values
          const valueToParse = Array.isArray(propertyValue) ? propertyValue[0] : propertyValue;
          const numericValue = parseFloat(valueToParse);
          const filterNumber = parseFloat(filterValue);

          if (!isNaN(numericValue) && !isNaN(filterNumber)) {
            if (isMin && numericValue < filterNumber) return false;
            if (!isMin && numericValue > filterNumber) return false;
          }
        }
        continue;
      }

      // Regular property filtering
      // filterKey is propertyId, map it to property name first
      const propertyName = propertyIdToNameMap.get(filterKey) || filterKey;

      if (
        isSizePropertyKey(filterKey, propertyName) &&
        typeof filterValue === 'string' &&
        filterValue
      ) {
        if (!productHasSizeInStock(p, filterValue)) return false;
        continue;
      }
      
      // Try propertyValues using property name first
      let propertyValue = p.propertyValues?.[propertyName];
      let matched = false;
      
      // Check if propertyValue matches filter
      if (propertyValue) {
        if (typeof filterValue === 'string' && propertyValue === filterValue) {
          matched = true;
        } else if (typeof filterValue === 'string' && typeof propertyValue === 'string' && propertyValue.toLowerCase().includes(filterValue.toLowerCase())) {
          matched = true;
        }
      }
      
      // Also check ALL variants for property values - match by propertyId OR property name
      // A product matches if ANY variant has the matching property value
      if (!matched) {
        const productVariants = p.variants || p.Variants || [];
        for (const variant of productVariants) {
          const propertyValues = variant.ProductVariantPropertyvalues || 
                                variant.ProductVariantPropertyValues || 
                                variant.product_variant_property_values ||
                                variant.productVariantPropertyvalues ||
                                [];
          for (const pv of propertyValues) {
            const propId = pv.propertyid || pv.PropertyID || pv.Property?.propertyid || pv.properties?.propertyid;
            const propName = pv.Property?.name || pv.Property?.Name || pv.properties?.name || pv.properties?.Name || '';
            // Match by propertyId OR property name
            if (propId === filterKey || propName === propertyName || propName === filterKey) {
              const variantValue = pv.value || pv.Value || '';
              // Check if this variant's value matches the filter
              if (variantValue && typeof filterValue === 'string') {
                if (variantValue === filterValue) {
                  matched = true;
                  break;
                } else if (typeof variantValue === 'string' && variantValue.toLowerCase().includes(filterValue.toLowerCase())) {
                  matched = true;
                  break;
                }
              }
            }
          }
          if (matched) break;
        }
      }
      
      // Fallback to legacy field if still no match
      if (!matched) {
        // Also handle legacy- prefix (e.g., "legacy-size" -> "size")
        let legacyField = filterKey.toLowerCase();
        if (legacyField.startsWith('legacy-')) {
          legacyField = legacyField.replace('legacy-', '');
        }
        if (legacyField === 'size' && typeof filterValue === 'string' && filterValue) {
          if (!productHasSizeInStock(p, filterValue)) return false;
          continue;
        }
        const legacyValue = (p as any)[legacyField];
        if (legacyValue && typeof filterValue === 'string') {
          if (legacyValue === filterValue) {
            matched = true;
          } else if (typeof legacyValue === 'string' && legacyValue.toLowerCase().includes(filterValue.toLowerCase())) {
            matched = true;
          }
        }
      }

      // If no match found, exclude this product
      if (!matched) {
        return false;
      }
    }

    return true;
  });

  // Memoize product IDs for dependency array
  const productIdsString = useMemo(() => {
    return filteredProducts
      .map(p => String(p.id || p.productid || ''))
      .filter(id => id !== '')
      .sort()
      .join(',');
  }, [filteredProducts]);

  // Batch check favorites for all filtered products
  useEffect(() => {
    if (isAuthenticated && user && filteredProducts.length > 0) {
      const checkFavorites = async () => {
        try {
          const productIds = filteredProducts
            .map(p => String(p.id || p.productid || ''))
            .filter(id => id !== '');
          
          if (productIds.length === 0) return;

          const response = await fetch('/api/favorites/check-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              productIds: productIds
            })
          });

          const data = await response.json();
          if (data.success && data.favorites) {
            setFavoriteStatus(data.favorites);
          }
        } catch (error) {
        }
      };

      checkFavorites();
    } else {
      setFavoriteStatus({});
    }
  }, [isAuthenticated, user, productIdsString, filteredProducts.length]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortOption === 'price-low') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOption === 'price-high') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortOption === 'newest') {
      list.sort((a, b) => (b.isfeatured ? 1 : 0) - (a.isfeatured ? 1 : 0));
    } else {
      list.sort((a, b) => (b.isfeatured ? 1 : 0) - (a.isfeatured ? 1 : 0));
    }
    return list;
  }, [filteredProducts, sortOption]);

  const getPageMeta = () => {
    if (searchQuery) {
      return {
        kicker: 'SEARCH RESULTS',
        title: `Results for "${searchParams.get('search')}"`,
        subtitle: `Showing all gear matching your search. Found ${filteredProducts.length} items ready for your next adventure.`,
      };
    }
    if (petParam === 'dogs') {
      return {
        kicker: 'FOR CANINE EXPLORERS',
        title: 'Dog Gear & Essentials',
        subtitle: 'Engineered for daily woodland walks, muddy puddle zoomies, and rugged coastal hikes with zero coat chafing.',
      };
    }
    if (petParam === 'cats') {
      return {
        kicker: 'FOR CURIOUS FELINES',
        title: 'Cat Gear & Essentials',
        subtitle: 'Featherlight break-away collars, gentle walking harnesses, and cosy resting spots crafted for curious cats.',
      };
    }
    if (petParam === 'unipet') {
      return {
        kicker: 'FOR ALL PET PARENTS',
        title: 'Unipet Adventure Gear',
        subtitle: 'Multi-pet travel mats, waterproof accessories, and enrichment essentials designed for all family furbabies.',
      };
    }
    if (currentPage === 'for-him') {
      return {
        kicker: 'OUTDOOR ESSENTIALS',
        title: 'Adventure Collars',
        subtitle: 'Ripstop hydrophobic webbing, aircraft-grade alloy buckles, and ergonomic zero-pinch designs for all weather.',
      };
    }
    if (currentPage === 'for-her') {
      return {
        kicker: 'ERGONOMIC COMFORT',
        title: 'Harnesses & Leads',
        subtitle: 'Front-clip no-pull harnesses and shock-absorbing leads tested on British countryside trails.',
      };
    }
    if (currentPage === 'accessories') {
      return {
        kicker: 'TRAIL & TRAVEL',
        title: 'Pet Accessories',
        subtitle: 'Travel water bottles, treat pouches, and weatherproof accessories built for devoted UK pet parents on the go.',
      };
    }
    if (activeCategoryFilter !== 'all') {
      const productType = productTypes.find(type => type.producttypeid === activeCategoryFilter);
      if (productType) {
        return {
          kicker: 'COLLECTION',
          title: productType.name,
          subtitle: 'Thoughtfully crafted pet gear designed for comfort, safety, and lasting outdoor memories.',
        };
      }
    }
    return {
      kicker: 'PREMIUM BRITISH PET GEAR',
      title: 'All Pet Gear',
      subtitle: 'Engineered for daily woodland rambles, muddy puddle zoomies, and quiet moments curled up together at home.',
    };
  };

  const meta = getPageMeta();
  const categoryPath = activeCategoryFilter !== 'all' ? getCategoryPath(activeCategoryFilter) : [];

  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Editorial Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-medium text-neutral-500">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/" className="hover:text-neutral-900 transition-colors">
                Home
              </Link>
            </li>
            <li className="text-neutral-400">
              <ChevronRight size={13} />
            </li>
            <li>
              <Link href="/products" className={`hover:text-neutral-900 transition-colors ${categoryPath.length === 0 && !searchQuery ? 'text-neutral-900 font-semibold' : ''}`}>
                Products
              </Link>
            </li>
            {categoryPath.map((cat, index) => (
              <li key={cat.producttypeid} className="flex items-center gap-1.5">
                <ChevronRight size={13} className="text-neutral-400" />
                {index === categoryPath.length - 1 ? (
                  <span className="text-neutral-900 font-semibold">{cat.name}</span>
                ) : (
                  <Link
                    href={`/products?producttypeid=${cat.producttypeid}`}
                    className="hover:text-neutral-900 transition-colors"
                  >
                    {cat.name}
                  </Link>
                )}
              </li>
            ))}
            {searchQuery && (
              <li className="flex items-center gap-1.5">
                <ChevronRight size={13} className="text-neutral-400" />
                <span className="text-neutral-900 font-semibold">Search</span>
              </li>
            )}
          </ol>
        </nav>

        {/* Page Title & Editorial Header */}
        <div className="mb-6 sm:mb-8 pb-6 border-b border-neutral-200/80">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 mb-1.5">
            {meta.kicker}
          </p>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-950">
              {meta.title}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl mt-1.5 leading-relaxed font-light">
              {meta.subtitle}
            </p>
          </div>


          {/* Active Search Query Tag & Matched Categories / Pages */}
          {searchQuery && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-500">Filtered by search:</span>
                <button
                  type="button"
                  onClick={() => router.push('/products')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors"
                >
                  <span>&quot;{searchParams.get('search')}&quot;</span>
                  <X size={13} />
                </button>
              </div>

              {/* Matching Collections & Categories */}
              {siteResults.categories.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 mb-2">
                    <Tag size={12} className="text-neutral-500" />
                    <span>Matching Categories ({siteResults.categories.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {siteResults.categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={cat.href}
                        className="p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-neutral-900 group-hover:text-neutral-950 truncate">
                            {cat.name}
                          </p>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5 font-light">
                            {cat.description}
                          </p>
                        </div>
                        <ArrowRight size={13} className="text-neutral-400 group-hover:text-neutral-900 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Pages & Support */}
              {siteResults.pages.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 mb-2">
                    <FileText size={12} className="text-neutral-500" />
                    <span>Matching Pages &amp; Guides ({siteResults.pages.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {siteResults.pages.map((page) => (
                      <Link
                        key={page.id}
                        href={page.href}
                        className="p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-neutral-900 group-hover:text-neutral-950 truncate">
                            {page.title}
                          </p>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5 font-light">
                            {page.description}
                          </p>
                        </div>
                        <ArrowRight size={13} className="text-neutral-400 group-hover:text-neutral-900 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category Pills & Controls Toolbar */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CategoryPillsNav />
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
              <select
                aria-label="Sort products"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 rounded-full focus:outline-none focus:border-neutral-900 shadow-2xs hover:border-neutral-400 transition-colors"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
              <ProductFilters
                selectedFilters={selectedFilters}
                onToggleVisibility={() => setShowFilters(!showFilters)}
                layout="bar"
                placement="desktop"
              />
            </div>
          </div>

          {/* Mobile Filter & Sort Bar */}
          <div className="sm:hidden flex items-center gap-2">
            <select
              aria-label="Sort products"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-full focus:outline-none shadow-2xs"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-neutral-900 bg-white border border-neutral-200 shadow-2xs shrink-0"
            >
              <SlidersHorizontal size={13} />
              <span>Filters</span>
              {Object.keys(selectedFilters).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {Object.keys(selectedFilters).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Drawer */}
        <FilterDrawer
          products={products}
          filteredProducts={sortedProducts}
          selectedFilters={selectedFilters}
          onFiltersChange={setSelectedFilters}
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          selectedProductTypeId={
            productTypes.some(type => type.producttypeid === activeCategoryFilter)
              ? activeCategoryFilter
              : null
          }
        />

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
          {sortedProducts.map((product) => {
            const productId = String(product.id || product.productid || '');
            return (
              <ProductCard
                key={product.id}
                product={product}
                isFavorited={favoriteStatus[productId] || false}
              />
            );
          })}
        </div>

        {/* Friendly Pet Parent Empty State */}
        {sortedProducts.length === 0 && (
          <div className="text-center py-16 sm:py-24 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-700">
              <Sparkles size={22} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-950 mb-1">
              {siteResults.categories.length > 0 || siteResults.pages.length > 0
                ? 'Explore matching categories & pages above'
                : 'No tail-wagging treats found'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 mb-6 font-light">
              {siteResults.categories.length > 0 || siteResults.pages.length > 0
                ? `We couldn't find individual products matching "${searchParams.get('search')}", but we found relevant categories and guides highlighted above for you to explore!`
                : "We couldn't find any items matching your current filters or search terms. Try adjusting your selections or view all pet gear."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedFilters({});
                router.push('/products');
              }}
              className="px-5 py-2.5 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              View All Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


