'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, Upload, Save, Package, Settings, List, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useProductTypes } from '@/context/ProductTypeContext';
import { useProperties } from '@/context/PropertiesContext';
import { translations } from '@/lib/translations';
import { ProductWithDetails, ProductVariantWithDetails, Property, PropertyValue, ProductImage } from '@/lib/types/product-types';

interface EditProductVariantsModalProps {
  product: ProductWithDetails | null;
  onClose: () => void;
  onSave: (productData: any) => void;
}

interface VariantFormData {
  productvariantid?: string;
  sku?: string;
  price?: number;
  quantity: number;
  trackquantity: boolean;
  isvisible: boolean;
  propertyvalues: Record<string, string>;
  images?: string[];
}

export default function EditProductVariantsModal({ product, onClose, onSave }: EditProductVariantsModalProps) {
  const isNewProduct = !product;
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { productTypes } = useProductTypes();
  const { properties } = useProperties();
  const t = translations[language];

  // Form state
  const [productForm, setProductForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    producttypeid: product?.producttypeid || ''
  });

  const [variants, setVariants] = useState<VariantFormData[]>(
    product?.variants?.map(v => {
      // Handle images - can be string[] or ProductImage[]
      let variantImages: string[] = [];
      if (v.images) {
        if (Array.isArray(v.images)) {
          // Check if it's ProductImage[] or string[]
          if (v.images.length > 0 && typeof v.images[0] === 'object') {
            // It's ProductImage[] - extract imageurl
            variantImages = (v.images as any[]).map(img => img.imageurl || img.ImageURL || img.url).filter(Boolean);
          } else {
            // It's string[]
            variantImages = v.images as string[];
          }
        }
      } else if (v.imageurl) {
        variantImages = [v.imageurl];
      }

      return {
        productvariantid: v.productvariantid,
        sku: v.sku || '',
        price: v.price || 0,
        quantity: v.quantity,
        trackquantity: v.trackquantity,
        isvisible: v.isvisible,
        propertyvalues: v.propertyvalues?.reduce((acc, pv) => {
          if (pv.property) {
            acc[pv.property.propertyid] = pv.value;
          }
          return acc;
        }, {} as Record<string, string>) || {},
        images: variantImages
      };
    }) || []
  );

  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [propertyValues, setPropertyValues] = useState<Record<string, PropertyValue[]>>({});
  const [selectedPropertyValues, setSelectedPropertyValues] = useState<Record<string, string[]>>({});
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormData>({
    quantity: 0,
    trackquantity: true,
    isvisible: true,
    propertyvalues: {},
    images: []
  });

  // Get available properties for selected product type
  useEffect(() => {
    if (productForm.producttypeid) {
      const productType = productTypes.find(pt => pt.producttypeid === productForm.producttypeid);
      if (productType) {
        // Fetch properties for this product type
        fetch(`/api/product-types/${productForm.producttypeid}/properties`)
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              // Extract properties from nested structure and extract values
              const properties = (result.properties || [])
                .map((ptp: any) => ptp.properties)
                .filter((p: any) => p !== null && p !== undefined);
              
              setAvailableProperties(properties);

              // Extract property values from the nested structure
              const values: Record<string, PropertyValue[]> = {};
              for (const property of properties) {
                if (property.datatype === 'select' && property.values) {
                  values[property.propertyid] = property.values;
                }
              }
              setPropertyValues(values);

              const existingVariants = product?.variants || [];

              if (existingVariants.length > 0 && Object.keys(values).length > 0) {
                const selected: Record<string, string[]> = {};

                for (const property of properties) {
                  if (property.datatype === 'select' && values[property.propertyid]) {
                    const usedValues = new Set<string>();

                    for (const variant of existingVariants) {
                      const variantPropertyValues = variant.propertyvalues?.reduce((acc: Record<string, string>, pv: any) => {
                        if (pv.property) {
                          acc[pv.property.propertyid] = pv.value;
                        }
                        return acc;
                      }, {} as Record<string, string>) || {};

                      const variantValue = variantPropertyValues[property.propertyid];

                      if (variantValue) {
                        const matchingValue = values[property.propertyid].find(
                          pv => pv.value === variantValue && pv.isactive
                        );
                        if (matchingValue) {
                          usedValues.add(matchingValue.propertyvalueid);
                        }
                      }
                    }

                    if (usedValues.size > 0) {
                      selected[property.propertyid] = Array.from(usedValues);
                    }
                  }
                }

                if (Object.keys(selected).length > 0) {
                  setSelectedPropertyValues(selected);
                }
              }
            }
          })
          .catch(() => {});
      }
    } else {
      setAvailableProperties([]);
      setPropertyValues({});
    }
  }, [productForm.producttypeid, productTypes]);

  // Auto-populate selectedPropertyValues from existing variants when property values are loaded
  useEffect(() => {
    if (product && variants.length > 0 && Object.keys(propertyValues).length > 0 && availableProperties.length > 0) {
      const selected: Record<string, string[]> = {};

      for (const property of availableProperties) {
        if (property.datatype === 'select' && propertyValues[property.propertyid]) {
          const usedValues = new Set<string>();

          for (const variant of variants) {
            const variantValue = variant.propertyvalues[property.propertyid];

            if (variantValue) {
              const matchingValue = propertyValues[property.propertyid].find(
                pv => pv.value === variantValue && pv.isactive
              );
              if (matchingValue) {
                usedValues.add(matchingValue.propertyvalueid);
              }
            }
          }

          if (usedValues.size > 0) {
            selected[property.propertyid] = Array.from(usedValues);
          }
        }
      }

      if (Object.keys(selected).length > 0) {
        setSelectedPropertyValues(prev => {
          const merged = { ...prev };
          Object.keys(selected).forEach(propId => {
            if (!prev[propId] || prev[propId].length === 0) {
              merged[propId] = selected[propId];
            }
          });
          return merged;
        });
      }
    }
  }, [product, variants, propertyValues, availableProperties]);

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      ...productForm,
      SelectedPropertyValues: selectedPropertyValues,
      Variants: variants.map(v => ({
        ...v,
        // Convert property values to the expected format
        propertyvalues: Object.entries(v.propertyvalues).map(([propertyId, value]) => ({
          propertyid: propertyId,
          value: value
        }))
      }))
    };

    onSave(productData);
  };

  const addVariant = () => {
    setVariantForm({
      quantity: 0,
      trackquantity: true,
      isvisible: true,
      propertyvalues: {},
      images: []
    });
    setEditingVariantIndex(null);
    setShowVariantModal(true);
  };

  const editVariant = (index: number) => {
    setVariantForm(variants[index]);
    setEditingVariantIndex(index);
    setShowVariantModal(true);
  };

  const saveVariant = () => {
    if (editingVariantIndex !== null) {
      // Update existing variant
      const updatedVariants = [...variants];
      updatedVariants[editingVariantIndex] = { ...variantForm };
      setVariants(updatedVariants);
    } else {
      // Add new variant
      setVariants([...variants, { ...variantForm }]);
    }
    setShowVariantModal(false);
  };

  const deleteVariant = (index: number) => {
    const updatedVariants = variants.filter((_, i) => i !== index);
    setVariants(updatedVariants);
  };

  const togglePropertyValueSelection = (propertyId: string, valueId: string) => {
    setSelectedPropertyValues(prev => {
      const current = prev[propertyId] || [];
      const isSelected = current.includes(valueId);

      if (isSelected) {
        return {
          ...prev,
          [propertyId]: current.filter(id => id !== valueId)
        };
      } else {
        return {
          ...prev,
          [propertyId]: [...current, valueId]
        };
      }
    });
  };

  const isPropertyValueSelected = (propertyId: string, valueId: string) => {
    return (selectedPropertyValues[propertyId] || []).includes(valueId);
  };

  const generateVariantCombinations = () => {
    // This would generate all possible combinations of properties
    // For now, we'll keep it simple and let users add variants manually
    alert('Auto-generate variants feature will be added soon'
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl"
        style={{
          backgroundColor: theme.colors.surface,
          color: theme.colors.text
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <h2 className="text-2xl font-bold">
            {isNewProduct
              ? ('Add Product')
              : ('Edit Product')
            }
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleProductSubmit} className="flex flex-col h-[calc(90vh-80px)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Product Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package size={20} />
                {'Basic Information'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {'Product Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {'Category'} *
                  </label>
                  <select
                    required
                    value={productForm.producttypeid}
                    onChange={(e) => setProductForm(prev => ({ ...prev, producttypeid: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text
                    }}
                  >
                    <option value="">
                      {'Select Type'}
                    </option>
                    {productTypes
                      .filter(type => {
                        // Only show leaf categories (categories with no children)
                        return type.isLeaf !== false && (!type.children || type.children.length === 0);
                      })
                      .map(type => {
                        // Build category path
                        const getCategoryPath = (categoryId: string): string[] => {
                          const path: string[] = [];
                          let current: typeof type | undefined = productTypes.find(pt => pt.producttypeid === categoryId);
                          
                          while (current) {
                            path.unshift(current.name);
                            if (current.parent_producttypeid) {
                              current = productTypes.find(pt => pt.producttypeid === current!.parent_producttypeid);
                            } else {
                              break;
                            }
                          }
                          
                          return path;
                        };
                        
                        const path = getCategoryPath(type.producttypeid);
                        const displayName = path.length > 1 ? path.join(' > ') : type.name;
                        
                        return (
                          <option key={type.producttypeid} value={type.producttypeid}>
                            {displayName}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text
                    }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    {'Description'}
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Variants Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings size={20} />
                  {'Product Variants'}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={generateVariantCombinations}
                    className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    style={{
                      borderColor: theme.colors.border,
                      color: theme.colors.text
                    }}
                  >
                    {'Generate Variants'}
                  </button>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    {'Add Variant'}
                  </button>
                </div>
              </div>

              {/* Variants List */}
              {variants.length === 0 ? (
                <div
                  className="text-center py-8 border-2 border-dashed rounded-lg"
                  style={{ borderColor: theme.colors.border }}
                >
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    {'No variants yet'}
                  </p>
                  <p className="text-sm opacity-75 mt-2">
                    {'Add variants to manage different characteristic combinations'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ borderBottomColor: theme.colors.border }} className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-sm" style={{ color: theme.colors.text }}>
                          {'Variant'}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-sm" style={{ color: theme.colors.text }}>
                          SKU
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-sm" style={{ color: theme.colors.text, width: '80px' }}>
                          {'Price'}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-sm" style={{ color: theme.colors.text, width: '90px' }}>
                          {'Quantity'}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-sm" style={{ color: theme.colors.text }}>
                          {'Image'}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-sm" style={{ color: theme.colors.text, width: '60px' }}>
                          {'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant, index) => {
                        // Build variant description from property values
                        const variantDesc: string[] = [];
                        Object.entries(variant.propertyvalues).forEach(([propId, value]) => {
                          const property = availableProperties.find(p => p.propertyid === propId);
                          if (property && value) {
                            variantDesc.push(`${property.name}: ${value}`);
                          }
                        });
                        const variantDescription = variantDesc.join(', ') || `${'Variant'} ${index + 1}`;
                        
                        const variantImage = variant.images && variant.images.length > 0 ? variant.images[0] : null;
                        
                        return (
                          <tr 
                            key={index}
                            className="border-b"
                            style={{ 
                              borderBottomColor: theme.colors.border,
                              backgroundColor: theme.colors.background
                            }}
                          >
                            <td className="py-3 px-3 text-sm" style={{ color: theme.colors.text }}>
                              {variantDescription}
                            </td>
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={variant.sku || ''}
                                onChange={(e) => {
                                  const updatedVariants = [...variants];
                                  updatedVariants[index].sku = e.target.value;
                                  setVariants(updatedVariants);
                                }}
                                className="w-full px-2 py-1.5 text-sm border rounded min-w-0"
                                style={{
                                  backgroundColor: theme.colors.surface,
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text
                                }}
                                placeholder={'SKU'}
                              />
                            </td>
                            <td className="py-3 px-3" style={{ width: '80px' }}>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.price || ''}
                                onChange={(e) => {
                                  const updatedVariants = [...variants];
                                  updatedVariants[index].price = e.target.value ? parseFloat(e.target.value) : undefined;
                                  setVariants(updatedVariants);
                                }}
                                className="w-full px-2 py-1.5 text-sm border rounded"
                                style={{
                                  backgroundColor: theme.colors.surface,
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text
                                }}
                              />
                            </td>
                            <td className="py-3 px-3" style={{ width: '90px' }}>
                              <input
                                type="number"
                                min="0"
                                value={variant.quantity}
                                onChange={(e) => {
                                  const updatedVariants = [...variants];
                                  updatedVariants[index].quantity = parseInt(e.target.value) || 0;
                                  setVariants(updatedVariants);
                                }}
                                className="w-full px-2 py-1.5 text-sm border rounded"
                                style={{
                                  backgroundColor: theme.colors.surface,
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text
                                }}
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                {variantImage && (
                                  <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 border" style={{ borderColor: theme.colors.border }}>
                                    <img
                                      src={variantImage}
                                      alt="Variant"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => editVariant(index)}
                                  className="p-1.5 rounded border hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  style={{
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text
                                  }}
                                  title={'Add/Edit images'}
                                >
                                  <ImageIcon size={16} />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3" style={{ width: '60px' }}>
                              <button
                                type="button"
                                onClick={() => deleteVariant(index)}
                                className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                                title={'Delete'}
                              >
                                <Trash2 size={20} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 p-6 border-t"
            style={{ borderColor: theme.colors.border }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
            >
              {'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              {'Save'}
            </button>
          </div>

          {/* Property Values Selection */}
          {availableProperties.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <List size={20} />
                {'Available Property Values'}
              </h3>
              <p className="text-sm opacity-75">
                {'Select which property values are available for this product'
                }
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableProperties
                  .filter(prop => prop.datatype === 'select')
                  .map(property => {
                    const availableValues = propertyValues[property.propertyid] || [];

                    return (
                      <div key={property.propertyid} className="space-y-3">
                        <h4 className="font-medium">{property.name}</h4>

                        {availableValues.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">
                            {'No values available'}
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-3"
                               style={{ borderColor: theme.colors.border }}>
                            {availableValues.map(value => {
                              const isSelected = isPropertyValueSelected(property.propertyid, value.propertyvalueid);

                              return (
                                <label key={value.propertyvalueid} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePropertyValueSelection(property.propertyid, value.propertyvalueid)}
                                    className="rounded"
                                  />
                                  <span className="text-sm">{value.value}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        <div className="text-xs opacity-75">
                          {'Selected:'} {(selectedPropertyValues[property.propertyid] || []).length} / {availableValues.length}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {availableProperties.filter(prop => prop.datatype === 'select').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {'No select properties for this product type'
                  }
                </div>
              )}

              {/* DEBUG INFO */}
              <div className="mt-6 p-4 border-2 border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <h4 className="font-bold text-sm mb-2">🔍 DEBUG INFO</h4>
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <strong>Raw Product Data:</strong>
                    <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded overflow-auto max-h-40">
                      {JSON.stringify({
                        productid: product?.productid,
                        name: product?.name,
                        producttypeid: product?.producttypeid,
                        variantsCount: product?.variants?.length || 0
                      }, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <strong>Product Variants (Raw):</strong>
                    <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded overflow-auto max-h-40">
                      {JSON.stringify(product?.variants || [], null, 2)}
                    </pre>
                  </div>
                  <div>
                    <strong>Available Property Values (by Property ID):</strong>
                    <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded overflow-auto max-h-40">
                      {JSON.stringify(
                        Object.entries(propertyValues).reduce((acc, [propId, values]) => {
                          acc[propId] = values.map(v => ({
                            propertyvalueid: v.propertyvalueid,
                            value: v.value,
                            isactive: v.isactive
                          }));
                          return acc;
                        }, {} as Record<string, any>),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                  <div>
                    <strong>Selected Property Values (IDs):</strong>
                    <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded overflow-auto max-h-40">
                      {JSON.stringify(selectedPropertyValues, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <strong>Variants State (propertyvalues):</strong>
                    <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded overflow-auto max-h-40">
                      {JSON.stringify(
                        variants.map(v => ({
                          sku: v.sku,
                          propertyvalues: v.propertyvalues
                        })),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

        </form>

        {/* Variant Modal */}
        {showVariantModal && (
          <VariantModal
            variant={variantForm}
            onChange={setVariantForm}
            onSave={saveVariant}
            onClose={() => setShowVariantModal(false)}
            availableProperties={availableProperties}
            propertyValues={propertyValues}
            selectedPropertyValues={selectedPropertyValues}
          />
        )}
      </div>
    </div>
  );
}

// Variant Modal Component
interface VariantModalProps {
  variant: VariantFormData;
  onChange: (variant: VariantFormData) => void;
  onSave: () => void;
  onClose: () => void;
  availableProperties: Property[];
}

function VariantModal({
  variant,
  onChange,
  onSave,
  onClose,
  availableProperties,
  propertyValues,
  selectedPropertyValues
}: VariantModalProps & {
  propertyValues: Record<string, PropertyValue[]>;
  selectedPropertyValues: Record<string, string[]>;
}) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const updateVariant = (field: keyof VariantFormData, value: any) => {
    onChange({ ...variant, [field]: value });
  };

  const updatePropertyValue = (propertyId: string, value: string) => {
    onChange({
      ...variant,
      propertyvalues: {
        ...variant.propertyvalues,
        [propertyId]: value
      }
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image (JPG, PNG, etc.)');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempPreviewUrl = URL.createObjectURL(file);
    
    // Add temporary preview to images
    updateVariant('images', [...(variant.images || []), tempPreviewUrl]);
    setUploadingImages(prev => [...prev, tempId]);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', 'images');

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: uploadFormData
      });

      const result = await response.json();

      if (response.ok && result.success && result.url) {
        // Remove temporary preview and add real URL
        const currentImages = variant.images || [];
        const newImages = currentImages
          .filter(img => img !== tempPreviewUrl)
          .concat(result.url);
        
        updateVariant('images', newImages);
        URL.revokeObjectURL(tempPreviewUrl);
      } else {
        // Remove temporary preview on error
        const currentImages = variant.images || [];
        updateVariant('images', currentImages.filter(img => img !== tempPreviewUrl));
        URL.revokeObjectURL(tempPreviewUrl);
        alert(`Upload error: ${result.error || 'Upload failed'}`);
      }
    } catch {
      const currentImages = variant.images || [];
      updateVariant('images', currentImages.filter(img => img !== tempPreviewUrl));
      URL.revokeObjectURL(tempPreviewUrl);
      alert('Error uploading image');
    } finally {
      setUploadingImages(prev => prev.filter(id => id !== tempId));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        handleImageUpload(file);
      });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        handleImageUpload(file);
      });
    }
  };

  const removeImage = (index: number) => {
    const currentImages = variant.images || [];
    updateVariant('images', currentImages.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl"
        style={{
          backgroundColor: theme.colors.surface,
          color: theme.colors.text
        }}
      >
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <h3 className="text-xl font-bold">
            {'Edit Variant'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="w-full">
              <label className="block text-sm font-medium mb-1">SKU</label>
              <input
                type="text"
                value={variant.sku || ''}
                onChange={(e) => updateVariant('sku', e.target.value)}
                className="w-full px-3 py-2 border rounded-md min-w-0 flex-1"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  width: '100%'
                }}
                placeholder={'e.g. PROD-001'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Quantity'} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={variant.quantity}
                  onChange={(e) => updateVariant('quantity', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-md min-w-0"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Price'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={variant.price || ''}
                  onChange={(e) => updateVariant('price', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border rounded-md min-w-0"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                />
              </div>
            </div>

          </div>

          {/* Properties */}
          {availableProperties.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">
                {'Variant Properties'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableProperties.map(property => {
                  const availableValues = propertyValues[property.propertyid] || [];

                  return (
                    <div key={property.propertyid}>
                      <label className="block text-sm font-medium mb-1">
                        {property.name}
                      </label>

                      {property.datatype === 'select' ? (
                        <select
                          value={variant.propertyvalues[property.propertyid] || ''}
                          onChange={(e) => updatePropertyValue(property.propertyid, e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                          style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            color: theme.colors.text
                          }}
                        >
                          <option value="">
                            {'Select...'}
                          </option>
                          {availableValues
                            .filter(value => {
                              const selectedIds = selectedPropertyValues[property.propertyid] || [];
                              return selectedIds.includes(value.propertyvalueid);
                            })
                            .map(value => (
                              <option key={value.propertyvalueid} value={value.value}>
                                {value.value}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <input
                          type={property.datatype === 'number' ? 'number' : 'text'}
                          value={variant.propertyvalues[property.propertyid] || ''}
                          onChange={(e) => updatePropertyValue(property.propertyid, e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                          style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            color: theme.colors.text
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant Images */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">
              {'Variant Images'}
            </h4>
            <p className="text-sm opacity-75">
              {'Add specific images for this variant. These will be shown when the user selects this SKU.'}
            </p>
            
            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-4 transition-all duration-300 ${
                dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              style={{
                borderColor: dragActive ? theme.colors.primary : theme.colors.border,
                backgroundColor: dragActive ? 'transparent' : theme.colors.cardBg
              }}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <ImageIcon 
                  size={32}
                  className="mb-2"
                  style={{ color: theme.colors.textSecondary }}
                />
                <p 
                  className="text-sm mb-3 transition-colors duration-300 px-2"
                  style={{ color: theme.colors.text }}
                >
                  {'Drag images here or click to select'}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center gap-2 touch-manipulation"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: '#fff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <Upload size={16} />
                  <span>{'Select Images'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
                <p 
                  className="text-xs mt-2 transition-colors duration-300"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {'JPG, PNG, GIF up to 10MB'}
                </p>
              </div>
            </div>

            {/* Image Preview Grid */}
            {variant.images && variant.images.length > 0 && (
              <div className="space-y-2">
                <p 
                  className="text-xs transition-colors duration-300"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {'Uploaded images: ${variant.images.length}'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                  {variant.images.map((image, index) => {
                    const isUploading = uploadingImages.length > 0 && index === variant.images!.length - 1;
                    return (
                      <div
                        key={`${image}-${index}`}
                        className="relative group aspect-square rounded-lg overflow-hidden border transition-colors duration-300 min-w-0 flex-shrink-0"
                        style={{ borderColor: theme.colors.border }}
                      >
                        {isUploading ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                            <Loader2 size={20} className="animate-spin" style={{ color: theme.colors.primary }} />
                          </div>
                        ) : (
                          <>
                            <img
                              src={image}
                              alt={`Variant image ${index + 1}`}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'w-full h-full flex flex-col items-center justify-center bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs p-2 text-center';
                                errorDiv.innerHTML = `
                                  <div>${'Load error'}</div>
                                  <div class="text-[10px] mt-1 break-all">${image.substring(0, 30)}...</div>
                                `;
                                target.parentElement?.appendChild(errorDiv);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 p-2 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity duration-300 touch-manipulation z-10"
                              aria-label={'Remove image'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trackQuantity"
                checked={variant.trackquantity}
                onChange={(e) => updateVariant('trackquantity', e.target.checked)}
              />
              <label htmlFor="trackQuantity" className="text-sm">
                {'Track quantity'}
              </label>
            </div>

            <div className="flex items-center gap-2">
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVisible"
                checked={variant.isvisible}
                onChange={(e) => updateVariant('isvisible', e.target.checked)}
              />
              <label htmlFor="isVisible" className="text-sm">
                {'Visible'}
              </label>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-3 p-6 border-t"
          style={{ borderColor: theme.colors.border }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
            {'Cancel'}
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {'Save Variant'}
          </button>
        </div>
      </div>
    </div>
  );
}
