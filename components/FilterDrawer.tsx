'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Filter, ChevronDown, Search } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useProperties } from '@/context/PropertiesContext';
import { translations } from '@/lib/translations';
import { Product } from '@/lib/data';
import {
  countProductsWithSizeInStock,
  isSizePropertyKey,
  productHasSizeInStock,
  sortSizeValues,
} from '@/lib/variant-stock';

interface FilterDrawerProps {
  products: Product[];
  filteredProducts: Product[];
  selectedFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  isOpen: boolean;
  onClose: () => void;
  selectedProductTypeId?: string | null;
}

export default function FilterDrawer({
  products,
  filteredProducts,
  selectedFilters,
  onFiltersChange,
  isOpen,
  onClose,
  selectedProductTypeId
}: FilterDrawerProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { properties } = useProperties();
  const t = translations[language];
  const [availableValues, setAvailableValues] = useState<Record<string, string[]>>({});
  const [dropdownStates, setDropdownStates] = useState<Record<string, { isOpen: boolean; searchTerm: string }>>({});
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [allowedPropertyIds, setAllowedPropertyIds] = useState<string[] | null>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle drawer visibility and animation
  useEffect(() => {
    if (isOpen) {
      // Show drawer first (will be off-screen initially)
      setDrawerVisible(true);
      setTextVisible(false);
      setShouldAnimate(false);
      
      // Force a reflow, then trigger animation
      // This ensures the drawer starts from closed position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldAnimate(true);
        });
      });
      
      // After drawer slides in (0.6s), fade in text (0.3s)
      const textTimer = setTimeout(() => {
        setTextVisible(true);
      }, 600);
      
      return () => clearTimeout(textTimer);
    } else {
      // When closing, fade out text first (0.3s)
      setTextVisible(false);
      setShouldAnimate(false);
      
      // After text fades and drawer slides out, hide the drawer
      const hideTimer = setTimeout(() => {
        setDrawerVisible(false);
      }, 900);
      
      return () => clearTimeout(hideTimer);
    }
  }, [isOpen]);

  const getPropertyId = (property: any) =>
    property.propertyid || property.PropertyID || property.id;

  useEffect(() => {
    const loadAllowedProperties = async () => {
      if (!selectedProductTypeId) {
        setAllowedPropertyIds(null);
        return;
      }

      try {
        const response = await fetch(`/api/product-types/${selectedProductTypeId}/properties`);
        const result = await response.json();
        if (result.success) {
          const ids = (result.properties || [])
            .map((ptp: any) => ptp?.properties?.propertyid)
            .filter(Boolean);
          setAllowedPropertyIds(ids);
        } else {
          setAllowedPropertyIds(null);
        }
      } catch (error) {
        setAllowedPropertyIds(null);
      }
    };

    loadAllowedProperties();
  }, [selectedProductTypeId]);

  const visibleProperties = allowedPropertyIds
    ? properties.filter((property: any) => allowedPropertyIds.includes(getPropertyId(property)))
    : properties;

  // Load available values from property_values table (via properties context)
  useEffect(() => {
    const values: Record<string, string[]> = {};
    const productValues: Record<string, Set<string>> = {};
    const propertyIdToNameMap: Record<string, string> = {};
    
    visibleProperties.forEach(property => {
      const propertyId = getPropertyId(property);
      const propertyName = property.name || (property as any).Name;
      if (propertyId && propertyName) {
        propertyIdToNameMap[propertyId] = propertyName;
      }
    });
    
    products.forEach(product => {
      if (product.propertyValues) {
        Object.entries(product.propertyValues).forEach(([propertyName, value]) => {
          if (value && typeof value === 'string') {
            if (!productValues[propertyName]) {
              productValues[propertyName] = new Set();
            }
            productValues[propertyName].add(value);
          }
        });
      }

      const productVariants = product.variants || product.Variants || [];
      productVariants.forEach((variant: any) => {
        const propertyValues = variant.ProductVariantPropertyvalues || 
                              variant.ProductVariantPropertyValues || 
                              variant.product_variant_property_values ||
                              variant.productVariantPropertyvalues ||
                              [];
        propertyValues.forEach((pv: any) => {
          const propertyId = pv.propertyid || pv.PropertyID || pv.Property?.propertyid || pv.properties?.propertyid;
          const propertyValue = pv.value || pv.Value || '';
          if (propertyId && propertyValue) {
            if (!productValues[propertyId]) {
              productValues[propertyId] = new Set();
            }
            productValues[propertyId].add(propertyValue);
          }
        });
      });

      const legacyFields = ['color', 'size', 'type', 'brand', 'model'];
      legacyFields.forEach(field => {
        const value = (product as any)[field];
        if (value && typeof value === 'string') {
          const propertyName = field.charAt(0).toUpperCase() + field.slice(1);
          if (!productValues[propertyName]) {
            productValues[propertyName] = new Set();
          }
          productValues[propertyName].add(value);
        }
      });
    });

    visibleProperties.forEach(property => {
      const propertyId = getPropertyId(property);
      const propertyName = property.name || (property as any).Name;
      
      if (property.values && property.values.length > 0 && propertyId) {
        const allActiveValues = property.values
          .filter((pv: any) => pv.isactive !== false)
          .map((pv: any) => pv.value);

        const productValuesSet = productValues[propertyId] || productValues[propertyName] || new Set();
        const filteredValues = allActiveValues.filter((value: string) => productValuesSet.has(value));

        const sortedValues = filteredValues.sort((a: string, b: string) => {
          const pvA = property.values?.find((pv: any) => pv.value === a);
          const pvB = property.values?.find((pv: any) => pv.value === b);
          if (pvA?.displayorder !== undefined && pvB?.displayorder !== undefined) {
            return pvA.displayorder - pvB.displayorder;
          }
          if (isSizePropertyKey(propertyId, propertyName)) {
            return sortSizeValues([a, b])[0] === a ? -1 : 1;
          }
          return a.localeCompare(b);
        });

        let valuesForProperty = sortedValues;
        if (isSizePropertyKey(propertyId, propertyName)) {
          valuesForProperty = sortedValues.filter((value: string) =>
            products.some((product) => productHasSizeInStock(product, value))
          );
        }
        
        if (valuesForProperty.length > 0) {
          values[propertyId] = valuesForProperty;
        }
      }
    });

    const propertiesWithValues = new Set(Object.keys(values));
    Object.entries(productValues).forEach(([propertyName, valueSet]) => {
      if (!propertiesWithValues.has(propertyName)) {
        let valueArray = Array.from(valueSet);
        if (isSizePropertyKey(propertyName)) {
          valueArray = sortSizeValues(valueArray).filter((value) =>
            products.some((product) => productHasSizeInStock(product, value))
          );
        } else {
          valueArray = valueArray.sort();
        }
        if (valueArray.length > 0) {
          values[propertyName] = valueArray;
        }
      }
    });

    setAvailableValues(values);
  }, [properties, products, allowedPropertyIds]);


  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(dropdownRefs.current).forEach(([propertyId, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setDropdownStates(prev => ({
            ...prev,
            [propertyId]: { ...prev[propertyId], isOpen: false, searchTerm: '' }
          }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (propertyId: string, value: any) => {
    const newFilters = { ...selectedFilters };

    if (value === '' || value === null || value === undefined) {
      delete newFilters[propertyId];
    } else {
      newFilters[propertyId] = value;
    }

    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getFilterCount = () => {
    return Object.keys(selectedFilters).length;
  };

  const handleApplyFilters = () => {
    onClose();
  };

  const renderFilterInput = (property: any) => {
    const propertyId = property.propertyid || property.PropertyID || property.id;
    const propertyName = property.name || (property as any).Name;
    const dataType = property.datatype || property.DataType || 'text';
    const currentValue = selectedFilters[propertyId] || '';
    const values = (propertyId && availableValues[propertyId]) || [];
    const dropdownState = dropdownStates[propertyId] || { isOpen: false, searchTerm: '' };
    const isSizeFilter = isSizePropertyKey(propertyId, propertyName);

    const formatOptionLabel = (value: string) => {
      if (!isSizeFilter) return value;
      const productCount = countProductsWithSizeInStock(products, value);
      return `${value} (${productCount})`;
    };

    const filteredValues = values.filter((value: string) =>
      value.toLowerCase().includes(dropdownState.searchTerm.toLowerCase())
    );

    const toggleDropdown = () => {
      setDropdownStates(prev => ({
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          isOpen: !prev[propertyId]?.isOpen
        }
      }));
    };

    const handleSearchChange = (term: string) => {
      setDropdownStates(prev => ({
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          searchTerm: term
        }
      }));
    };

    const handleValueSelect = (val: string) => {
      handleFilterChange(propertyId, val);
      setDropdownStates(prev => ({
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          isOpen: false,
          searchTerm: ''
        }
      }));
    };

    const clearSelection = () => {
      handleFilterChange(propertyId, '');
      setDropdownStates(prev => ({
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          searchTerm: ''
        }
      }));
    };

    switch (dataType) {
      case 'select':
        return (
          <div className="relative" ref={(el) => { dropdownRefs.current[propertyId] = el; }}>
            <button
              type="button"
              onClick={toggleDropdown}
              className="w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md transition-colors duration-300"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
            >
              <span className={currentValue ? '' : 'opacity-50'}>
                {currentValue
                  ? formatOptionLabel(currentValue)
                  : 'Select...'}
              </span>
              <div className="flex items-center gap-1">
                {currentValue && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                    }}
                    className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        clearSelection();
                      }
                    }}
                  >
                    <X size={12} />
                  </span>
                )}
                <ChevronDown size={14} className={`transition-transform ${dropdownState.isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {dropdownState.isOpen && (
              <div
                className="absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-hidden"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  boxShadow: theme.effects.shadow
                }}
              >
                <div className="p-2 border-b" style={{ borderColor: theme.colors.border }}>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={dropdownState.searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border rounded transition-colors duration-300"
                      style={{
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto">
                  {filteredValues.length === 0 ? (
                    <div className="px-3 py-2 text-sm opacity-50 text-center">
                      No results
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleValueSelect('')}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        style={{
                          color: theme.colors.textSecondary,
                          backgroundColor: !currentValue ? theme.colors.secondary : 'transparent'
                        }}
                      >
                        All
                      </button>
                      {filteredValues.map((value: string) => (
                        <button
                          key={value}
                          onClick={() => handleValueSelect(value)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          style={{
                            color: theme.colors.text,
                            backgroundColor: currentValue === value ? theme.colors.secondary : 'transparent'
                          }}
                        >
                          {formatOptionLabel(value)}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={selectedFilters[`${propertyId}_min`] || ''}
              onChange={(e) => handleFilterChange(`${propertyId}_min`, e.target.value ? Number(e.target.value) : '')}
              className="flex-1 px-3 py-2 text-sm border rounded-md transition-colors duration-300"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
            />
            <input
              type="number"
              placeholder="Max"
              value={selectedFilters[`${propertyId}_max`] || ''}
              onChange={(e) => handleFilterChange(`${propertyId}_max`, e.target.value ? Number(e.target.value) : '')}
              className="flex-1 px-3 py-2 text-sm border rounded-md transition-colors duration-300"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div className="relative" ref={(el) => { dropdownRefs.current[propertyId] = el; }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
              <input
                type="text"
                placeholder="Search..."
                value={currentValue}
                onChange={(e) => handleFilterChange(propertyId, e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border rounded-md transition-colors duration-300"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
              />
              {currentValue && (
                <button
                  onClick={() => handleFilterChange(propertyId, '')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        );
    }
  };

  // Don't render if drawer is not visible
  if (!drawerVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease-in-out'
        }}
        onClick={onClose}
      />

      {/* Drawer - PC: left side, Mobile/Tablet: bottom */}
      <div
        ref={drawerRef}
        className="absolute h-full md:w-1/5 w-full md:left-0 md:top-0 md:bottom-0 bottom-0 left-0 right-0 shadow-xl border-r border-t md:border-t-0"
        style={{
          backgroundColor: theme.colors.surface,
          borderRightColor: theme.colors.border,
          borderTopColor: theme.colors.border,
          transform: isMobile
            ? (shouldAnimate && isOpen ? 'translateY(0)' : 'translateY(100%)')
            : (shouldAnimate && isOpen ? 'translateX(0)' : 'translateX(-100%)'),
          transition: isOpen
            ? (shouldAnimate ? 'transform 600ms ease-out' : 'transform 0ms')
            : 'transform 600ms ease-out 300ms', // Delay drawer slide by 300ms when closing (after text fades)
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 md:p-6 border-b"
            style={{ 
              borderColor: theme.colors.border,
              opacity: textVisible ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
              transitionDelay: isOpen ? '600ms' : '0ms'
            }}
          >
            <div className="flex items-center gap-2">
              <Filter size={20} style={{ color: theme.colors.text }} />
              <h2 
                className="text-lg md:text-xl font-semibold"
                style={{ color: theme.colors.text }}
              >
                Filters
              </h2>
              {getFilterCount() > 0 && (
                <span
                  className="px-2 py-1 text-xs rounded-full"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: '#ffffff'
                  }}
                >
                  {getFilterCount()}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              style={{ color: theme.colors.text }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div 
            className="flex-1 overflow-y-auto p-4 md:p-6"
            style={{
              opacity: textVisible ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
              transitionDelay: isOpen ? '600ms' : '0ms'
            }}
          >
            {getFilterCount() > 0 && (
              <button
                onClick={clearAllFilters}
                className="w-full mb-4 text-sm px-3 py-2 rounded transition-colors duration-300"
                style={{
                  color: theme.colors.primary,
                  backgroundColor: theme.colors.secondary,
                  border: `1px solid ${theme.colors.border}`
                }}
              >
                Clear All
              </button>
            )}

            <div className="space-y-4">
              {visibleProperties.map(property => {
                const propertyId = getPropertyId(property);
                const propertyName = property.name || (property as any).Name;
                const hasValues = propertyId && availableValues[propertyId] && availableValues[propertyId].length > 0;

                if (!hasValues) return null;

                return (
                  <div key={propertyId}>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      {property.description || propertyName}
                    </label>
                    {renderFilterInput(property)}
                  </div>
                );
              })}

              {/* Legacy properties fallback */}
              {visibleProperties.length === 0 || visibleProperties.every(p => {
                const propertyId = getPropertyId(p);
                const nameKey = p.name || (p as any).Name;
                const hasValuesById = propertyId && availableValues[propertyId] && availableValues[propertyId].length > 0;
                const hasValuesByName = nameKey && availableValues[nameKey] && availableValues[nameKey].length > 0;
                return !hasValuesById && !hasValuesByName;
              }) ? (
                <>
                  {['Color', 'Size', 'Type', 'Brand', 'Model'].map(legacyProperty => {
                    const hasValues = availableValues[legacyProperty] && availableValues[legacyProperty].length > 0;
                    if (!hasValues) return null;

                    const mockProperty = {
                      propertyid: `legacy-${legacyProperty.toLowerCase()}`,
                      name: legacyProperty,
                      datatype: legacyProperty.toLowerCase() === 'size' || legacyProperty.toLowerCase() === 'model' ? 'select' : 'text' as 'text' | 'select' | 'number'
                    };

                    return (
                      <div key={mockProperty.propertyid}>
                        <label
                          className="block text-sm font-medium mb-2"
                          style={{ color: theme.colors.text }}
                        >
                          {legacyProperty}
                        </label>
                        {renderFilterInput(mockProperty)}
                      </div>
                    );
                  })}
                </>
              ) : null}
            </div>

            {visibleProperties.length === 0 && (
              <p
                className="text-sm text-center py-4"
                style={{ color: theme.colors.textSecondary }}
              >
                No filters available
              </p>
            )}
          </div>

          {/* Footer with Apply button */}
          <div 
            className="p-4 md:p-6 border-t"
            style={{ 
              borderColor: theme.colors.border,
              opacity: textVisible ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
              transitionDelay: isOpen ? '600ms' : '0ms'
            }}
          >
            <button
              onClick={handleApplyFilters}
              className="w-full px-4 py-3 rounded-lg font-medium transition-all duration-300"
              style={{
                backgroundColor: theme.colors.primary,
                color: '#ffffff',
                boxShadow: theme.effects.shadow
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = theme.effects.shadowHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = theme.effects.shadow;
              }}
            >
              {`Show ${filteredProducts.length} products`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
