'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, ChevronDown, Upload, Eye, EyeOff, PackageX, PackageCheck } from 'lucide-react';
import { ProductType, Property } from '@/lib/types/product-types';
import AdminLayout from '../components/AdminLayout';
import AdminModal from '../components/AdminModal';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { translations } from '@/lib/translations';
import { AdminPage, Section, SectionSurface, EmptyState, DataTableShell, TableHeader, TableHeaderRow, TableHeaderCell, TableBody, TableRow, TableCell } from '../components/layout';
import { Package } from 'lucide-react';
import CompleteAnimation from '@/components/CompleteAnimation';
import { adminAuthHeaders } from '@/lib/admin-auth-headers';
import { MAX_PRODUCT_IMAGES } from '@/lib/product-images';

// Select All Checkbox Component for Variant Characteristics
function VariantSelectAllCheckbox({
  property,
  selectedValues,
  onToggle,
  language
}: {
  property: Property;
  selectedValues: string[];
  onToggle: (allSelected: boolean) => void;
  language: string;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const activeValues = property.values?.filter(v => v.isactive).map(v => v.value) || [];
  const allSelected = activeValues.length > 0 && activeValues.every(v => selectedValues.includes(v));
  const someSelected = selectedValues.length > 0 && selectedValues.length < activeValues.length;

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <label className="flex items-center gap-2 cursor-pointer py-1">
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={allSelected}
        onChange={() => onToggle(allSelected)}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
      />
      <span className="text-xs sm:text-sm text-gray-700">
        {'Select all'}
      </span>
    </label>
  );
}

interface Product {
  productid: string;
  name: string;
  sku?: string;
  description?: string;
  producttypeid: string;
  /** Hidden from storefront (out of stock / temporarily unavailable). */
  isdisabled?: boolean;
  /** Shown greyed out on shop as awaiting restock. */
  awaitingrestock?: boolean;
  /** Percentage discount for PROMOTION label. */
  promodiscountpercent?: number | null;
  ProductType?: ProductType;
  propertyvalues?: Record<string, string>;
}

interface Variant {
  productvariantid?: string;
  sku?: string;
  price: number;
  quantity: number;
  trackquantity: boolean;
  isvisible: boolean;
  propertyvalues: Array<{
    propertyid: string;
    value: string;
  }>;
  imageurl?: string;
  IsPrimaryImage?: boolean;
}

