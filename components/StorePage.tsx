'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from './ProductCard';
import ProductFilters from './ProductFilters';
import FilterDrawer from './FilterDrawer';
import TrustBar from './TrustBar';
import CategoryPillsNav from './CategoryPillsNav';
import { Product } from '@/lib/data';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
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
  const searchParams = useSearchParams();
  const selectedCategoryFromUrl = searchParams.get('producttypeid') || 'all';
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false); // Always collapsed on page refresh
  const { language } = useLanguage();
  const { theme } = useTheme();
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

  const getPageTitle = () => {
    if (currentPage === 'home') return t.ourCurrentStock;

    // Check if a category is selected from URL
    if (activeCategoryFilter !== 'all') {
      const productType = productTypes.find(type => type.producttypeid === activeCategoryFilter);
      if (productType) {
        return `${productType.name} in Stock`;
      }
    }

    // Fallback to legacy categories
    if (currentPage === 'clothes') return t.clothesInStock;
    if (currentPage === 'shoes') return t.shoesInStock;
    if (currentPage === 'accessories') return t.accessoriesInStock;
    
    // Default titles for main sections
    if (currentPage === 'for-him') return 'For Him';
    if (currentPage === 'for-her') return 'For Her';
    if (currentPage === 'accessories') return t.accessoriesInStock;
    
    return t.ourCurrentStock;
  };

  const isGradientTheme = theme.id === 'gradient';

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        background: isGradientTheme ? theme.colors.background : theme.colors.background,
      }}
    >
      <TrustBar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-5 sm:py-8">
        {activeCategoryFilter !== 'all' && (() => {
          const categoryPath = getCategoryPath(activeCategoryFilter);
          if (categoryPath.length > 0) {
            return (
              <div className="mb-4 text-sm" style={{ color: theme.colors.textSecondary }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="cursor-pointer hover:underline"
                    onClick={() => { window.location.href = `/${currentPage}`; }}
                  >
                    {currentPage === 'for-him' ? 'For Him' :
                     currentPage === 'for-her' ? 'For Her' :
                     currentPage === 'accessories' ? 'Accessories' :
                     'Products'}
                  </span>
                  {categoryPath.map((cat, index) => (
                    <span key={cat.producttypeid} className="flex items-center gap-2">
                      <span>/</span>
                      {index === categoryPath.length - 1 ? (
                        <span style={{ color: theme.colors.text }} className="font-medium">{cat.name}</span>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => { window.location.href = `/${currentPage}?producttypeid=${cat.producttypeid}`; }}
                        >
                          {cat.name}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="mb-5 sm:mb-6">
          <h1
            className="font-serif-display text-2xl sm:text-3xl lg:text-4xl mb-2 transition-colors duration-300"
            style={{ color: theme.colors.text }}
          >
            {getPageTitle()}
          </h1>
          <p
            className="text-sm sm:text-base transition-colors duration-300"
            style={{ color: theme.colors.textSecondary }}
          >
            {t.browseDescription}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CategoryPillsNav />
          <ProductFilters
            selectedFilters={selectedFilters}
            onToggleVisibility={() => setShowFilters(!showFilters)}
            layout="bar"
            placement="desktop"
          />
        </div>

        <ProductFilters
          selectedFilters={selectedFilters}
          onToggleVisibility={() => setShowFilters(!showFilters)}
          layout="bar"
          placement="mobile"
        />

        <FilterDrawer
          products={products}
          filteredProducts={filteredProducts}
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
          {filteredProducts.map(product => {
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

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <p 
              className="text-base sm:text-lg px-4 transition-colors duration-300"
              style={{ color: theme.colors.textSecondary }}
            >
              {t.noProductsAvailable}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

