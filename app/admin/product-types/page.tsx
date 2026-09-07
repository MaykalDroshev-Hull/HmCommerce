'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, ChevronDown } from 'lucide-react';
import { ProductType, Property } from '@/lib/types/product-types';
import AdminLayout from '../components/AdminLayout';
import AdminModal from '../components/AdminModal';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { AdminPage, PageHeader, Section, SectionSurface, EmptyState, DataTableShell, TableHeader, TableHeaderRow, TableHeaderCell, TableBody, TableRow, TableCell } from '../components/layout';
import { Tag } from 'lucide-react';
import CompleteAnimation from '@/components/CompleteAnimation';
import { adminAuthHeaders } from '@/lib/admin-auth-headers';

type ProductTypeRow = ProductType & {
  properties?: Array<{ propertyid: string; name: string }>;
  propertiesCount?: number;
  productsCount?: number;
};

export default function ProductTypesPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language || 'bg'];
  const [productTypes, setProductTypes] = useState<ProductTypeRow[]>([]);

  useEffect(() => {
    document.title = t.productTypes || ('Product Types');
  }, [language, t]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProductType, setEditingProductType] = useState<ProductType | null>(null);
  const [formData, setFormData] = useState({ name: '', parent_producttypeid: '' });
  const [showCompleteAnimation, setShowCompleteAnimation] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productTypeToDelete, setProductTypeToDelete] = useState<ProductType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDependencies, setDeleteDependencies] = useState<{
    loading: boolean;
    properties: Array<{ propertyid: string; name: string }>;
    products: Array<{ productid: string; name: string }>;
  }>({
    loading: false,
    properties: [],
    products: []
  });
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [selectedProductTypeIds, setSelectedProductTypeIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showDeleteCompleteAnimation, setShowDeleteCompleteAnimation] = useState(false);
  const [showBulkDeleteCompleteAnimation, setShowBulkDeleteCompleteAnimation] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadProductTypes();
  }, []);

  useEffect(() => {
    const loadDeleteDependencies = async () => {
      if (!showDeleteModal || !productTypeToDelete) return;
      setDeleteDependencies({ loading: true, properties: [], products: [] });
      try {
        const authHeaders = await adminAuthHeaders();
        const [propertiesRes, productsRes] = await Promise.all([
          fetch(`/api/product-types/${productTypeToDelete.producttypeid}/properties`),
          fetch(`/api/products?producttypeid=${productTypeToDelete.producttypeid}&includeDisabled=true`, {
            headers: authHeaders,
          }),
        ]);
        const propertiesJson = await propertiesRes.json();
        const productsJson = await productsRes.json();

        setDeleteDependencies({
          loading: false,
          properties: (propertiesJson?.properties || [])
            .map((ptp: any) => ptp?.properties)
            .filter(Boolean)
            .map((prop: any) => ({
              propertyid: prop.propertyid,
              name: prop.name
            })),
          products: (productsJson?.products || []).map((product: any) => ({
            productid: product.productid,
            name: product.name
          }))
        });
      } catch (error) {
        setDeleteDependencies({ loading: false, properties: [], products: [] });
      }
    };

    loadDeleteDependencies();
  }, [showDeleteModal, productTypeToDelete]);

  useEffect(() => {
    const loadProperties = async () => {
      if (!showModal) return;
      setLoadingProperties(true);
      try {
        const response = await fetch('/api/properties');
        const result = await response.json();
        if (result.success) {
          setAvailableProperties(result.properties || []);
        }
      } catch (error) {
      } finally {
        setLoadingProperties(false);
      }
    };

    if (showModal) {
      loadProperties();
      if (!editingProductType) {
        setSelectedPropertyIds([]);
      }
    }
  }, [showModal, editingProductType]);

  const loadProductTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/product-types');
      const result = await response.json();
      if (result.success) {
        setProductTypes(result.productTypes);
      } else {
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProductType 
        ? `/api/product-types/${editingProductType.producttypeid}`
        : '/api/product-types';
      const method = editingProductType ? 'PUT' : 'POST';

      // Prepare data: convert empty string to null for parent_producttypeid
      const submitData = {
        ...formData,
        parent_producttypeid: formData.parent_producttypeid || null
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();
      if (result.success) {
        if (!editingProductType && selectedPropertyIds.length > 0) {
          const createdId = result.productType?.producttypeid;
          if (createdId) {
            await Promise.all(
              selectedPropertyIds.map((propertyid) =>
                fetch(`/api/product-types/${createdId}/properties`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ propertyid })
                })
              )
            );
          }
        }
        // Show complete animation
        setShowCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(() => {
          setShowModal(false);
          setShowCompleteAnimation(false);
          setFormData({ name: '', parent_producttypeid: '' });
          setEditingProductType(null);
          setSelectedPropertyIds([]);
          loadProductTypes();
        }, 1200); // Wait for animation to complete (0.6s dash + 0.5s grow + buffer)
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Failed to save product type');
    }
  };

  const handleEdit = (productType: ProductType) => {
    setEditingProductType(productType);
    setFormData({ 
      name: productType.name,
      parent_producttypeid: productType.parent_producttypeid || ''
    });
    setShowModal(true);
  };

  const handleDeleteClick = (productType: ProductType) => {
    setProductTypeToDelete(productType);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productTypeToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/product-types/${productTypeToDelete.producttypeid}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        // Show complete animation
        setShowDeleteCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(() => {
          setShowDeleteModal(false);
          setShowDeleteCompleteAnimation(false);
          setProductTypeToDelete(null);
          loadProductTypes();
        }, 1200);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Failed to delete product type');
    } finally {
      setDeleting(false);
    }
  };

  const toggleProductTypeSelection = (productTypeId: string) => {
    setSelectedProductTypeIds((prev) =>
      prev.includes(productTypeId)
        ? prev.filter((id) => id !== productTypeId)
        : [...prev, productTypeId]
    );
  };

  const toggleSelectAllProductTypesOnPage = () => {
    setSelectedProductTypeIds((prev) => {
      if (allSelectedOnPage) {
        return prev.filter((id) => !paginatedProductTypeIds.includes(id));
      }
      const next = new Set(prev);
      paginatedProductTypeIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedProductTypeIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const results = await Promise.all(
        selectedProductTypeIds.map(async (id) => {
          const response = await fetch(`/api/product-types/${id}`, { method: 'DELETE' });
          const result = await response.json();
          return { id, ok: response.ok && result.success, error: result.error };
        })
      );

      const failed = results.filter((item) => !item.ok);
      if (failed.length > 0) {
        alert(
          `Failed to delete ${failed.length} categories.`
        );
        setSelectedProductTypeIds(failed.map((item) => item.id));
      } else {
        // Show complete animation
        setShowBulkDeleteCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(() => {
          setSelectedProductTypeIds([]);
          setShowBulkDeleteModal(false);
          setShowBulkDeleteCompleteAnimation(false);
          loadProductTypes();
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

  const handleManageProperties = (productType: ProductType) => {
    router.push(`/admin/product-types/${productType.producttypeid}`);
  };

  // Pagination calculations
  const totalPages = Math.ceil(productTypes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProductTypes = productTypes.slice(startIndex, endIndex);
  const paginatedProductTypeIds = paginatedProductTypes.map((pt) => pt.producttypeid);
  const allSelectedOnPage =
    paginatedProductTypeIds.length > 0 &&
    paginatedProductTypeIds.every((id) => selectedProductTypeIds.includes(id));

  useEffect(() => {
    setSelectedProductTypeIds((prev) =>
      prev.filter((id) => productTypes.some((pt) => pt.producttypeid === id))
    );
  }, [productTypes]);

  return (
    <AdminLayout currentPath="/admin/product-types">
      <AdminPage className="space-y-6">
        <PageHeader
          title={'Categories'}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {selectedProductTypeIds.length > 0 && (
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  {`Delete selected (${selectedProductTypeIds.length})`}
                </button>
              )}
              <button
                  onClick={() => {
                    setEditingProductType(null);
                    setFormData({ name: '', parent_producttypeid: '' });
                    setSelectedPropertyIds([]);
                    setShowModal(true);
                  }}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                {t.addProductType}
              </button>
            </div>
          }
        />

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm sm:text-base text-gray-500">{'Loading...'}</p>
          </div>
        ) : (
          <>
          <Section
            title={'Categories List'}
            description={'Manage product categories'}
          >
            {productTypes.length === 0 ? (
              <EmptyState
                title={'No Categories'}
                description={'Create your first category to start organizing your items.'}
                action={
                  <button
                  onClick={() => {
                    setEditingProductType(null);
                    setFormData({ name: '', parent_producttypeid: '' });
                    setSelectedPropertyIds([]);
                    setShowModal(true);
                  }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t.addProductType}
                  </button>
                }
                icon={Tag}
              />
            ) : (
              <div className="hidden md:block">
                <SectionSurface tone="soft" padding="md">
                  {/* Desktop Table View */}
                  <div className="overflow-hidden">
                  <DataTableShell>
                    <TableHeader>
                      <TableHeaderRow>
                        <TableHeaderCell align="center">
                          <input
                            type="checkbox"
                            checked={allSelectedOnPage}
                            onChange={toggleSelectAllProductTypesOnPage}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            aria-label={'Select all'}
                          />
                        </TableHeaderCell>
                        <TableHeaderCell>{t.name}</TableHeaderCell>
                        <TableHeaderCell>
                          {'Characteristics'}
                        </TableHeaderCell>
                        <TableHeaderCell align="center">{'Items'}</TableHeaderCell>
                        <TableHeaderCell align="right">{t.actions}</TableHeaderCell>
                      </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProductTypes.map((pt) => {
                        const propertiesCount = Number((pt as any).propertiesCount) || 0;
                        const productsCount = Number((pt as any).productsCount) || 0;
                        const highlightProducts = productsCount === 0;
                        const characteristics = pt.properties || [];
                        
                        return (
                          <TableRow key={pt.producttypeid}>
                            <TableCell align="center">
                              <input
                                type="checkbox"
                                checked={selectedProductTypeIds.includes(pt.producttypeid)}
                                onChange={() => toggleProductTypeSelection(pt.producttypeid)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                aria-label={'Select category'}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="truncate max-w-xs">
                                {pt.parent_producttypeid ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-400">└─</span>
                                    <span className="font-medium">{pt.name}</span>
                                  </div>
                                ) : (
                                  <span className="font-medium">{pt.name}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {characteristics.length === 0 ? (
                                <span className="text-xs text-gray-400">-</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {characteristics.map((prop) => (
                                    <span
                                      key={prop.propertyid}
                                      className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border border-gray-300 text-gray-600 bg-white"
                                    >
                                      {prop.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell 
                              align="center"
                              className={highlightProducts ? '!bg-yellow-200' : ''}
                              style={highlightProducts ? { backgroundColor: '#fef3c7', color: '#000' } : undefined}
                            >
                              <span className="font-medium">{productsCount}</span>
                            </TableCell>
                            <TableCell align="right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleManageProperties(pt)}
                                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors touch-manipulation"
                                  title={t.manageProperties || 'Manage Properties'}
                                >
                                  {t.manageProperties || 'Manage'}
                                </button>
                                <button
                                  onClick={() => handleEdit(pt)}
                                  className="p-1.5 sm:p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
                                  title={t.editProductType || 'Edit'}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(pt)}
                                  className="p-1.5 sm:p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors touch-manipulation"
                                  title={'Delete'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </DataTableShell>
                  </div>
                </SectionSurface>
              </div>
            )}
          </Section>

          {/* Mobile/Tablet Card View */}
          {productTypes.length > 0 && (
            <Section className="md:hidden">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAllProductTypesOnPage}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  {'Select all on page'}
                </label>
              </div>
              <div className="space-y-4">
                {paginatedProductTypes.map((pt) => {
                  const characteristics = pt.properties || [];
                  const propertiesCount = Number((pt as any).propertiesCount) || 0;
                  const productsCount = Number((pt as any).productsCount) || 0;
                  const highlightProducts = productsCount === 0;
                  
                  return (
                    <div key={pt.producttypeid} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      {/* Header with checkbox and name */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedProductTypeIds.includes(pt.producttypeid)}
                            onChange={() => toggleProductTypeSelection(pt.producttypeid)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                            aria-label={'Select category'}
                          />
                          <h3 className="text-base font-semibold text-gray-900 flex-1 min-w-0">
                            {pt.parent_producttypeid ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400">└─</span>
                                <span>{pt.name}</span>
                              </div>
                            ) : (
                              <span>{pt.name}</span>
                            )}
                          </h3>
                        </div>
                      </div>

                      {/* Characteristics section */}
                      {characteristics.length > 0 && (
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {characteristics.map((prop) => (
                              <span
                                key={prop.propertyid}
                                className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white"
                              >
                                {prop.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats section */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`px-3 py-2 rounded-md ${highlightProducts ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                            <div className="text-xs text-gray-600 mb-0.5">
                              {'Items'}
                            </div>
                            <div className={`text-lg font-bold ${highlightProducts ? 'text-yellow-800' : 'text-gray-900'}`}>
                              {productsCount}
                            </div>
                          </div>
                          <div className="px-3 py-2 rounded-md bg-gray-50">
                            <div className="text-xs text-gray-600 mb-0.5">
                              {'Characteristics'}
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {propertiesCount}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions section */}
                      <div className="px-4 py-3 bg-gray-50">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleManageProperties(pt)}
                            className="flex-1 px-3 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-md transition-colors touch-manipulation border border-blue-200"
                            title={t.manageProperties || 'Manage Properties'}
                          >
                            {t.manageProperties || 'Manage'}
                          </button>
                          <button
                            onClick={() => handleEdit(pt)}
                            className="px-4 py-2.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 rounded-md transition-colors touch-manipulation border border-indigo-200"
                            title={t.editProductType || 'Edit'}
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(pt)}
                            className="px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-md transition-colors touch-manipulation border border-red-200"
                            title={'Delete'}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
              <div className="bg-white px-3 sm:px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 mt-4">
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
                      {t.showingTransactions || 'Showing'} <span className="font-medium">{startIndex + 1}</span> {'to'} <span className="font-medium">{Math.min(endIndex, productTypes.length)}</span> {'of'} <span className="font-medium">{productTypes.length}</span> {'categories'}
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
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
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

        <AdminModal
          isOpen={showModal}
          onClose={() => {
            if (!showCompleteAnimation) {
              setShowModal(false);
              setShowCompleteAnimation(false);
            }
          }}
          title={editingProductType ? t.editProductType : t.addProductType}
          subheader={editingProductType
            ? ('Edit the product type information')
            : ('Create a new category for categorization')
          }
          maxWidth="max-w-2xl"
          minWidth={520}
          minHeight={550}
        >
          <div className="relative">
            <form onSubmit={handleSubmit}>
              <div className={`space-y-4 transition-all duration-300 ${showCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t.name}
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
                  {'Parent Category (optional)'}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {'Select a parent category to create a subcategory. Leave empty for a level 2 category.'}
                </p>
                <select
                  value={formData.parent_producttypeid}
                  onChange={(e) => setFormData({ ...formData, parent_producttypeid: e.target.value })}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{'-- No Parent --'}</option>
                  {productTypes
                    .filter(pt => {
                      // Only show categories that don't have a parent (level 2 categories)
                      // and don't have products (can have children)
                      const hasNoParent = !pt.parent_producttypeid;
                      const hasNoProducts = (pt as any).productsCount === 0;
                      // Don't show the category being edited as a parent option
                      const isNotSelf = editingProductType ? pt.producttypeid !== editingProductType.producttypeid : true;
                      return hasNoParent && hasNoProducts && isNotSelf;
                    })
                    .map((pt) => (
                      <option key={pt.producttypeid} value={pt.producttypeid}>
                        {pt.name}
                      </option>
                    ))}
                </select>
              </div>
              {!editingProductType && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {'Characteristics'}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {'Select characteristics (multi-select)'}
                  </p>
                  {loadingProperties ? (
                    <div className="text-xs text-gray-500">
                      {'Loading...'}
                    </div>
                  ) : availableProperties.length === 0 ? (
                    <div className="text-xs text-gray-500">
                      {'No characteristics available'}
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                      {availableProperties.map((property) => (
                        <label
                          key={property.propertyid}
                          className="flex items-start gap-2 py-1 cursor-pointer hover:bg-gray-50 px-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPropertyIds.includes(property.propertyid)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setSelectedPropertyIds((prev) =>
                                isChecked
                                  ? [...prev, property.propertyid]
                                  : prev.filter((id) => id !== property.propertyid)
                              );
                            }}
                            className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs sm:text-sm">
                            {property.name}
                            {property.description ? (
                              <span className="text-gray-400 ml-1">
                                ({property.description})
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                >
                  {editingProductType ? t.update : t.create}
                </button>
              </div>
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

        {/* Delete Confirmation Modal */}
        <AdminModal
          isOpen={showDeleteModal}
          onClose={() => {
            if (!showDeleteCompleteAnimation) {
              setShowDeleteModal(false);
              setProductTypeToDelete(null);
              setShowDeleteCompleteAnimation(false);
            }
          }}
          title={'Confirm Delete'}
          subheader={'Are you sure you want to delete this product type? Products and characteristics linked to it will also be deleted. This action cannot be undone.'}
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={550}
        >
          <div className="relative">
            <div className={`space-y-4 transition-all duration-300 ${showDeleteCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
            {productTypeToDelete && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {'Category:'}
                </p>
                <p className="text-sm text-gray-700">{productTypeToDelete.name}</p>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {'Characteristics'}
                  {deleteDependencies.properties.length > 0 ? ` (${deleteDependencies.properties.length})` : ''}
                </p>
                {deleteDependencies.loading ? (
                  <p className="text-xs text-gray-500">
                    {'Loading...'}
                  </p>
                ) : deleteDependencies.properties.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    {'None'}
                  </p>
                ) : (
                  <div className="max-h-32 overflow-y-auto rounded border border-gray-200 bg-white">
                    {deleteDependencies.properties.map((prop) => (
                      <div key={prop.propertyid} className="px-3 py-1 text-xs text-gray-700 border-b last:border-b-0">
                        {prop.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {'Products'}
                  {deleteDependencies.products.length > 0 ? ` (${deleteDependencies.products.length})` : ''}
                </p>
                {deleteDependencies.loading ? (
                  <p className="text-xs text-gray-500">
                    {'Loading...'}
                  </p>
                ) : deleteDependencies.products.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    {'None'}
                  </p>
                ) : (
                  <div className="max-h-32 overflow-y-auto rounded border border-gray-200 bg-white">
                    {deleteDependencies.products.map((product) => (
                      <div key={product.productid} className="px-3 py-1 text-xs text-gray-700 border-b last:border-b-0">
                        {product.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (!showDeleteCompleteAnimation) {
                    setShowDeleteModal(false);
                    setProductTypeToDelete(null);
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
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
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
          isOpen={showBulkDeleteModal}
          onClose={() => {
            if (!showBulkDeleteCompleteAnimation) {
              setShowBulkDeleteModal(false);
              setShowBulkDeleteCompleteAnimation(false);
            }
          }}
          title={'Confirm Bulk Delete'}
          subheader={'Selected categories and all related products and characteristics will be deleted. This action cannot be undone.'}
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={360}
        >
          <div className="relative">
            <div className={`space-y-4 transition-all duration-300 ${showBulkDeleteCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {'Selected categories:'}
              </p>
              <p className="text-sm text-gray-700">
                {selectedProductTypeIds.length}
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
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
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
      </AdminPage>
    </AdminLayout>
  );
}