export default function ProductsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const t = translations[language || 'en'];
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    document.title = t.products || ('Items');
  }, [language, t]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    rfproducttypeid: 1, // Default to 1 (For Him)
    producttypeid: '',
    isfeatured: false,
    isdisabled: false,
    awaitingrestock: false,
    hasPromo: false,
    promodiscountpercent: '' as string,
    propertyvalues: {} as Record<string, string>
  });
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [selectedPropertyValues, setSelectedPropertyValues] = useState<Record<string, string[]>>({});
  const [originalPropertyValues, setOriginalPropertyValues] = useState<Record<string, string[]>>({});
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantDisplayValues, setVariantDisplayValues] = useState<Record<string, { price?: string; quantity?: string }>>({});
  const [rfProductTypes, setRfProductTypes] = useState<Array<{rfproducttypeid: number, name: string}>>([]);
  const [filteredProductTypes, setFilteredProductTypes] = useState<ProductType[]>([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Array<{name: string, path: string, url: string}>>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'product' | null>(null);
  const [showVariantImageModal, setShowVariantImageModal] = useState(false);
  const [variantImageTargetIndex, setVariantImageTargetIndex] = useState<number | null>(null);
  const [showApplyImageToAllModal, setShowApplyImageToAllModal] = useState(false);
  const [applyImageUrl, setApplyImageUrl] = useState<string | null>(null);
  const [newPropertyValues, setNewPropertyValues] = useState<Record<string, string>>({});
  const [addingPropertyValue, setAddingPropertyValue] = useState<Record<string, boolean>>({});
  const [productImages, setProductImages] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkVisibilityModal, setBulkVisibilityModal] = useState<'hide' | 'show' | null>(null);
  const [bulkUpdatingVisibility, setBulkUpdatingVisibility] = useState(false);
  const [showBulkVisibilityCompleteAnimation, setShowBulkVisibilityCompleteAnimation] = useState(false);
  const [bulkRestockModal, setBulkRestockModal] = useState<'mark' | 'clear' | null>(null);
  const [bulkUpdatingRestock, setBulkUpdatingRestock] = useState(false);
  const [showBulkRestockCompleteAnimation, setShowBulkRestockCompleteAnimation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<number, { price?: boolean; quantity?: boolean }>>({});
  const [showCompleteAnimation, setShowCompleteAnimation] = useState(false);
  const [showDeleteCompleteAnimation, setShowDeleteCompleteAnimation] = useState(false);
  const [showBulkDeleteCompleteAnimation, setShowBulkDeleteCompleteAnimation] = useState(false);

  // Filter state
  const [selectedProductTypeFilter, setSelectedProductTypeFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter products by type
  const filteredProducts = selectedProductTypeFilter === 'all' 
    ? products 
    : products.filter(product => product.producttypeid === selectedProductTypeFilter);

  // Pagination calculations (using filtered products)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);
  const currentProductIds = currentProducts.map((product) => product.productid);
  const allSelectedOnPage =
    currentProductIds.length > 0 &&
    currentProductIds.every((id) => selectedProductIds.includes(id));

  // Reset to first page when products or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [products.length, selectedProductTypeFilter]);

  useEffect(() => {
    setSelectedProductIds((prev) =>
      prev.filter((id) => products.some((product) => product.productid === id))
    );
  }, [products]);

  useEffect(() => {
    loadProducts();
    loadProductTypes();
    loadProperties();
    loadRfProductTypes();
  }, []);

  // Load RF Product Types (main categories)
  const loadRfProductTypes = async () => {
    try {
      const response = await fetch('/api/rf-product-types');
      const result = await response.json();
      if (result.success) {
        setRfProductTypes(result.rfProductTypes);
      }
    } catch (error) {
    }
  };

  // Load media files from storage (from all folders: images, logos, hero-images)
  const loadMediaFiles = async () => {
    try {
      setLoadingMedia(true);
      const response = await fetch('/api/storage/list?folders=images,logos,hero-images&limit=200');
      const result = await response.json();
      if (result.success) {
        setMediaFiles(result.files || []);
      }
    } catch (error) {
    } finally {
      setLoadingMedia(false);
    }
  };

  // Open media modal for product images
  const openMediaModalForProduct = () => {
    setMediaTarget('product');
    setShowMediaModal(true);
    loadMediaFiles();
  };

  const openVariantImagePicker = (variantIndex: number) => {
    setVariantImageTargetIndex(variantIndex);
    setShowVariantImageModal(true);
  };

  const addProductImages = (urls: string[]) => {
    setProductImages((prev) => {
      if (prev.length >= MAX_PRODUCT_IMAGES) {
        alert(
          language === 'bg'
            ? `You can add a maximum of ${MAX_PRODUCT_IMAGES} images.`
            : `You can add at most ${MAX_PRODUCT_IMAGES} images.`
        );
        return prev;
      }

      const next = [...prev];
      for (const url of urls) {
        if (!url || next.includes(url)) continue;
        if (next.length >= MAX_PRODUCT_IMAGES) {
          alert(
            language === 'bg'
              ? `Only the first ${MAX_PRODUCT_IMAGES} images were added.`
              : `Only the first ${MAX_PRODUCT_IMAGES} images were added.`
          );
          break;
        }
        next.push(url);
      }
      return next;
    });
  };

  const removeProductImage = (url: string) => {
    setProductImages((prev) => prev.filter((img) => img !== url));
    setVariants((prev) =>
      prev.map((variant) =>
        variant.imageurl === url ? { ...variant, imageurl: undefined } : variant
      )
    );
  };

  // Select image from media library
  const selectImageFromMedia = (imageUrl: string) => {
    if (!imageUrl) return;

    if (mediaTarget === 'product') {
      addProductImages([imageUrl]);
    }

    setShowMediaModal(false);
    setMediaTarget(null);
  };

  const handleSelectVariantImage = (imageUrl: string) => {
    if (variantImageTargetIndex === null) return;
    updateVariant(variantImageTargetIndex, 'imageurl', imageUrl || undefined);

    if (variantImageTargetIndex === 0 && variants.length > 1) {
      setApplyImageUrl(imageUrl);
      setShowApplyImageToAllModal(true);
    }

    setShowVariantImageModal(false);
    setVariantImageTargetIndex(null);
  };

  // Filter product types based on selected main category
  useEffect(() => {
    if (formData.rfproducttypeid) {
      const filtered = productTypes.filter(pt => 
        pt.rfproducttypeid === formData.rfproducttypeid || !pt.rfproducttypeid
      );
      setFilteredProductTypes(filtered);
      // Reset product type if current selection is not in filtered list
      if (formData.producttypeid && !filtered.find(pt => pt.producttypeid === formData.producttypeid)) {
        setFormData({ ...formData, producttypeid: '' });
        setProductTypeProperties([]);
        setSelectedPropertyValues({});
        setVariants([]);
        setVariantDisplayValues({});
      }
    } else {
      setFilteredProductTypes(productTypes);
    }
  }, [formData.rfproducttypeid, productTypes]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const authHeaders = await adminAuthHeaders();
      const response = await fetch('/api/products?includeDisabled=true', {
        headers: authHeaders,
      });
      const result = await response.json();
      if (result.success) {
        // Map API response to Product interface
        const mappedProducts = result.products.map((p: any) => ({
          productid: p.productid,
          name: p.name,
          sku: p.sku || '',
          description: p.description || '',
          producttypeid: p.producttypeid || '',
          isdisabled: p.isdisabled === true,
          awaitingrestock: p.awaitingrestock === true,
          promodiscountpercent:
            p.promodiscountpercent != null && Number(p.promodiscountpercent) > 0
              ? Number(p.promodiscountpercent)
              : null,
          ProductType: p.producttype,
          propertyvalues: p.propertyvalues || {}
        }));

        setProducts(mappedProducts);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadProductTypes = async () => {
    try {
      const response = await fetch('/api/product-types');
      const result = await response.json();
      if (result.success) {
        setProductTypes(result.productTypes);
      }
    } catch (error) {
    }
  };

  const loadProperties = async () => {
    try {
      const response = await fetch('/api/properties');
      const result = await response.json();
      if (result.success) {
        setAvailableProperties(result.properties);
      }
    } catch (error) {
    }
  };

  const loadPropertiesForProductType = async (productTypeId: string) => {
    try {
      const response = await fetch(`/api/product-types/${productTypeId}/properties`);
      const result = await response.json();
      if (result.success && result.properties) {
        const properties = result.properties.map((p: any) => p.properties).filter(Boolean);
        
        // Load values for each property
        const propertiesWithValues = await Promise.all(
          properties.map(async (prop: Property) => {
            try {
              const valuesResponse = await fetch(`/api/properties/${prop.propertyid}/values`);
              const valuesResult = await valuesResponse.json();
              if (valuesResult.success) {
                return {
                  ...prop,
                  values: valuesResult.values || []
                };
              }
            } catch (error) {
            }
            return {
              ...prop,
              values: prop.values || []
            };
          })
        );
        
        return propertiesWithValues;
      }
    } catch (error) {
    }
    return [];
  };

  const handleAddPropertyValue = async (propertyId: string) => {
    const newValue = newPropertyValues[propertyId]?.trim();
    if (!newValue) {
      alert('Please enter a value');
      return;
    }

    // Check if value already exists
    const property = productTypeProperties.find(p => p.propertyid === propertyId);
    if (property?.values?.some(v => v.value.toLowerCase() === newValue.toLowerCase())) {
      alert('This value already exists');
      return;
    }

    setAddingPropertyValue(prev => ({ ...prev, [propertyId]: true }));

    try {
      // Get the next display order
      const maxDisplayOrder = property?.values?.reduce((max, v) => Math.max(max, v.displayorder || 0), 0) || 0;
      
      const response = await fetch(`/api/properties/${propertyId}/values`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: newValue,
          displayorder: maxDisplayOrder + 1
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload properties for the product type to get the new value
        if (formData.producttypeid) {
          const updatedProps = await loadPropertiesForProductType(formData.producttypeid);
          setProductTypeProperties(updatedProps);
        }
        
        // Automatically select the newly added value
        const currentValues = selectedPropertyValues[propertyId] || [];
        setSelectedPropertyValues({
          ...selectedPropertyValues,
          [propertyId]: [...currentValues, newValue]
        });
        
        // Clear the input
        setNewPropertyValues(prev => ({ ...prev, [propertyId]: '' }));
      } else {
        alert('Error adding value: ' + result.error);
      }
    } catch (error) {
      alert('Failed to add property value');
    } finally {
      setAddingPropertyValue(prev => ({ ...prev, [propertyId]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (variants.length === 0) {
      alert('Please generate at least one variant');
      return;
    }

    // Validate that all variants have valid price and quantity
    const errors: Record<number, { price?: boolean; quantity?: boolean }> = {};
    let hasErrors = false;

    variants.forEach((variant, index) => {
      const variantErrors: { price?: boolean; quantity?: boolean } = {};
      let variantHasErrors = false;

      // Check if price is missing, zero, or invalid
      if (!variant.price || variant.price <= 0 || isNaN(variant.price)) {
        variantErrors.price = true;
        variantHasErrors = true;
      }

      // Check if quantity is missing, zero, or invalid
      if (!variant.quantity || variant.quantity <= 0 || isNaN(variant.quantity)) {
        variantErrors.quantity = true;
        variantHasErrors = true;
      }

      if (variantHasErrors) {
        errors[index] = variantErrors;
        hasErrors = true;
      }
    });

    if (formData.hasPromo) {
      const promoValue = parseFloat(formData.promodiscountpercent);
      if (!Number.isFinite(promoValue) || promoValue <= 0 || promoValue > 99) {
        alert(
          'Enter a valid discount between 1 and 99%.'
        );
        return;
      }
    }

    if (hasErrors) {
      setValidationErrors(errors);
      // Scroll to bottom of form to show error message
      setTimeout(() => {
        const errorMessage = document.querySelector('[data-validation-error]');
        if (errorMessage) {
          errorMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);
      return;
    }

    // Clear validation errors if validation passes
    setValidationErrors({});

    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.productid}`
        : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const payload = {
        name: formData.name,
        sku: formData.sku || null,
        description: formData.description || null,
        rfproducttypeid: formData.rfproducttypeid,
        producttypeid: formData.producttypeid,
        isfeatured: formData.isfeatured || false,
        isdisabled: formData.isdisabled === true,
        awaitingrestock: formData.awaitingrestock === true,
        promodiscountpercent: formData.hasPromo
          ? (parseFloat(formData.promodiscountpercent) || null)
          : null,
        Variants: variants,
        productImages: productImages.slice(0, MAX_PRODUCT_IMAGES),
      };


      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.success) {
        // Show complete animation
        setShowCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(() => {
          setShowModal(false);
          setShowCompleteAnimation(false);
          setFormData({ name: '', sku: '', description: '', rfproducttypeid: 1, producttypeid: '', isfeatured: false, isdisabled: false, awaitingrestock: false, hasPromo: false, promodiscountpercent: '', propertyvalues: {} });
          setEditingProduct(null);
          setVariants([]);
          setVariantDisplayValues({});
          setOriginalPropertyValues({});
          setSelectedPropertyValues({});
          setNewPropertyValues({});
          setProductImages([]);
          setValidationErrors({});
          loadProducts();
        }, 1200);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Failed to save product');
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setValidationErrors({});
    
    // Fetch full product details including variants
    try {
      const authHeaders = await adminAuthHeaders();
      const response = await fetch(`/api/products/${product.productid}`, {
        headers: authHeaders,
      });
      const result = await response.json();
      
      if (result.success && result.product) {
        const fullProduct = result.product;
        
        const promoPercent =
          fullProduct.promodiscountpercent != null && Number(fullProduct.promodiscountpercent) > 0
            ? Number(fullProduct.promodiscountpercent)
            : null;
        setFormData({
          name: fullProduct.name,
          sku: fullProduct.sku || '',
          description: fullProduct.description || '',
          rfproducttypeid: fullProduct.rfproducttypeid || 1,
          producttypeid: fullProduct.producttypeid,
          isfeatured: fullProduct.isfeatured || false,
          isdisabled: fullProduct.isdisabled === true,
          awaitingrestock: fullProduct.awaitingrestock === true,
          hasPromo: promoPercent != null,
          promodiscountpercent: promoPercent != null ? String(promoPercent) : '',
          propertyvalues: {}
        });

        const productImageUrls = Array.isArray(fullProduct.Images)
          ? fullProduct.Images.map((img: any) => img.imageurl).filter(Boolean)
          : Array.isArray(fullProduct.images)
            ? fullProduct.images.filter(Boolean)
            : [];
        setProductImages(Array.from(new Set(productImageUrls)));

        // Load properties for this product type
        if (fullProduct.producttypeid) {
          const props = await loadPropertiesForProductType(fullProduct.producttypeid);
          setProductTypeProperties(props);
          
          // Load existing variants if they exist
          if (fullProduct.Variants && fullProduct.Variants.length > 0) {
            const loadedVariants: Variant[] = fullProduct.Variants.map((v: any) => ({
              productvariantid: v.productvariantid,
              sku: v.sku,
              price: v.price || 0,
              quantity: v.quantity || 0,
              trackquantity: v.trackquantity ?? true,
              isvisible: v.isvisible ?? true,
              imageurl: v.imageurl, // Load variant image
              IsPrimaryImage: v.IsPrimaryImage || false, // Load primary flag
              propertyvalues: (v.product_variant_property_values || []).map((pv: any) => ({
                propertyid: pv.propertyid,
                value: pv.value
              }))
            }));
            
            setVariants(loadedVariants);
            
            // Set selected property values from existing variants
            // Only select values that actually exist in variants
            const selected: Record<string, string[]> = {};
            if (loadedVariants.length > 0) {
              loadedVariants.forEach(variant => {
                variant.propertyvalues.forEach(pv => {
                  if (!selected[pv.propertyid]) {
                    selected[pv.propertyid] = [];
                  }
                  if (!selected[pv.propertyid].includes(pv.value)) {
                    selected[pv.propertyid].push(pv.value);
                  }
                });
              });
            }
            // If no variants, start with empty selection
            setSelectedPropertyValues(selected);
            // Store original property values for comparison
            setOriginalPropertyValues(JSON.parse(JSON.stringify(selected)));
          } else {
            // No variants, reset original values
            setOriginalPropertyValues({});
          }
        } else {
          setProductTypeProperties([]);
          setOriginalPropertyValues({});
        }
      }
    } catch (error) {
      alert('Failed to load product details');
      return;
    }
    
    setShowModal(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/products/${productToDelete.productid}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        // Show complete animation
        setShowDeleteCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(() => {
          setShowDeleteModal(false);
          setShowDeleteCompleteAnimation(false);
          setProductToDelete(null);
          loadProducts();
        }, 1200);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAllProductsOnPage = () => {
    setSelectedProductIds((prev) => {
      if (allSelectedOnPage) {
        return prev.filter((id) => !currentProductIds.includes(id));
      }
      const next = new Set(prev);
      currentProductIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleBulkVisibilityConfirm = async () => {
    if (!bulkVisibilityModal || selectedProductIds.length === 0) return;

    const hideFromShop = bulkVisibilityModal === 'hide';

    try {
      setBulkUpdatingVisibility(true);
      const authHeaders = await adminAuthHeaders();
      const response = await fetch('/api/admin/products/bulk-visibility', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          productIds: selectedProductIds,
          isdisabled: hideFromShop,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(
          language === 'bg'
            ? `Error: ${result.error || 'Update failed'}`
            : `Error: ${result.error || 'Update failed'}`
        );
        return;
      }

      setShowBulkVisibilityCompleteAnimation(true);
      setTimeout(() => {
        setSelectedProductIds([]);
        setBulkVisibilityModal(null);
        setShowBulkVisibilityCompleteAnimation(false);
        loadProducts();
      }, 1200);
    } catch (error) {
      alert(
        'Failed to update visibility'
      );
    } finally {
      setBulkUpdatingVisibility(false);
    }
  };

  const handleBulkRestockConfirm = async () => {
    if (!bulkRestockModal || selectedProductIds.length === 0) return;

    const awaitingrestock = bulkRestockModal === 'mark';

    try {
      setBulkUpdatingRestock(true);
      const authHeaders = await adminAuthHeaders();
      const response = await fetch('/api/admin/products/bulk-awaiting-restock', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          productIds: selectedProductIds,
          awaitingrestock,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(
          language === 'bg'
            ? `Error: ${result.error || 'Update failed'}`
            : `Error: ${result.error || 'Update failed'}`
        );
        return;
      }

      setShowBulkRestockCompleteAnimation(true);
      setTimeout(() => {
        setSelectedProductIds([]);
        setBulkRestockModal(null);
        setShowBulkRestockCompleteAnimation(false);
        loadProducts();
      }, 1200);
    } catch (error) {
      alert(
        'Failed to update out-of-stock display status'
      );
    } finally {
      setBulkUpdatingRestock(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedProductIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const results = await Promise.all(
        selectedProductIds.map(async (id) => {
          const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
          const result = await response.json();
          return { id, ok: response.ok && result.success, error: result.error };
        })
      );

      const failed = results.filter((item) => !item.ok);
      if (failed.length > 0) {
        alert(
          language === 'bg'
            ? `Failed to delete ${failed.length} product(s).`
            : `Failed to delete ${failed.length} products.`
        );
        setSelectedProductIds(failed.map((item) => item.id));
      } else {
        // Show complete animation
        setShowBulkDeleteCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(() => {
          setSelectedProductIds([]);
          setShowBulkDeleteModal(false);
          setShowBulkDeleteCompleteAnimation(false);
          loadProducts();
        }, 1200);
      }

      if (failed.length === 0) {
        // Don't reload if there were failures
        return;
      }
    } catch (error) {
      alert('Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const [productTypeProperties, setProductTypeProperties] = useState<Property[]>([]);

  const handleProductTypeChange = async (productTypeId: string) => {
    setFormData(prev => ({ ...prev, producttypeid: productTypeId }));

    // Load properties for selected product type
    if (productTypeId) {
      const props = await loadPropertiesForProductType(productTypeId);
      setProductTypeProperties(props);
      const newPropertyValues: Record<string, string> = {};
      props.forEach((prop: Property) => {
        newPropertyValues[prop.propertyid] = formData.propertyvalues[prop.propertyid] || '';
      });
      setFormData(prev => ({ ...prev, propertyvalues: newPropertyValues }));
      // Reset selected property values for variant generation
      setSelectedPropertyValues({});
      setVariants([]);
      setNewPropertyValues({});
    } else {
      setProductTypeProperties([]);
      setFormData(prev => ({ ...prev, propertyvalues: {} }));
      setSelectedPropertyValues({});
      setVariants([]);
      setNewPropertyValues({});
    }
  };

  // Generate variants from selected property values
  const generateVariants = () => {
    const propertyIds = Object.keys(selectedPropertyValues);
    if (propertyIds.length === 0) {
      alert(t.selectAtLeastOnePropertyValue);
      return;
    }

    // Get cartesian product of all selected values
    const cartesianProduct = (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restProduct = cartesianProduct(rest);
      return first.flatMap(item => restProduct.map(items => [item, ...items]));
    };

    const valueArrays = propertyIds.map(propId => selectedPropertyValues[propId]);
    const combinations = cartesianProduct(valueArrays);

    const newVariants: Variant[] = combinations.map(combination => {
      const propertyValues = propertyIds.map((propId, index) => ({
        propertyid: propId,
        value: combination[index]
      }));

      // Generate SKU from combination - include product ID for uniqueness
      // For new products, use a timestamp-based unique identifier
      const productId = editingProduct?.productid || `NEW_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const variantSKU = `${formData.sku || 'PROD'}-${productId}-${combination.map(v => v.toUpperCase()).join('-')}`;

      // Check if this variant already exists (same property values)
      const existingVariant = variants.find(v => {
        if (v.propertyvalues.length !== propertyValues.length) return false;
        return propertyValues.every(pv =>
          v.propertyvalues.some(epv =>
            epv.propertyid === pv.propertyid && epv.value === pv.value
          )
        );
      });

      // If variant exists, preserve its data; otherwise use defaults
      if (existingVariant) {
        return {
          ...existingVariant,
          sku: existingVariant.sku || variantSKU, // Keep existing SKU if present
        };
      } else {
        return {
          sku: variantSKU,
          price: 0,
          quantity: 0,
          trackquantity: true,
          isvisible: true,
          propertyvalues: propertyValues
        };
      }
    });

    setVariants(newVariants);
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants];
    (newVariants[index] as any)[field] = value;
    setVariants(newVariants);
  };

  // Helper function to validate numeric input (only numbers and dot)
  const handleNumericInput = (value: string, isDecimal: boolean = false) => {
    // Allow empty string
    if (value === '') return '';
    
    // For decimal (price), allow numbers and one dot
    if (isDecimal) {
      // Filter to only allow digits and dots
      let filtered = value.replace(/[^0-9.]/g, '');
      // Ensure only one dot
      const parts = filtered.split('.');
      if (parts.length > 2) {
        filtered = parts[0] + '.' + parts.slice(1).join('');
      }
      return filtered;
    } else {
      // For integer (quantity), only allow digits
      return value.replace(/[^0-9]/g, '');
    }
  };

  // Helper function to format value for display (empty string if 0)
  const formatNumericValue = (value: number, variantIndex: number, field: 'price' | 'quantity'): string => {
    const key = `variant_${variantIndex}`;
    const displayValue = variantDisplayValues[key]?.[field];
    
    // If there's a stored display value (for incomplete inputs like "."), use it
    if (displayValue !== undefined) {
      return displayValue;
    }
    
    // Otherwise, format the numeric value
    return value === 0 ? '' : value.toString();
  };

  const deleteVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    if (!file) return null;

    // Supported image formats
    const supportedFormats = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/heic',
      'image/heif',
      'image/svg+xml',
      'image/bmp',
      'image/tiff'
    ];

    // Validate file type - check MIME type or file extension
    const isValidType = supportedFormats.includes(file.type.toLowerCase()) || 
                       file.type.startsWith('image/') ||
                       /\.(jpg|jpeg|png|gif|webp|avif|heic|heif|svg|bmp|tiff?)$/i.test(file.name);

    if (!isValidType) {
      alert('Please upload a valid image file (JPG, PNG, GIF, WebP, AVIF, HEIC, etc.)');
      return null;
    }

    // Validate file size (max 10MB to accommodate high-quality images)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && result.url) {
        return result.url as string;
      }
      alert('Failed to upload image: ' + (result.error || 'Unknown error'));
      return null;
    } catch (error) {
      alert('Failed to upload image');
      return null;
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    const url = await uploadImageFile(file);
    if (!url) return;

    addProductImages([url]);
    updateVariant(index, 'imageurl', url);

    // If this is the first variant and we have multiple variants, ask to apply to all
    if (index === 0 && variants.length > 1) {
      setApplyImageUrl(url);
      setShowApplyImageToAllModal(true);
    }
  };

  const handleProductImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const uploads = await Promise.all(Array.from(files).map(handleFile => uploadImageFile(handleFile)));
    const urls = uploads.filter((url): url is string => Boolean(url));
    if (urls.length > 0) {
      addProductImages(urls);
    }
  };

  const handlePrimaryImageChange = (index: number) => {
    const isCurrentlyPrimary = variants[index]?.IsPrimaryImage;
    const updatedVariants = variants.map((v, i) => ({
      ...v,
      IsPrimaryImage: isCurrentlyPrimary ? false : i === index
    }));
    setVariants(updatedVariants);
  };

  const applyImageToAllVariants = (imageUrl: string) => {
    const updatedVariants = variants.map((variant) => ({
      ...variant,
      imageurl: imageUrl
    }));
    setVariants(updatedVariants);
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      rfproducttypeid: 1,
      producttypeid: '',
      isfeatured: false,
      isdisabled: false,
      awaitingrestock: false,
      hasPromo: false,
      promodiscountpercent: '',
      propertyvalues: {},
    });
    setProductTypeProperties([]);
    setSelectedPropertyValues({});
    setVariants([]);
    setVariantDisplayValues({});
    setProductImages([]);
    setValidationErrors({});
    setShowModal(true);
  };

  const selectedCount = selectedProductIds.length;

  const headerActionButton = (
    opts: {
      label: string;
      onClick: () => void;
      variant: 'outline-orange' | 'outline-green' | 'solid-slate' | 'solid-teal' | 'solid-red' | 'solid-violet';
      badge?: number;
      title?: string;
      disabled?: boolean;
      showPlus?: boolean;
    }
  ) => {
    const variantClasses = {
      'outline-orange': {
        button: 'border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50',
        badge: 'bg-orange-500 text-white',
      },
      'outline-green': {
        button: 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50',
        badge: 'bg-emerald-600 text-white',
      },
      'solid-slate': {
        button: 'border border-slate-700 bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50',
        badge: 'bg-slate-900 text-white',
      },
      'solid-teal': {
        button: 'border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50',
        badge: 'bg-teal-800 text-white',
      },
      'solid-red': {
        button: 'border border-red-500 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50',
        badge: 'bg-red-700 text-white',
      },
      'solid-violet': {
        button: 'border border-violet-600 bg-violet-600 text-white hover:bg-violet-700',
        badge: '',
      },
    }[opts.variant];

    return (
      <button
        type="button"
        onClick={opts.onClick}
        title={opts.title || opts.label}
        disabled={opts.disabled}
        className={`inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors touch-manipulation disabled:cursor-not-allowed ${variantClasses.button}`}
      >
        {opts.showPlus && <Plus className="h-4 w-4 shrink-0" />}
        <span className="whitespace-nowrap">{opts.label}</span>
        {opts.badge != null && opts.badge > 0 && (
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${variantClasses.badge}`}
          >
            {opts.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <AdminLayout currentPath="/admin/products">
      <AdminPage>
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-x-8">
          {/* Left: titles */}
          <div className="min-w-0">
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: theme.colors.text }}
            >
              {'Items'}
            </h1>
            <h2
              className="mt-2 text-base sm:text-lg font-semibold"
              style={{ color: theme.colors.text }}
            >
              {'Items list'}
            </h2>
            <p className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
              {'Manage items and their variants'}
            </p>
          </div>

          {/* Right: action pills + filter */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              {headerActionButton({
                label: 'Hide selected',
                variant: 'outline-orange',
                onClick: () => setBulkVisibilityModal('hide'),
                badge: selectedCount > 0 ? selectedCount : undefined,
                disabled: selectedCount === 0,
                title: selectedCount > 0 ? undefined : ('Select items first'),
              })}
              {headerActionButton({
                label: 'Show selected',
                variant: 'outline-green',
                onClick: () => setBulkVisibilityModal('show'),
                badge: selectedCount > 0 ? selectedCount : undefined,
                disabled: selectedCount === 0,
                title: selectedCount > 0 ? undefined : ('Select items first'),
              })}
              {headerActionButton({
                label: 'Out of stock',
                variant: 'solid-slate',
                onClick: () => setBulkRestockModal('mark'),
                badge: selectedCount > 0 ? selectedCount : undefined,
                disabled: selectedCount === 0,
                title: selectedCount > 0 ? undefined : ('Select items first'),
              })}
              {headerActionButton({
                label: 'Clear out of stock',
                variant: 'solid-teal',
                onClick: () => setBulkRestockModal('clear'),
                badge: selectedCount > 0 ? selectedCount : undefined,
                disabled: selectedCount === 0,
                title: selectedCount > 0 ? undefined : ('Select items first'),
              })}
              {headerActionButton({
                label: 'Delete selected',
                variant: 'solid-red',
                onClick: () => setShowBulkDeleteModal(true),
                badge: selectedCount > 0 ? selectedCount : undefined,
                disabled: selectedCount === 0,
                title: selectedCount > 0 ? undefined : ('Select items first'),
              })}
              {headerActionButton({
                label: t.addProduct || 'Add item',
                variant: 'solid-violet',
                onClick: openAddProductModal,
                showPlus: true,
              })}
            </div>

            {products.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <label
                  className="text-sm font-medium whitespace-nowrap"
                  style={{ color: theme.colors.text }}
                >
                  {'Filter by type:'}
                </label>
                <select
                  value={selectedProductTypeFilter}
                  onChange={(e) => setSelectedProductTypeFilter(e.target.value)}
                  className="min-w-[200px] rounded-md border px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  style={{
                    backgroundColor: theme.colors.cardBg,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  <option value="all">
                    {'All types'}
                  </option>
                  {productTypes.map((type) => (
                    <option key={type.producttypeid} value={type.producttypeid}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {selectedProductTypeFilter !== 'all' && (
                  <span className="text-sm" style={{ color: theme.colors.textSecondary }}>
                    ({filteredProducts.length} {'items'})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm sm:text-base text-gray-500">{t.loading || 'Loading...'}</p>
          </div>
        ) : (
          <>
          <Section>
            {filteredProducts.length === 0 ? (
              <EmptyState
                title={selectedProductTypeFilter === 'all' ? 'No Items' : 'No items of this type'}
                description={selectedProductTypeFilter === 'all' ? 'Create your first product to start selling.' : 'No items match the selected filter.'}
                action={
                  <button
                    onClick={openAddProductModal}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {(t.addProduct || 'Add item')}
                  </button>
                }
                icon={Package}
              />
            ) : (
              <SectionSurface tone="soft" padding="md">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-hidden">
                  <DataTableShell columnStorageKey="admin-products-table-columns">
                    <TableHeader>
                      <TableHeaderRow>
                        <TableHeaderCell align="center" defaultWidth={52} columnId="select" resizable={false}>
                          <input
                            type="checkbox"
                            checked={allSelectedOnPage}
                            onChange={toggleSelectAllProductsOnPage}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            aria-label={'Select all'}
                          />
                        </TableHeaderCell>
                        <TableHeaderCell columnId="name" defaultWidth={360} minWidth={160}>
                          {t.name}
                        </TableHeaderCell>
                        <TableHeaderCell columnId="type" defaultWidth={220} minWidth={120}>
                          {t.productType}
                        </TableHeaderCell>
                        <TableHeaderCell align="center" columnId="shop" defaultWidth={150} minWidth={110}>
                          {'Shop'}
                        </TableHeaderCell>
                        <TableHeaderCell align="right" columnId="actions" defaultWidth={128} resizable={false}>
                          {t.actions}
                        </TableHeaderCell>
                      </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                      {currentProducts.map((product) => (
                        <TableRow key={product.productid}>
                          <TableCell align="center" columnId="select" defaultWidth={52}>
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(product.productid)}
                              onChange={() => toggleProductSelection(product.productid)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              aria-label={'Select product'}
                            />
                          </TableCell>
                          <TableCell columnId="name" defaultWidth={360}>
                            <div className="font-medium whitespace-normal break-words leading-snug">
                              {product.name}
                            </div>
                          </TableCell>
                          <TableCell columnId="type" defaultWidth={220}>
                            <div className="whitespace-normal break-words leading-snug">
                              {productTypes.find(pt => pt.producttypeid === product.producttypeid)?.name || '-'}
                            </div>
                          </TableCell>
                          <TableCell align="center" columnId="shop" defaultWidth={150}>
                            <div className="flex flex-col items-center gap-1">
                              {product.isdisabled ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200">
                                  {'Hidden'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100">
                                  {'Live'}
                                </span>
                              )}
                              {product.awaitingrestock && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                  {'OOS'}
                                </span>
                              )}
                              {product.promodiscountpercent != null &&
                                Number(product.promodiscountpercent) > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
                                  SALE −{Number(product.promodiscountpercent)}%
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell align="right" columnId="actions" defaultWidth={128}>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => window.open(`/products/${product.productid}`, '_blank', 'noopener,noreferrer')}
                                className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors touch-manipulation"
                                title={'View'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(product)}
                                className="p-1.5 sm:p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
                                title={t.edit}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(product)}
                                className="p-1.5 sm:p-2 text-danger hover:text-danger-text hover:bg-danger-bg rounded transition-colors touch-manipulation"
                                title={'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTableShell>
                </div>
              </SectionSurface>
            )}
          </Section>

          {/* Mobile/Tablet Card Layout */}
          {filteredProducts.length > 0 && (
            <Section className="md:hidden">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAllProductsOnPage}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  {'Select all on page'}
                </label>
              </div>
              <div className="space-y-3">
              {currentProducts.map((product) => (
                <div key={product.productid} className="bg-white p-3 sm:p-4 rounded-lg shadow border">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.productid)}
                          onChange={() => toggleProductSelection(product.productid)}
                          className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          aria-label={'Select product'}
                        />
                        <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm text-gray-500">
                        <p>
                          <span className="font-medium">{t.productType}:</span> {productTypes.find(pt => pt.producttypeid === product.producttypeid)?.name || '-'}
                        </p>
                        <p>
                          <span className="font-medium">{'Shop'}:</span>{' '}
                          {product.isdisabled ? (
                            <span className="text-amber-800">{'Hidden from customers'}</span>
                          ) : (
                            <span className="text-emerald-800">{'Visible'}</span>
                          )}
                        </p>
                        {product.awaitingrestock && (
                          <p>
                            <span className="font-medium">{'Status:'}</span>{' '}
                            <span className="text-slate-700">
                              {'Out of stock display'}
                            </span>
                          </p>
                        )}
                        {product.promodiscountpercent != null &&
                          Number(product.promodiscountpercent) > 0 && (
                          <p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
                              SALE −{Number(product.promodiscountpercent)}%
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => window.open(`/products/${product.productid}`, '_blank', 'noopener,noreferrer')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 rounded transition-colors touch-manipulation"
                        title={'View'}
                      >
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 active:bg-indigo-100 rounded transition-colors touch-manipulation"
                        title={t.edit}
                      >
                        <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(product)}
                        className="p-2 text-danger hover:text-danger-text hover:bg-danger-bg active:bg-danger-bg/80 rounded transition-colors touch-manipulation"
                        title={'Delete'}
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </Section>
          )}

          {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-3 sm:px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
                {/* Mobile: Simple Prev/Next */}
                <div className="flex-1 flex justify-between sm:hidden w-full">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center justify-center px-4 py-2.5 min-w-[100px] border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  >
                    {t.previous || 'Previous'}
                  </button>
                  <div className="flex items-center px-4">
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center justify-center px-4 py-2.5 min-w-[100px] border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  >
                    {t.next || 'Next'}
                  </button>
                </div>

                {/* Tablet/Desktop: Full Pagination */}
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-700">
                      {t.showingTransactions || 'Showing'} <span className="font-medium">{startIndex + 1}</span> {'to'} <span className="font-medium">{Math.min(endIndex, filteredProducts.length)}</span> {'of'} <span className="font-medium">{filteredProducts.length}</span> {'items'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 sm:px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      >
                        <span className="sr-only">{t.previous || 'Previous'}</span>
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 rotate-90" />
                      </button>
                      <div className="hidden md:flex">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`relative inline-flex items-center px-3 sm:px-4 py-2 border text-sm font-medium transition-colors touch-manipulation ${
                                  currentPage === page
                                    ? 'z-10 bg-primary/10 border-primary text-primary'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 active:bg-gray-100'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="relative inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      <div className="md:hidden flex items-center px-3 border-t border-b border-gray-300 bg-white">
                        <span className="text-sm text-gray-700">
                          <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                        </span>
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 sm:px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      >
                        <span className="sr-only">{t.next || 'Next'}</span>
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 -rotate-90" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </AdminPage>

      <AdminModal
          isOpen={showModal}
          onClose={() => {
            if (!showCompleteAnimation) {
              setShowModal(false);
              // Don't clear the data here - only clear when starting a new product
            }
          }}
          title={editingProduct ? t.editProduct : t.addProduct}
          subheader={editingProduct
            ? ('Edit the product information and its variants')
            : ('Create a new product with variants and properties')
          }
          maxWidth="max-w-4xl"
          minWidth={320}
          minHeight={400}
        >
          <div className="relative">
              <form onSubmit={handleSubmit}>
                <div className={`space-y-4 transition-all duration-300 ${showCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t.productName}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {'Main Category'}
                    </label>
                    <select
                      value={formData.rfproducttypeid}
                      onChange={(e) => {
                        const newRfProductTypeId = parseInt(e.target.value);
                        setFormData({ 
                          ...formData, 
                          rfproducttypeid: newRfProductTypeId,
                          producttypeid: '' // Reset product type when main category changes
                        });
                        setProductTypeProperties([]);
                        setSelectedPropertyValues({});
                        setVariants([]);
        setVariantDisplayValues({});
                      }}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {rfProductTypes.map((rpt) => {
                        // Translate category names
                        const getTranslatedName = (name: string) => {
                          if (language === 'bg') {
                            const nameLower = name.toLowerCase();
                            if (nameLower.includes('him') || nameLower.includes('collar')) return 'Collars';
                            if (nameLower.includes('her') || nameLower.includes('harness')) return 'Harnesses';
                            if (nameLower.includes('accessor')) return 'Accessories';
                          }
                          return name;
                        };
                        return (
                          <option key={rpt.rfproducttypeid} value={rpt.rfproducttypeid}>
                            {getTranslatedName(rpt.name)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {'Product Type'}
                    </label>
                    <select
                      value={formData.producttypeid}
                      onChange={(e) => handleProductTypeChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                      disabled={!formData.rfproducttypeid}
                    >
                      <option value="">{t.selectAProductType || 'Select a product type'}</option>
                      {filteredProductTypes.map((pt) => (
                        <option key={pt.producttypeid} value={pt.producttypeid}>
                          {pt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {'Description'}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {'Product Images'}
                      <span className="ml-2 font-normal text-gray-500">
                        ({productImages.length}/{MAX_PRODUCT_IMAGES})
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      {language === 'bg'
                        ? `Upload up to ${MAX_PRODUCT_IMAGES} images. Add images of the same dimensions for consistent display.`
                        : `Upload up to ${MAX_PRODUCT_IMAGES} images. Customers see exactly how many you upload (1–${MAX_PRODUCT_IMAGES}). Photos are compressed automatically on upload. Use matching sizes for best display.`}
                    </p>
                    {productImages.length === 0 ? (
                      <p className="text-xs text-gray-400 mb-2">
                        {'No images added.'}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {productImages.map((url, index) => (
                          <div key={`${url}-${index}`} className="relative group">
                            <img
                              src={url}
                              alt={'Image'}
                              className="w-16 h-16 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeProductImage(url)}
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
                              title={'Remove image'}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`cursor-pointer ${productImages.length >= MAX_PRODUCT_IMAGES ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input
                          type="file"
                          accept="image/*,.heic,.heif,.avif"
                          multiple
                          disabled={productImages.length >= MAX_PRODUCT_IMAGES}
                          className="hidden"
                          onChange={(e) => {
                            handleProductImageUpload(e.target.files);
                            e.target.value = '';
                          }}
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors">
                          <Upload className="w-4 h-4" />
                          {'Upload images'}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={openMediaModalForProduct}
                        disabled={productImages.length >= MAX_PRODUCT_IMAGES}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ImageIcon className="w-4 h-4" />
                        {'Select from media'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isfeatured || false}
                        onChange={(e) => setFormData({ ...formData, isfeatured: e.target.checked })}
                        className="mt-0.5 w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <div>
                        <span className="text-xs sm:text-sm font-medium text-gray-700 block">
                          {'Featured Product (displayed on home page)'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {'Maximum 4 featured products will be displayed on the home page'}
                        </p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isdisabled === true}
                        onChange={(e) => setFormData({ ...formData, isdisabled: e.target.checked })}
                        className="mt-0.5 w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <div>
                        <span className="text-xs sm:text-sm font-medium text-gray-700 block">
                          {'Hide from online store (out of stock / inactive)'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {'When checked, customers will not see this product in the shop. You can turn it back on anytime.'}
                        </p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={formData.awaitingrestock === true}
                        onChange={(e) => setFormData({ ...formData, awaitingrestock: e.target.checked })}
                        className="mt-0.5 w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <div>
                        <span className="text-xs sm:text-sm font-medium text-gray-700 block">
                          {'Show as “Out of stock” (restock coming soon)'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {'Product stays visible in the shop, but the card is greyed out with “Out of stock / Restock coming soon”. Add to cart is hidden.'}
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 sm:p-4">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hasPromo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hasPromo: e.target.checked,
                            promodiscountpercent: e.target.checked ? formData.promodiscountpercent || '20' : '',
                          })
                        }
                        className="mt-0.5 w-4 h-4 text-rose-600 border-border rounded focus:ring-rose-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-800 block">
                          {'PROMOTION — product discount'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {'Shows a "SALE" badge on the card, struck-through original price, and the new sale price.'}
                        </p>
                      </div>
                    </label>
                    {formData.hasPromo && (
                      <div className="mt-3 ml-6 space-y-2">
                        <label className="block text-xs font-medium text-gray-700">
                          {'Discount (%)'}
                          <div className="mt-1 flex items-center gap-2 max-w-[200px]">
                            <input
                              type="number"
                              min={1}
                              max={99}
                              step={1}
                              value={formData.promodiscountpercent}
                              onChange={(e) =>
                                setFormData({ ...formData, promodiscountpercent: e.target.value })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500"
                              placeholder="20"
                            />
                            <span className="text-sm text-gray-600 shrink-0">%</span>
                          </div>
                        </label>
                        {(() => {
                          const percent = parseFloat(formData.promodiscountpercent);
                          const original =
                            variants.find((v) => v.price > 0)?.price ||
                            variants[0]?.price ||
                            0;
                          if (!Number.isFinite(percent) || percent <= 0 || original <= 0) {
                            return (
                              <p className="text-xs text-gray-500">
                                {'Set a percent and a variant price to preview the sale price.'}
                              </p>
                            );
                          }
                          const sale = Math.round(original * (1 - percent / 100) * 100) / 100;
                          return (
                            <p className="text-xs sm:text-sm text-gray-800">
                              <span className="line-through text-gray-500 mr-2">
                                €{original.toFixed(2)}
                              </span>
                              <span className="font-semibold text-rose-700">
                                €{sale.toFixed(2)}
                              </span>
                              <span className="ml-2 text-rose-600 font-medium">
                                (−{percent}%)
                              </span>
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {formData.producttypeid && productTypeProperties.length > 0 && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        {'Variant Properties'}
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        {'Select multiple values for each characteristic to generate variants'
                        }
                      </p>
                      <div className="space-y-3 max-h-64 sm:max-h-none overflow-y-auto">
                        {productTypeProperties.map((property) => (
                          <div key={property.propertyid} className="border rounded-md p-2 sm:p-3">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-medium text-gray-700">
                                {property.name}
                                {property.description && (
                                  <span className="text-gray-400 ml-1 text-xs">({property.description})</span>
                                )}
                              </label>
                            </div>
                            {property.datatype === 'select' ? (
                              <>
                                {property.values && property.values.length > 0 ? (
                                  <div className="mb-2">
                                    {/* Select All Checkbox */}
                                    <VariantSelectAllCheckbox
                                      property={property}
                                      selectedValues={selectedPropertyValues[property.propertyid] || []}
                                      onToggle={(allSelected) => {
                                        const activeValues = property.values
                                          ?.filter(v => v.isactive)
                                          .map(v => v.value) || [];
                                        
                                        setSelectedPropertyValues({
                                          ...selectedPropertyValues,
                                          [property.propertyid]: allSelected ? [] : activeValues
                                        });
                                      }}
                                      language={language}
                                    />
                                  </div>
                                ) : null}
                                {property.values && property.values.length > 0 ? (
                                  <div className="space-y-1.5 max-h-32 sm:max-h-40 overflow-y-auto">
                                    {property.values
                                      .filter(v => v.isactive)
                                      .sort((a, b) => a.displayorder - b.displayorder)
                                      .map((value) => (
                                        <label key={value.propertyvalueid} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 px-1 rounded">
                                          <input
                                            type="checkbox"
                                            checked={selectedPropertyValues[property.propertyid]?.includes(value.value) || false}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const currentValues = selectedPropertyValues[property.propertyid] || [];
                                              const isChecked = e.target.checked;
                                              
                                              let newValues: string[];
                                              if (isChecked) {
                                                // Add the value if not already present
                                                newValues = currentValues.includes(value.value)
                                                  ? currentValues
                                                  : [...currentValues, value.value];
                                              } else {
                                                // Remove the value - allow empty array
                                                newValues = currentValues.filter(v => v !== value.value);
                                              }
                                              
                                              setSelectedPropertyValues({
                                                ...selectedPropertyValues,
                                                [property.propertyid]: newValues
                                              });
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                            }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                          />
                                          <span className="text-xs sm:text-sm">{value.value}</span>
                                        </label>
                                      ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 mb-2">
                                    {'No values available'}
                                  </p>
                                )}
                                {/* Add new value input */}
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                      type="text"
                                      value={newPropertyValues[property.propertyid] || ''}
                                      onChange={(e) => setNewPropertyValues(prev => ({ ...prev, [property.propertyid]: e.target.value }))}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddPropertyValue(property.propertyid);
                                        }
                                      }}
                                      placeholder={'Add new value...'}
                                      className="flex-1 px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                      disabled={addingPropertyValue[property.propertyid]}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddPropertyValue(property.propertyid)}
                                      disabled={addingPropertyValue[property.propertyid] || !newPropertyValues[property.propertyid]?.trim()}
                                      className="px-3 py-1.5 text-xs sm:text-sm bg-primary text-primary-foreground rounded hover:opacity-90 active:opacity-80 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-opacity touch-manipulation whitespace-nowrap"
                                    >
                                      {addingPropertyValue[property.propertyid] ? (
                                        <>
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          <span>{'Adding...'}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-3 h-3" />
                                          <span>{'Add'}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-gray-400">
                                {t.propertyTypeNotSupportVariants}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {(() => {
                        // Check if property values have changed from original
                        const hasPropertyChanges = editingProduct ? (() => {
                          const currentKeys = Object.keys(selectedPropertyValues).sort();
                          const originalKeys = Object.keys(originalPropertyValues).sort();
                          
                          // Check if keys are different
                          if (currentKeys.length !== originalKeys.length) return true;
                          if (currentKeys.join(',') !== originalKeys.join(',')) return true;
                          
                          // Check if values for each property have changed
                          for (const key of currentKeys) {
                            const current = (selectedPropertyValues[key] || []).sort().join(',');
                            const original = (originalPropertyValues[key] || []).sort().join(',');
                            if (current !== original) return true;
                          }
                          
                          return false;
                        })() : false;
                        
                        // Determine button text
                        let buttonText;
                        if (!editingProduct) {
                          // New product: "Continue"
                          buttonText = t.continue;
                        } else {
                          // Editing product: Always show "Regenerate"
                          buttonText = t.regenerateVariants;
                        }
                        
                        // Disable button if editing and no property changes
                        const isDisabled = Boolean(editingProduct) && !hasPropertyChanges;
                        
                        return (
                          <button
                            type="button"
                            onClick={generateVariants}
                            disabled={isDisabled}
                            className={`mt-3 w-full px-4 py-2 text-sm sm:text-base rounded transition-opacity touch-manipulation ${
                              isDisabled
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : 'bg-success text-success-foreground hover:opacity-90 active:opacity-80'
                            }`}
                          >
                            {buttonText} ({Object.values(selectedPropertyValues).reduce((acc, vals) => acc * (vals.length || 1), 1)} {t.combinations})
                          </button>
                        );
                      })()}
                    </div>
                  )}

                  {variants.length > 0 && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        {t.variant}s ({variants.length})
                      </label>
                      <div className="max-h-96 overflow-y-auto border rounded-md">
                        {/* Desktop Variants Table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t.variant}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t.price}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t.quantity}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t.image}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t.primary}</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t.actions}</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {variants.map((variant, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-xs">
                                    <div className="max-w-xs truncate">
                                      {variant.propertyvalues.map(pv => {
                                        const prop = productTypeProperties.find(p => p.propertyid === pv.propertyid);
                                        return `${prop?.name}: ${pv.value}`;
                                      }).join(', ')}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      data-variant-index={index}
                                      value={formatNumericValue(variant.price, index, 'price')}
                                      onChange={(e) => {
                                        const validated = handleNumericInput(e.target.value, true);
                                        const key = `variant_${index}`;
                                        
                                        // Clear validation error for this field
                                        setValidationErrors(prev => {
                                          const updated = { ...prev };
                                          if (updated[index]?.price) {
                                            delete updated[index].price;
                                            if (Object.keys(updated[index]).length === 0) {
                                              delete updated[index];
                                            }
                                          }
                                          return updated;
                                        });
                                        
                                        // Store the display value
                                        setVariantDisplayValues(prev => ({
                                          ...prev,
                                          [key]: { ...prev[key], price: validated }
                                        }));
                                        
                                        // Only update numeric value if it's a complete number
                                        if (validated !== '' && validated !== '.' && !validated.endsWith('.')) {
                                          const numValue = parseFloat(validated);
                                          if (!isNaN(numValue)) {
                                            updateVariant(index, 'price', numValue);
                                          }
                                        } else if (validated === '') {
                                          updateVariant(index, 'price', 0);
                                          setVariantDisplayValues(prev => {
                                            const updated = { ...prev };
                                            if (updated[key]) {
                                              delete updated[key].price;
                                              if (Object.keys(updated[key]).length === 0) {
                                                delete updated[key];
                                              }
                                            }
                                            return updated;
                                          });
                                        }
                                      }}
                                      onBlur={(e) => {
                                        // Ensure we have a valid number on blur
                                        const value = e.target.value.trim();
                                        const key = `variant_${index}`;
                                        if (value === '' || value === '.') {
                                          updateVariant(index, 'price', 0);
                                          setVariantDisplayValues(prev => {
                                            const updated = { ...prev };
                                            if (updated[key]) {
                                              delete updated[key].price;
                                              if (Object.keys(updated[key]).length === 0) {
                                                delete updated[key];
                                              }
                                            }
                                            return updated;
                                          });
                                        } else {
                                          // Clear display value on blur if we have a valid number
                                          const numValue = parseFloat(value);
                                          if (!isNaN(numValue)) {
                                            setVariantDisplayValues(prev => {
                                              const updated = { ...prev };
                                              if (updated[key]) {
                                                delete updated[key].price;
                                                if (Object.keys(updated[key]).length === 0) {
                                                  delete updated[key];
                                                }
                                              }
                                              return updated;
                                            });
                                          }
                                        }
                                      }}
                                      className={`w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 ${
                                        validationErrors[index]?.price
                                          ? 'border-red-500 focus:ring-red-500'
                                          : 'focus:ring-blue-500'
                                      }`}
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      data-variant-index={index}
                                      value={formatNumericValue(variant.quantity, index, 'quantity')}
                                      onChange={(e) => {
                                        const validated = handleNumericInput(e.target.value, false);
                                        const key = `variant_${index}`;
                                        
                                        // Clear validation error for this field
                                        setValidationErrors(prev => {
                                          const updated = { ...prev };
                                          if (updated[index]?.quantity) {
                                            delete updated[index].quantity;
                                            if (Object.keys(updated[index]).length === 0) {
                                              delete updated[index];
                                            }
                                          }
                                          return updated;
                                        });
                                        
                                        // Store the display value
                                        setVariantDisplayValues(prev => ({
                                          ...prev,
                                          [key]: { ...prev[key], quantity: validated }
                                        }));
                                        
                                        // Update numeric value
                                        const numValue = validated === '' ? 0 : parseInt(validated) || 0;
                                        updateVariant(index, 'quantity', numValue);
                                        
                                        // Clear display value if empty
                                        if (validated === '') {
                                          setVariantDisplayValues(prev => {
                                            const updated = { ...prev };
                                            if (updated[key]) {
                                              delete updated[key].quantity;
                                              if (Object.keys(updated[key]).length === 0) {
                                                delete updated[key];
                                              }
                                            }
                                            return updated;
                                          });
                                        }
                                      }}
                                      onBlur={(e) => {
                                        // Ensure we have a valid number on blur
                                        const value = e.target.value.trim();
                                        const key = `variant_${index}`;
                                        if (value === '') {
                                          updateVariant(index, 'quantity', 0);
                                          setVariantDisplayValues(prev => {
                                            const updated = { ...prev };
                                            if (updated[key]) {
                                              delete updated[key].quantity;
                                              if (Object.keys(updated[key]).length === 0) {
                                                delete updated[key];
                                              }
                                            }
                                            return updated;
                                          });
                                        } else {
                                          // Clear display value on blur
                                          setVariantDisplayValues(prev => {
                                            const updated = { ...prev };
                                            if (updated[key]) {
                                              delete updated[key].quantity;
                                              if (Object.keys(updated[key]).length === 0) {
                                                delete updated[key];
                                              }
                                            }
                                            return updated;
                                          });
                                        }
                                      }}
                                      className={`w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 ${
                                        validationErrors[index]?.quantity
                                          ? 'border-red-500 focus:ring-red-500'
                                          : 'focus:ring-blue-500'
                                      }`}
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    {productImages.length === 0 ? (
                                      <span className="text-xs text-gray-400">
                                        {'Add product images'}
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        {variant.imageurl ? (
                                          <img
                                            src={variant.imageurl}
                                            alt="Variant"
                                            className="w-12 h-12 object-cover rounded border"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 border border-gray-300 rounded flex items-center justify-center bg-gray-50">
                                            <ImageIcon className="w-5 h-5 text-gray-400" />
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => openVariantImagePicker(index)}
                                          className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                        >
                                          {'Choose image'}
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={variant.IsPrimaryImage || false}
                                      onChange={() => handlePrimaryImageChange(index)}
                                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      title={t.setAsPrimaryImage}
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => deleteVariant(index)}
                                      className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors touch-manipulation"
                                      title={'Delete'}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Variants Cards */}
                        <div className="md:hidden divide-y divide-gray-200">
                          {variants.map((variant, index) => (
                            <div key={index} className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-700 mb-1">
                                    {variant.propertyvalues.map(pv => {
                                      const prop = productTypeProperties.find(p => p.propertyid === pv.propertyid);
                                      return `${prop?.name}: ${pv.value}`;
                                    }).join(', ')}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteVariant(index)}
                                  className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded flex-shrink-0 transition-colors touch-manipulation"
                                  title={'Delete'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="block text-gray-500 mb-1">{t.price}</label>
                                  <input
                                    type="text"
                                    data-variant-index={index}
                                    value={formatNumericValue(variant.price, index, 'price')}
                                    onChange={(e) => {
                                      const validated = handleNumericInput(e.target.value, true);
                                      const key = `variant_${index}`;
                                        
                                      // Clear validation error for this field
                                      setValidationErrors(prev => {
                                        const updated = { ...prev };
                                        if (updated[index]?.price) {
                                          delete updated[index].price;
                                          if (Object.keys(updated[index]).length === 0) {
                                            delete updated[index];
                                          }
                                        }
                                        return updated;
                                      });
                                        
                                      // Store the display value
                                      setVariantDisplayValues(prev => ({
                                        ...prev,
                                        [key]: { ...prev[key], price: validated }
                                      }));
                                        
                                      // Only update numeric value if it's a complete number
                                      if (validated !== '' && validated !== '.' && !validated.endsWith('.')) {
                                        const numValue = parseFloat(validated);
                                        if (!isNaN(numValue)) {
                                          updateVariant(index, 'price', numValue);
                                        }
                                      } else if (validated === '') {
                                        updateVariant(index, 'price', 0);
                                        setVariantDisplayValues(prev => {
                                          const updated = { ...prev };
                                          if (updated[key]) {
                                            delete updated[key].price;
                                            if (Object.keys(updated[key]).length === 0) {
                                              delete updated[key];
                                            }
                                          }
                                          return updated;
                                        });
                                      }
                                    }}
                                    onBlur={(e) => {
                                      // Ensure we have a valid number on blur
                                      const value = e.target.value.trim();
                                      const key = `variant_${index}`;
                                      if (value === '' || value === '.') {
                                        updateVariant(index, 'price', 0);
                                        setVariantDisplayValues(prev => {
                                          const updated = { ...prev };
                                          if (updated[key]) {
                                            delete updated[key].price;
                                            if (Object.keys(updated[key]).length === 0) {
                                              delete updated[key];
                                            }
                                          }
                                          return updated;
                                        });
                                      } else {
                                        // Clear display value on blur if we have a valid number
                                        const numValue = parseFloat(value);
                                        if (!isNaN(numValue)) {
                                          setVariantDisplayValues(prev => {
                                            const updated = { ...prev };
                                            if (updated[key]) {
                                              delete updated[key].price;
                                              if (Object.keys(updated[key]).length === 0) {
                                                delete updated[key];
                                              }
                                            }
                                            return updated;
                                          });
                                        }
                                      }
                                    }}
                                    className={`w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-2 text-xs ${
                                      validationErrors[index]?.price
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'focus:ring-blue-500'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-gray-500 mb-1">{t.quantity}</label>
                                  <input
                                    type="text"
                                    data-variant-index={index}
                                    value={formatNumericValue(variant.quantity, index, 'quantity')}
                                    onChange={(e) => {
                                      const validated = handleNumericInput(e.target.value, false);
                                      const key = `variant_${index}`;
                                        
                                      // Clear validation error for this field
                                      setValidationErrors(prev => {
                                        const updated = { ...prev };
                                        if (updated[index]?.quantity) {
                                          delete updated[index].quantity;
                                          if (Object.keys(updated[index]).length === 0) {
                                            delete updated[index];
                                          }
                                        }
                                        return updated;
                                      });
                                        
                                      // Store the display value
                                      setVariantDisplayValues(prev => ({
                                        ...prev,
                                        [key]: { ...prev[key], quantity: validated }
                                      }));
                                        
                                      // Update numeric value
                                      const numValue = validated === '' ? 0 : parseInt(validated) || 0;
                                      updateVariant(index, 'quantity', numValue);
                                        
                                      // Clear display value if empty
                                      if (validated === '') {
                                        setVariantDisplayValues(prev => {
                                          const updated = { ...prev };
                                          if (updated[key]) {
                                            delete updated[key].quantity;
                                            if (Object.keys(updated[key]).length === 0) {
                                              delete updated[key];
                                            }
                                          }
                                          return updated;
                                        });
                                      }
                                    }}
                                    onBlur={(e) => {
                                      // Ensure we have a valid number on blur
                                      const value = e.target.value.trim();
                                      const key = `variant_${index}`;
                                      if (value === '') {
                                        updateVariant(index, 'quantity', 0);
                                        setVariantDisplayValues(prev => {
                                          const updated = { ...prev };
                                          if (updated[key]) {
                                            delete updated[key].quantity;
                                            if (Object.keys(updated[key]).length === 0) {
                                              delete updated[key];
                                            }
                                          }
                                          return updated;
                                        });
                                      } else {
                                        // Clear display value on blur
                                        setVariantDisplayValues(prev => {
                                          const updated = { ...prev };
                                          if (updated[key]) {
                                            delete updated[key].quantity;
                                            if (Object.keys(updated[key]).length === 0) {
                                              delete updated[key];
                                            }
                                          }
                                          return updated;
                                        });
                                      }
                                    }}
                                    className={`w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-2 text-xs ${
                                      validationErrors[index]?.quantity
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'focus:ring-blue-500'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-gray-500 mb-1">{t.primary}</label>
                                  <div className="flex items-center h-[34px]">
                                    <input
                                      type="checkbox"
                                      checked={variant.IsPrimaryImage || false}
                                      onChange={() => handlePrimaryImageChange(index)}
                                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      title={t.setAsPrimaryImage}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="block text-gray-500 mb-1 text-xs">{t.image}</label>
                                {productImages.length === 0 ? (
                                  <p className="text-xs text-gray-400">
                                    {'Add product images'}
                                  </p>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {variant.imageurl ? (
                                      <img
                                        src={variant.imageurl}
                                        alt="Variant"
                                        className="w-16 h-16 object-cover rounded border"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 border border-gray-300 rounded flex items-center justify-center bg-gray-50">
                                        <ImageIcon className="w-6 h-6 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openVariantImagePicker(index)}
                                        className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                      >
                                        {'Choose image'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                    </div>

                    {/* Validation Error Message */}
                    {Object.keys(validationErrors).length > 0 && (
                      <div 
                        data-validation-error
                        className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md"
                      >
                        <p className="text-sm text-red-800 font-medium">
                          {'Please fill in the missing fields'}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t border-gray-200 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          if (!showCompleteAnimation) {
                            setShowModal(false);
                            setProductTypeProperties([]);
                            setShowMediaModal(false);
                            setMediaTarget(null);
                            setSelectedPropertyValues({});
                            setVariants([]);
        setVariantDisplayValues({});
                            setNewPropertyValues({});
                            setValidationErrors({});
                            setShowCompleteAnimation(false);
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                      >
                        {'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-primary text-primary-foreground rounded hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation"
                      >
                        {editingProduct
                          ? ('Update')
                          : ('Create')
                        }
                      </button>
                    </div>
                  </form>
                  
                  {/* Complete Animation Overlay */}
                  {showCompleteAnimation && (
                    <div className="absolute inset-0 flex items-center justify-center z-50">
                      <CompleteAnimation size={120} />
                    </div>
                  )}
          </div>
        </AdminModal>

        {/* Media Selection Modal */}
        <AdminModal
          isOpen={showMediaModal}
          onClose={() => {
            setShowMediaModal(false);
            setMediaTarget(null);
          }}
          title={'Select Image from Media'}
          subheader={'Select an image from your media library'}
          maxWidth="max-w-4xl"
          minWidth={320}
          minHeight={400}
        >
                {loadingMedia ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-xs sm:text-sm text-gray-500">
                      {'Loading...'}
                    </p>
                  </div>
                ) : mediaFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">{'No images available'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                    {mediaFiles.map((file, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectImageFromMedia(file.url)}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 active:border-blue-600 transition-colors group touch-manipulation"
                      >
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 group-active:bg-opacity-50 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100">
                            {'Select'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
        </AdminModal>

        <AdminModal
          isOpen={showVariantImageModal}
          onClose={() => {
            setShowVariantImageModal(false);
            setVariantImageTargetIndex(null);
          }}
          title={'Select variant image'}
          subheader={'Choose from images uploaded for the product'}
          maxWidth="max-w-4xl"
          minWidth={320}
          minHeight={360}
        >
          {productImages.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              {'No product images uploaded yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {productImages.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => handleSelectVariantImage(url)}
                  className="group relative rounded border border-gray-200 overflow-hidden hover:border-blue-500 transition-colors"
                  title={'Select image'}
                >
                  <img
                    src={url}
                    alt={'Image'}
                    className="w-full h-28 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </AdminModal>

        {/* Apply Image to All Variants Modal */}
        <AdminModal
          isOpen={showApplyImageToAllModal}
          onClose={() => {
            setShowApplyImageToAllModal(false);
            setApplyImageUrl(null);
          }}
          title={'Apply image to all variants?'}
          subheader={'Do you want to assign this image to all generated variants?'}
          maxWidth="max-w-md"
          minWidth={320}
          minHeight={200}
        >
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowApplyImageToAllModal(false);
                setApplyImageUrl(null);
              }}
              className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              {'No'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (applyImageUrl) {
                  applyImageToAllVariants(applyImageUrl);
                }
                setShowApplyImageToAllModal(false);
                setApplyImageUrl(null);
              }}
              className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-primary text-primary-foreground rounded hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation"
            >
              {'Yes, apply to all'}
            </button>
          </div>
        </AdminModal>

        {/* Delete Confirmation Modal */}
        <AdminModal
          isOpen={showDeleteModal}
          onClose={() => {
            if (!showDeleteCompleteAnimation) {
              setShowDeleteModal(false);
              setProductToDelete(null);
              setShowDeleteCompleteAnimation(false);
            }
          }}
          title={'Confirm Delete'}
          subheader={'Are you sure you want to delete this product? This action cannot be undone.'}
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={200}
        >
          <div className="relative">
            <div className={`space-y-4 transition-all duration-300 ${showDeleteCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
            {productToDelete && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {'Product:'}
                </p>
                <p className="text-sm text-gray-700">{productToDelete.name}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (!showDeleteCompleteAnimation) {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                    setShowDeleteCompleteAnimation(false);
                  }
                }}
                disabled={deleting || showDeleteCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting || showDeleteCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-danger text-danger-foreground rounded hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? ('Deleting...') : ('Delete')}
              </button>
            </div>
            </div>
            
            {/* Complete Animation Overlay */}
            {showDeleteCompleteAnimation && (
              <div className="absolute inset-0 flex items-center justify-center z-50">
                <CompleteAnimation size={120} />
              </div>
            )}
          </div>
        </AdminModal>

        <AdminModal
          isOpen={bulkRestockModal !== null}
          onClose={() => {
            if (!showBulkRestockCompleteAnimation) {
              setBulkRestockModal(null);
              setShowBulkRestockCompleteAnimation(false);
            }
          }}
          title={
            bulkRestockModal === 'mark'
              ? 'Mark as out of stock'
              : 'Clear out-of-stock display'
          }
          subheader={
            bulkRestockModal === 'mark'
              ? 'Selected products will appear greyed out with “Out of stock / Restock coming soon”.'
              : 'Selected products will display normally (if they have stock).'
          }
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={200}
        >
          <div className="relative">
            <div
              className={`space-y-4 transition-all duration-300 ${
                showBulkRestockCompleteAnimation ? 'blur-sm pointer-events-none' : ''
              }`}
            >
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {'Selected items:'}
                </p>
                <p className="text-sm text-gray-700">{selectedProductIds.length}</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    if (!showBulkRestockCompleteAnimation) {
                      setBulkRestockModal(null);
                      setShowBulkRestockCompleteAnimation(false);
                    }
                  }}
                  disabled={bulkUpdatingRestock || showBulkRestockCompleteAnimation}
                  className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleBulkRestockConfirm}
                  disabled={bulkUpdatingRestock || showBulkRestockCompleteAnimation}
                  className={`w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base text-white rounded transition-opacity touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                    bulkRestockModal === 'mark'
                      ? 'bg-slate-600 hover:bg-slate-700'
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {bulkUpdatingRestock
                    ? 'Saving...'
                    : bulkRestockModal === 'mark'
                      ? 'Mark selected'
                      : 'Clear status'}
                </button>
              </div>
            </div>

            {showBulkRestockCompleteAnimation && (
              <div className="absolute inset-0 flex items-center justify-center z-50">
                <CompleteAnimation size={120} />
              </div>
            )}
          </div>
        </AdminModal>

        <AdminModal
          isOpen={bulkVisibilityModal !== null}
          onClose={() => {
            if (!showBulkVisibilityCompleteAnimation) {
              setBulkVisibilityModal(null);
              setShowBulkVisibilityCompleteAnimation(false);
            }
          }}
          title={
            bulkVisibilityModal === 'hide'
              ? 'Hide selected from shop'
              : 'Show selected in shop'
          }
          subheader={
            bulkVisibilityModal === 'hide'
              ? 'Selected products will be hidden from customers. You can show them again anytime.'
              : 'Selected products will become visible in the online shop.'
          }
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={200}
        >
          <div className="relative">
            <div
              className={`space-y-4 transition-all duration-300 ${
                showBulkVisibilityCompleteAnimation ? 'blur-sm pointer-events-none' : ''
              }`}
            >
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {'Selected items:'}
                </p>
                <p className="text-sm text-gray-700">{selectedProductIds.length}</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    if (!showBulkVisibilityCompleteAnimation) {
                      setBulkVisibilityModal(null);
                      setShowBulkVisibilityCompleteAnimation(false);
                    }
                  }}
                  disabled={bulkUpdatingVisibility || showBulkVisibilityCompleteAnimation}
                  className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleBulkVisibilityConfirm}
                  disabled={bulkUpdatingVisibility || showBulkVisibilityCompleteAnimation}
                  className={`w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base text-white rounded transition-opacity touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                    bulkVisibilityModal === 'hide'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {bulkUpdatingVisibility
                    ? 'Saving...'
                    : bulkVisibilityModal === 'hide'
                      ? 'Hide selected'
                      : 'Show selected'}
                </button>
              </div>
            </div>

            {showBulkVisibilityCompleteAnimation && (
              <div className="absolute inset-0 flex items-center justify-center z-50">
                <CompleteAnimation size={120} />
              </div>
            )}
          </div>
        </AdminModal>

        <AdminModal
          isOpen={showBulkDeleteModal}
          onClose={() => {
            if (!showBulkDeleteCompleteAnimation) {
              setShowBulkDeleteModal(false);
              setShowBulkDeleteCompleteAnimation(false);
            }
          }}
          title={'Confirm Bulk Delete'}
          subheader={'Selected products will be deleted. This action cannot be undone.'}
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={200}
        >
          <div className="relative">
            <div className={`space-y-4 transition-all duration-300 ${showBulkDeleteCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {'Selected items:'}
              </p>
              <p className="text-sm text-gray-700">
                {selectedProductIds.length}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (!showBulkDeleteCompleteAnimation) {
                    setShowBulkDeleteModal(false);
                    setShowBulkDeleteCompleteAnimation(false);
                  }
                }}
                disabled={bulkDeleting || showBulkDeleteCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDeleting || showBulkDeleteCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-danger text-danger-foreground rounded hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkDeleting ? ('Deleting...') : ('Delete selected')}
              </button>
            </div>
            </div>
            
            {/* Complete Animation Overlay */}
            {showBulkDeleteCompleteAnimation && (
              <div className="absolute inset-0 flex items-center justify-center z-50">
                <CompleteAnimation size={120} />
              </div>
            )}
          </div>
        </AdminModal>
    </AdminLayout>
  );
}

