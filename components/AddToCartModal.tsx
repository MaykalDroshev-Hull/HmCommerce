// components/AddToCartModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { Product } from '@/lib/data';
import { translations } from '@/lib/translations';
import {
  getOptionStockQuantity,
  getOptionStockStatus,
  LOW_STOCK_MAX,
} from '@/lib/variant-stock';
import { getVariantEffectivePrice } from '@/lib/product-promo';

interface AddToCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const AddToCartModal: React.FC<AddToCartModalProps> = ({ isOpen, onClose, product }) => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { addItem, openCart } = useCart();
  const t = translations[language || 'en'];

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [availableOptions, setAvailableOptions] = useState<Record<string, Set<string>>>({});
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Extract available properties from product variants
  useEffect(() => {
    if (isOpen && product) {
      const productVariants = product.variants || product.Variants || [];
      
      if (Array.isArray(productVariants) && productVariants.length > 0) {
        const visibleVariants = productVariants.filter((v: any) => v.isvisible !== false);
        setVariants(visibleVariants);
        // Build available options map from all variants
        const optionsMap: Record<string, Set<string>> = {};
        visibleVariants.forEach((variant: any) => {
          // Try multiple naming conventions for property values
          const propertyValues = variant.ProductVariantPropertyvalues || 
                                variant.ProductVariantPropertyValues || 
                                variant.product_variant_property_values ||
                                variant.productVariantPropertyvalues ||
                                [];
          
          propertyValues.forEach((pv: any) => {
            // Try multiple naming conventions for property name
            const propertyName = (pv.Property?.name || 
                                 pv.Property?.Name || 
                                 pv.properties?.name ||
                                 pv.properties?.Name ||
                                 pv.propertyid || 
                                 '').toLowerCase();
            // Try multiple naming conventions for property value
            const propertyValue = pv.value || pv.Value || '';
            
            if (propertyName && propertyValue) {
              if (!optionsMap[propertyName]) {
                optionsMap[propertyName] = new Set();
              }
              optionsMap[propertyName].add(propertyValue);
            }
          });
        });
        
        setAvailableOptions(optionsMap);
        
        // Select first variant by default and set initial options
        if (visibleVariants.length > 0) {
          const primaryVariant = visibleVariants.find((v: any) => v.IsPrimaryImage) || visibleVariants[0];
          setSelectedVariant(primaryVariant);
          
          const initialOptions: Record<string, string> = {};
          const primaryPropertyValues = primaryVariant.ProductVariantPropertyvalues || 
                                       primaryVariant.ProductVariantPropertyValues || 
                                       primaryVariant.product_variant_property_values ||
                                       primaryVariant.productVariantPropertyvalues ||
                                       [];
          primaryPropertyValues.forEach((pv: any) => {
            const propertyName = (pv.Property?.name || 
                                 pv.Property?.Name || 
                                 pv.properties?.name ||
                                 pv.properties?.Name ||
                                 pv.propertyid || 
                                 '').toLowerCase();
            const propertyValue = pv.value || pv.Value || '';
            
            if (propertyName && propertyValue) {
              initialOptions[propertyName] = propertyValue;
            }
          });
          setSelectedOptions(initialOptions);
        }
      } else {
        // No variants, clear everything
        setAvailableOptions({});
        setSelectedOptions({});
        setSelectedVariant(null);
        setVariants([]);
      }
      
      setQuantity(1);
      setErrors({});
    }
  }, [isOpen, product]);

  const handleOptionChange = (propertyName: string, value: string) => {
    const newOptions = { ...selectedOptions, [propertyName]: value };
    setSelectedOptions(newOptions);

    // Find matching variant based on all selected options
    const productVariants = product.variants || product.Variants || [];
    const visibleVariants = productVariants.filter((v: any) => v.isvisible !== false);
    
    const matchingVariant = visibleVariants.find((variant: any) => {
      const propertyValues = variant.ProductVariantPropertyvalues || 
                            variant.ProductVariantPropertyValues || 
                            variant.product_variant_property_values ||
                            variant.productVariantPropertyvalues ||
                            [];
      if (propertyValues.length === 0) return false;

      const variantOptions: Record<string, string> = {};
      propertyValues.forEach((pv: any) => {
        const propName = (pv.Property?.name || 
                         pv.Property?.Name || 
                         pv.properties?.name ||
                         pv.properties?.Name ||
                         pv.propertyid || 
                         '').toLowerCase();
        const propValue = pv.value || pv.Value || '';
        
        if (propName && propValue) {
          variantOptions[propName] = propValue;
        }
      });

      // Check if all selected options match this variant
      return Object.keys(newOptions).every(
        (key) => variantOptions[key] === newOptions[key]
      );
    });

    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const maxQuantity = selectedVariant?.quantity || product.quantity || 0;
    const newQuantity = Math.max(1, Math.min(maxQuantity, quantity + delta));
    setQuantity(newQuantity);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate that all available properties are selected
    Object.keys(availableOptions).forEach((propertyName) => {
      if (!selectedOptions[propertyName]) {
        if (propertyName === 'size') {
          newErrors[propertyName] = t.pleaseSelectSize;
        } else {
          const propertyLabel = propertyName === 'colour' || propertyName === 'color' ? t.color :
                               propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
          newErrors[propertyName] = language === 'bg' 
            ? `Моля, изберете ${propertyLabel.toLowerCase()}`
            : `Please select ${propertyLabel.toLowerCase()}`;
        }
      }
    });

    const maxQuantity = selectedVariant?.quantity || product.quantity || 0;
    if (quantity > maxQuantity) {
      newErrors.quantity = t.notEnoughStock;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddToCart = () => {
    if (!validateForm()) return;

    // Use selected variant if available, otherwise use product
    const itemId = selectedVariant?.productvariantid || selectedVariant?.ProductVariantID || product.id;
    const originalItemPrice = selectedVariant?.price ?? product.price ?? 0;
    const itemPrice = getVariantEffectivePrice(
      selectedVariant || { price: originalItemPrice },
      product
    ).sale;
    const itemImageUrl = selectedVariant?.imageurl || selectedVariant?.ImageURL || product.images[0] || '/placeholder-image.jpg';
    
    // Extract property values from selected variant or use selected options
    let variantPropertyValues: Record<string, string> = {};
    if (selectedVariant) {
      const variantProps = selectedVariant.ProductVariantPropertyvalues || selectedVariant.ProductVariantPropertyValues || [];
        variantProps.forEach((pv: any) => {
        const propName = (pv.Property?.name || pv.Property?.Name || pv.propertyid || '').toLowerCase();
          const propValue = pv.value || pv.Value || '';
          if (propName && propValue) {
            variantPropertyValues[propName] = propValue;
          }
        });
    } else {
      variantPropertyValues = selectedOptions;
    }

    // Merge base product properties with variant properties (variant takes precedence)
    const mergedPropertyValues = {
      ...product.propertyValues,
      ...variantPropertyValues,
    };

    // Convert any arrays to comma-separated strings for cart compatibility
    const cartCompatiblePropertyValues: Record<string, string> = {};
    Object.entries(mergedPropertyValues).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        cartCompatiblePropertyValues[key] = value.join(', ');
      } else {
        cartCompatiblePropertyValues[key] = value;
      }
    });

    // Get size from selected options (for backward compatibility)
    const selectedSize = selectedOptions['size'] || selectedOptions['размер'] || '';

    // Add item to cart
    addItem({
      id: itemId,
      name: `${product.brand} ${product.model}`,
      brand: product.brand,
      model: product.model,
      type: product.type,
      color: selectedOptions['colour'] || selectedOptions['color'] || product.color,
      size: selectedSize,
      price: itemPrice,
      quantity: quantity,
      imageUrl: itemImageUrl,
      category: product.category,
      propertyValues: Object.keys(cartCompatiblePropertyValues).length > 0 ? cartCompatiblePropertyValues : undefined,
    });

    // Open cart drawer
    openCart();

    // Close modal
    onClose();
  };

  const handleClose = () => {
    setSelectedOptions({});
    setQuantity(1);
    setErrors({});
    setSelectedVariant(null);
    onClose();
  };

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tracksStock =
    selectedVariant == null ||
    (selectedVariant.trackquantity !== false && selectedVariant.trackquantity !== null);
  const currentQuantity = tracksStock
    ? Math.max(0, Number(selectedVariant?.quantity ?? product.quantity ?? 0) || 0)
    : Number(selectedVariant?.quantity ?? product.quantity ?? 0) || 0;
  const isOutOfStock = tracksStock && currentQuantity <= 0;
  const isLowStock = tracksStock && currentQuantity > 0 && currentQuantity <= LOW_STOCK_MAX;

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal - Centered in the middle of the screen */}
      <div 
        className="absolute inset-0 flex items-center justify-center p-4" 
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
          style={{ backgroundColor: theme.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between p-5 sm:p-6 border-b"
            style={{ borderColor: theme.colors.border }}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                <Image
                  src={selectedVariant?.imageurl || selectedVariant?.ImageURL || product.images[0] || '/placeholder-image.jpg'}
                  alt={product.model}
                  fill
                  quality={90}
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h2
                  className="text-base sm:text-lg font-semibold leading-snug line-clamp-2"
                  style={{ color: theme.colors.text }}
                >
                  {product.brand} {product.model}
                </h2>
                <p className="text-sm truncate" style={{ color: theme.colors.textSecondary }}>
                  {product.type} • {product.color}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full transition-opacity hover:opacity-70 shrink-0 ml-2"
              style={{ color: theme.colors.text }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Property Selection - Dynamic for all properties */}
            {Object.keys(availableOptions).length > 0 && (
              <>
                {Object.entries(availableOptions).map(([propertyName, values]) => {
                  const propertyLabel = propertyName === 'size' ? t.size : 
                                       propertyName === 'colour' || propertyName === 'color' ? t.color :
                                       propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
                  const isSelected = selectedOptions[propertyName];
                  
                  return (
                    <div key={propertyName}>
                <label className="block text-sm font-medium mb-3" style={{ color: theme.colors.text }}>
                        {propertyLabel} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                        {Array.from(values).map((value) => {
                          const optionQty = getOptionStockQuantity(
                            variants,
                            selectedOptions,
                            propertyName,
                            value as string
                          );
                          const optionStatus = getOptionStockStatus(optionQty);
                          const isOut = optionStatus === 'out_of_stock';
                          const isLow = optionStatus === 'low_stock';

                          return (
                    <button
                            key={value}
                            type="button"
                            onClick={() => handleOptionChange(propertyName, value as string)}
                            className="py-2.5 px-2 border rounded-xl text-xs font-medium transition flex flex-col items-center"
                            style={{
                              borderColor:
                                selectedOptions[propertyName] === value
                                  ? theme.colors.primary
                                  : isOut
                                    ? '#fecaca'
                                    : isLow
                                      ? '#fcd34d'
                                      : theme.colors.border,
                              backgroundColor:
                                selectedOptions[propertyName] === value
                                  ? theme.colors.secondary
                                  : 'transparent',
                              color:
                                selectedOptions[propertyName] === value
                                  ? theme.colors.text
                                  : isOut
                                    ? '#dc2626'
                                    : isLow
                                      ? '#b45309'
                                      : theme.colors.text,
                            }}
                          >
                            <span>{value}</span>
                            {optionStatus !== 'untracked' && (
                              <span className="text-[10px] mt-0.5 font-normal">
                                {isOut
                                  ? t.outOfStockForOption
                                  : isLow
                                    ? t.lowStockForOption.replace('{n}', String(optionQty))
                                    : `${optionQty}`}
                              </span>
                            )}
                    </button>
                          );
                        })}
                </div>
                      {errors[propertyName] && (
                        <p className="text-red-500 text-sm mt-1">{errors[propertyName]}</p>
                )}
              </div>
                  );
                })}
              </>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: theme.colors.text }}>
                {t.quantity}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  className="p-2 rounded-xl transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ color: theme.colors.text, backgroundColor: theme.colors.secondary }}
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={currentQuantity}
                  className="w-20 text-center border rounded-xl px-3 py-2 focus:outline-none"
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  className="p-2 rounded-xl transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ color: theme.colors.text, backgroundColor: theme.colors.secondary }}
                  disabled={quantity >= currentQuantity}
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: theme.colors.textSecondary }}>
                {t.availableItems}: {currentQuantity} {t.pcs}
                {isLowStock && (
                  <span className="text-amber-600 font-medium ml-1">({t.lowStock})</span>
                )}
                {isOutOfStock && (
                  <span className="text-red-600 font-medium ml-1">({t.outOfStock})</span>
                )}
              </p>
              {errors.quantity && (
                <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Price Preview */}
            <div className="rounded-xl p-4" style={{ backgroundColor: theme.colors.secondary }}>
              {(() => {
                const pricing = getVariantEffectivePrice(
                  selectedVariant || { price: product.price },
                  product
                );
                const originalUnit = pricing.original;
                const unit = pricing.sale;
                const promo = pricing.promoActive;
                return (
                  <div className="flex justify-between items-center gap-3">
                    <span style={{ color: theme.colors.textSecondary }}>
                      {quantity} ×{' '}
                      {promo ? (
                        <>
                          <span className="line-through mr-1">£{originalUnit.toFixed(2)}</span>
                          <span style={{ color: '#b91c1c' }}>£{unit.toFixed(2)}</span>
                        </>
                      ) : (
                        <>£{unit.toFixed(2)}</>
                      )}
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{ color: promo ? '#b91c1c' : theme.colors.text }}
                    >
                      £{(unit * quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          <div
            className="flex gap-3 p-5 sm:p-6 border-t"
            style={{ borderColor: theme.colors.border }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-opacity hover:opacity-80"
              style={{
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              }}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-1 px-4 py-3 rounded-xl transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              style={{
                backgroundColor: theme.colors.primary,
                color: '#ffffff',
              }}
            >
              <ShoppingCart size={16} />
              <span>{t.addToCart}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddToCartModal;
