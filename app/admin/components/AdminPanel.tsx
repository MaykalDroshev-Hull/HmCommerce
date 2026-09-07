'use client';

import { useState, useEffect } from 'react';
import { Search, Edit2, Eye, EyeOff, Upload, Image as ImageIcon, X, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import EditProductVariantsModal from '@/components/EditProductVariantsModal';
import LanguageToggle from '@/components/LanguageToggle';
import AdminModal from './AdminModal';
import { useProducts } from '@/context/ProductContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { translations } from '@/lib/translations';
import { Product } from '@/lib/data';
import { ProductWithDetails } from '@/lib/types/product-types';
import { supabase } from '@/lib/supabase';
import { testStorageConnection, DEFAULT_BUCKET, uploadFile, getStorageUrl, listFiles } from '@/lib/supabaseStorage';
import { generateAndUploadTestImage } from '@/lib/generateTestImage';

export default function AdminPanel() {
  const { products, setProducts, loadProducts } = useProducts();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const t = translations[language];
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | ProductWithDetails | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; path: string }>>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Test Supabase connection, Storage bucket, and Session on component mount (client-side only)
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const testConnections = async () => {
      try {
        const { getAdminSession } = await import('@/lib/auth');
        await getAdminSession();

        const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
        const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!hasUrl || !hasKey) {
          return;
        }

        const storageResult = await testStorageConnection(DEFAULT_BUCKET);

        if (!storageResult.success) {
          try {
            await fetch('/api/storage/setup', { method: 'POST' });
          } catch {
            // Bucket setup is best-effort on panel load
          }
        }
      } catch {
        // Connection test is best-effort on panel load
      }
    };

    testConnections();
  }, []);


  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchTerm || 
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.color.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesVisibility = visibilityFilter === 'all' || 
      (visibilityFilter === 'visible' && p.visible) ||
      (visibilityFilter === 'hidden' && !p.visible);

    return matchesSearch && matchesCategory && matchesVisibility;
  });

  const toggleVisibility = async (id: string | number) => {
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;

      const updatedProduct = { ...product, visible: !product.visible };

      // Update in database
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });

      if (response.ok) {
        // Update local state
        setProducts(products.map(p => 
          p.id === id ? updatedProduct : p
        ));
      }
    } catch {
      // Visibility update failed
    }
  };

  const handleSaveProduct = async (updatedProduct: Product) => {
    try {
      const isNewProduct = !updatedProduct.id || updatedProduct.id === 0;
      
      if (isNewProduct) {
        // Create new product
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProduct)
        });

        const result = await response.json();

        if (result.success) {
          await loadProducts();
          setEditingProduct(null);
        } else {
          alert('Error creating product');
        }
      } else {
        // Update existing product
        const response = await fetch(`/api/products/${updatedProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProduct)
        });

        const result = await response.json();

        if (result.success) {
          await loadProducts();
          setEditingProduct(null);
        } else {
          alert('Error updating product');
        }
      }
    } catch {
      alert('Error saving product');
    }
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadProducts();
      } else {
        alert('Error deleting product');
      }
    } catch {
      alert('Error deleting product');
    }
  };

  const handleAddProduct = () => {
    // Pass null to indicate a new product
    setEditingProduct(null as any);
  };

  // Load uploaded files on mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const { data, error } = await listFiles(DEFAULT_BUCKET, '');
        if (!error && data) {
          const filesWithUrls = data.map(file => ({
            name: file.name,
            path: file.name,
            url: getStorageUrl(DEFAULT_BUCKET, file.name)
          }));
          setUploadedFiles(filesWithUrls);
        }
      } catch {
        // File list unavailable
      }
    };
    loadFiles();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image (JPG, PNG, etc.)');
      return;
    }

    setUploading(true);
    setUploadProgress('Uploading image...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'images');

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUploadProgress('Image uploaded successfully.');
        
        // Add to uploaded files list
        setUploadedFiles(prev => [{
          name: file.name,
          path: result.path,
          url: result.url
        }, ...prev]);

        // Clear input
        event.target.value = '';
        
        setTimeout(() => {
          setUploadProgress('');
          setShowUploadModal(false);
        }, 2000);
      } else {
        setUploadProgress(`Error: ${result.error || 'Upload failed'}`);
      }
    } catch (error) {
      setUploadProgress(`Error: ${error instanceof Error ? error.message : 'Unexpected error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-2">
              <h1 
                className="text-2xl sm:text-3xl font-semibold transition-colors duration-300"
                style={{ color: theme.colors.text }}
              >
                {t.products}
              </h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddProduct}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-300 font-medium text-sm"
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
                  <Plus size={18} />
                  <span>{'Add Product'}</span>
                </button>
                
                <div className="hidden lg:block">
                  <LanguageToggle />
                </div>
              </div>
            </div>
            <p 
              className="text-sm sm:text-base transition-colors duration-300"
              style={{ color: theme.colors.textSecondary }}
            >
              {t.manageProducts}
            </p>
          </div>

          <div 
            className="rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 transition-colors duration-300"
            style={{
              backgroundColor: theme.colors.surface,
              boxShadow: theme.effects.shadow
            }}
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search 
                    className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300" 
                    size={18}
                    style={{ color: theme.colors.textSecondary }}
                  />
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:border-transparent transition-colors duration-300"
                    style={{
                      backgroundColor: theme.colors.cardBg,
                      borderColor: theme.colors.border,
                      color: theme.colors.text
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:border-transparent transition-colors duration-300 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                style={{
                  backgroundColor: theme.colors.cardBg,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
              >
                <option value="all">{t.allCategories}</option>
                <option value="clothes">{t.clothes}</option>
                <option value="shoes">{t.shoes}</option>
                <option value="accessories">{t.accessories}</option>
              </select>

              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:border-transparent transition-colors duration-300 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                style={{
                  backgroundColor: theme.colors.cardBg,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
              >
                <option value="all">{t.allItems}</option>
                <option value="visible">{t.visible}</option>
                <option value="hidden">{t.hidden}</option>
              </select>
            </div>
          </div>

          <div 
            className="rounded-lg shadow-sm overflow-hidden transition-colors duration-300"
            style={{
              backgroundColor: theme.colors.surface,
              boxShadow: theme.effects.shadow
            }}
          >
            {/* Mobile Card View */}
            <div className="md:hidden">
              <div className="divide-y" style={{ borderColor: theme.colors.border }}>
                {filteredProducts.map(product => (
                  <div 
                    key={product.id}
                    className="p-4 transition-colors duration-300"
                    style={{ 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={product.images[0]}
                        alt={product.model}
                        className="w-16 h-16 rounded object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 
                              className="font-semibold text-sm mb-1 truncate"
                              style={{ color: theme.colors.text }}
                            >
                              {product.brand} {product.model}
                            </h3>
                            <p 
                              className="text-xs mb-1"
                              style={{ color: theme.colors.textSecondary }}
                            >
                              {product.category === 'clothes' ? t.clothes : 
                               product.category === 'shoes' ? t.shoes : 
                               product.category === 'accessories' ? t.accessories : product.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => toggleVisibility(product.id)}
                              className={`p-2 rounded touch-manipulation ${
                                product.visible
                                  ? 'text-green-600 active:bg-green-50'
                                  : 'text-gray-400 active:bg-gray-100'
                              }`}
                              aria-label={product.visible ? t.visible : t.hidden}
                            >
                              {product.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="p-2 rounded transition-colors duration-300 touch-manipulation"
                              style={{ 
                                color: theme.colors.primary
                              }}
                              onTouchStart={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.secondary;
                              }}
                              onTouchEnd={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              aria-label={t.actions}
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 rounded touch-manipulation text-red-600 active:bg-red-50"
                              aria-label={'Delete product'}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span style={{ color: theme.colors.textSecondary }}>{t.color}: </span>
                            <span style={{ color: theme.colors.text }}>{product.color}</span>
                          </div>
                          <div>
                            <span style={{ color: theme.colors.textSecondary }}>{t.size}: </span>
                            <span style={{ color: theme.colors.text }}>{product.size || '-'}</span>
                          </div>
                          <div>
                            <span style={{ color: theme.colors.textSecondary }}>{t.qty}: </span>
                            <span style={{ color: theme.colors.text }}>{product.quantity}</span>
                          </div>
                          <div>
                            <span style={{ color: theme.colors.textSecondary }}>{t.price}: </span>
                            <span style={{ color: theme.colors.text }} className="font-semibold">€{product.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead 
                  className="border-b transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.secondary,
                    borderColor: theme.colors.border
                  }}
                >
                  <tr>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.image}
                    </th>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.category}
                    </th>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.brand}
                    </th>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.model}
                    </th>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.color}
                    </th>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.size}
                    </th>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.qty}
                    </th>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.price}
                    </th>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.visible}
                    </th>
                    <th 
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                  {filteredProducts.map(product => (
                    <tr 
                      key={product.id} 
                      className="transition-colors duration-300"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.secondary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td className="px-4 lg:px-6 py-4">
                        <img
                          src={product.images[0]}
                          alt={product.model}
                          className="w-12 h-12 lg:w-14 lg:h-14 rounded object-cover"
                        />
                      </td>
                      <td 
                        className="px-4 lg:px-6 py-4 text-sm capitalize transition-colors duration-300"
                        style={{ color: theme.colors.text }}
                      >
                        {product.category === 'clothes' ? t.clothes : 
                         product.category === 'shoes' ? t.shoes : 
                         product.category === 'accessories' ? t.accessories : product.category}
                      </td>
                      <td 
                        className="px-4 lg:px-6 py-4 text-sm transition-colors duration-300"
                        style={{ color: theme.colors.text }}
                      >
                        {product.brand}
                      </td>
                      <td 
                        className="px-4 lg:px-6 py-4 text-sm transition-colors duration-300"
                        style={{ color: theme.colors.text }}
                      >
                        {product.model}
                      </td>
                      <td 
                        className="px-4 lg:px-6 py-4 text-sm transition-colors duration-300"
                        style={{ color: theme.colors.text }}
                      >
                        {product.color}
                      </td>
                      <td 
                        className="px-4 lg:px-6 py-4 text-sm transition-colors duration-300"
                        style={{ color: theme.colors.text }}
                      >
                        {product.size || '-'}
                      </td>
                      <td 
                        className="px-4 lg:px-6 py-4 text-sm transition-colors duration-300"
                        style={{ color: theme.colors.text }}
                      >
                        {product.quantity}
                      </td>
                      <td 
                        className="px-4 lg:px-6 py-4 text-sm font-medium transition-colors duration-300"
                        style={{ color: theme.colors.text }}
                      >
                        €{product.price.toFixed(2)}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <button
                          onClick={() => toggleVisibility(product.id)}
                          className={`p-2 rounded transition-colors ${
                            product.visible
                              ? 'text-green-600 hover:bg-green-50 active:bg-green-100'
                              : 'text-gray-400 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                          aria-label={product.visible ? t.visible : t.hidden}
                        >
                          {product.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="p-2 rounded transition-colors duration-300"
                            style={{ 
                              color: theme.colors.primary
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.colors.secondary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            aria-label={t.actions}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 rounded transition-colors duration-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            aria-label={'Delete product'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 px-4">
                <p 
                  className="text-sm sm:text-base transition-colors duration-300"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {t.noProductsFound}
                </p>
              </div>
            )}
          </div>
        </div>

        {editingProduct !== undefined && (
          <EditProductVariantsModal
            product={editingProduct as ProductWithDetails | null}
            onClose={() => setEditingProduct(undefined)}
            onSave={handleSaveProduct}
          />
        )}

        {/* Upload Modal */}
        <AdminModal
          isOpen={showUploadModal}
          onClose={() => !uploading && setShowUploadModal(false)}
          title={'Upload Image to Storage'}
          subheader={'Upload images to your media library'}
          maxWidth="max-w-2xl"
          minWidth={500}
          minHeight={400}
        >

              <div className="mb-6">
                <label 
                  className="block mb-2 text-sm font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {'Select Image'}
                </label>
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
                  style={{
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.cardBg
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = theme.colors.primary;
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.border;
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = theme.colors.border;
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.files = e.dataTransfer.files as any;
                      input.onchange = (ev) => handleFileUpload(ev as any);
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer"
                  >
                    <ImageIcon 
                      size={48} 
                      className="mx-auto mb-4"
                      style={{ color: theme.colors.textSecondary }}
                    />
                    <p 
                      className="text-sm mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      {'Click or drag image here'}
                    </p>
                    <p 
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {'JPG, PNG, GIF up to 10MB'}
                    </p>
                  </label>
                </div>
              </div>

              {uploadProgress && (
                <div 
                  className="p-4 rounded-lg mb-4"
                  style={{
                    backgroundColor: uploadProgress.includes('✅') 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : uploadProgress.includes('❌')
                      ? 'rgba(239, 68, 68, 0.1)'
                      : theme.colors.secondary
                  }}
                >
                  <p 
                    className="text-sm"
                    style={{ color: theme.colors.text }}
                  >
                    {uploadProgress}
                  </p>
                </div>
              )}

              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div>
                  <h3 
                    className="text-sm font-medium mb-3"
                    style={{ color: theme.colors.text }}
                  >
                    {'Uploaded Images'} ({uploadedFiles.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                    {uploadedFiles.slice(0, 6).map((file, index) => (
                      <div 
                        key={index}
                        className="relative group"
                      >
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-24 object-cover rounded border"
                          style={{ borderColor: theme.colors.border }}
                        />
                        <div 
                          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded flex items-center justify-center"
                        >
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 text-white text-xs px-2 py-1 bg-black bg-opacity-75 rounded"
                          >
                            {'Open'}
                          </a>
                        </div>
                        <p 
                          className="text-xs mt-1 truncate"
                          style={{ color: theme.colors.textSecondary }}
                          title={file.name}
                        >
                          {file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
        </AdminModal>
    </>
  );
}

