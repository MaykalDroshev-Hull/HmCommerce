'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';
import AdminModal from '../components/AdminModal';
import { Badge } from '../components/layout';
import { getAdminSession } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { Plus, Edit2, Trash2, ChevronDown } from 'lucide-react';
import CompleteAnimation from '@/components/CompleteAnimation';

interface Discount {
  discountid: string;
  code: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  isactive: boolean;
  createdat: string;
  expiresat?: string;
}

interface DiscountFormData {
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: string;
  isactive: boolean;
  expiresat: string;
}

export default function DiscountsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language || 'en'];
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    document.title = t.discounts || ('Discounts');
  }, [language, t]);
  const [isLoading, setIsLoading] = useState(true);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState<DiscountFormData>({
    code: '',
    description: '',
    type: 'percentage',
    value: '',
    isactive: true,
    expiresat: ''
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCompleteAnimation, setShowCompleteAnimation] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getAdminSession();
        if (!session) {
          router.push('/admin/login');
          return;
        }
        setIsAuthenticated(true);
      } catch (error) {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDiscounts();
    }
  }, [isAuthenticated]);

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/discounts');
      const result = await response.json();
      if (result.success) {
        setDiscounts(result.discounts || []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      type: 'percentage',
      value: '',
      isactive: true,
      expiresat: ''
    });
    setFormErrors([]);
    setEditingDiscount(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (discount: Discount) => {
    setFormData({
      code: discount.code,
      description: discount.description || '',
      type: discount.type,
      value: discount.value.toString(),
      isactive: discount.isactive,
      expiresat: discount.expiresat ? new Date(discount.expiresat).toISOString().slice(0, 16) : ''
    });
    setEditingDiscount(discount);
    setShowModal(true);
  };

  const closeModal = () => {
    if (!showCompleteAnimation) {
      setShowModal(false);
      setShowCompleteAnimation(false);
      resetForm();
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.code.trim()) {
      errors.push(t.discountCodeRequiredMsg);
    } else if (formData.code.length < 3 || formData.code.length > 50) {
      errors.push(t.discountCodeLengthMsg);
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      errors.push(t.discountCodeFormatMsg);
    }

    if (!formData.type || !['percentage', 'fixed'].includes(formData.type)) {
      errors.push(t.discountTypeRequiredMsg);
    }

    const value = parseFloat(formData.value);
    if (isNaN(value) || value <= 0) {
      errors.push(t.discountValueRequiredMsg);
    } else if (formData.type === 'percentage' && value > 100) {
      errors.push(t.discountPercentageMaxMsg);
    }

    if (formData.expiresat) {
      const expiryDate = new Date(formData.expiresat);
      if (isNaN(expiryDate.getTime())) {
        errors.push(t.invalidExpiryDateMsg);
      } else if (expiryDate <= new Date()) {
        errors.push(t.expiryDateFutureMsg);
      }
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      setFormErrors([]);

      const submitData = {
        ...formData,
        value: parseFloat(formData.value),
        expiresat: formData.expiresat || null,
        ...(editingDiscount && { discountid: editingDiscount.discountid })
      };

      const method = editingDiscount ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/discounts', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details) {
          setFormErrors(result.details);
        } else {
          setFormErrors([result.error || 'Failed to save discount']);
        }
        return;
      }

      if (result.success) {
        // Show complete animation
        setShowCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(async () => {
          await loadDiscounts();
          closeModal();
          setShowCompleteAnimation(false);
        }, 1200);
      }
    } catch (error) {
      setFormErrors([t.unexpectedError]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (discount: Discount) => {
    if (!confirm(`${t.confirmDeleteDiscount} "${discount.code}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/discounts?id=${discount.discountid}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await loadDiscounts();
      } else {
        alert(`${t.failedToDeleteDiscount}: ${result.error}`);
      }
    } catch (error) {
      alert(t.unexpectedErrorDeleting);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const activeDiscounts = discounts.filter(d => d.isactive).length;

  // Pagination calculations
  const totalPages = Math.ceil(discounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDiscounts = discounts.slice(startIndex, endIndex);

  return (
    <AdminLayout currentPath="/admin/discounts">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t.discounts}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">{t.manageDiscountCodesAndPromotions}</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation text-sm sm:text-base"
          >
            <Plus size={18} className="sm:w-5 sm:h-5 mr-2" />
            {t.addDiscountCode}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">{t.totalDiscounts}</h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1 sm:mt-2">{discounts.length}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">{t.activeDiscounts}</h3>
            <p className="text-2xl sm:text-3xl font-bold text-success mt-1 sm:mt-2">{activeDiscounts}</p>
          </div>
        </div>

        {/* Discounts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm sm:text-base text-gray-500">{t.loadingDiscounts}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.codeHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.descriptionHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.typeHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.valueHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.statusHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.expiresHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.actionsHeader}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedDiscounts.map((discount) => (
                      <tr key={discount.discountid} className="hover:bg-gray-50">
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <span className="font-mono text-xs">{discount.code}</span>
                        </td>
                        <td className="px-4 xl:px-6 py-4 text-sm text-gray-500">
                          <div className="max-w-xs truncate">{discount.description || t.na}</div>
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {discount.type === 'percentage' ? t.percentage : t.fixedAmount}
                          </span>
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {discount.type === 'percentage' ? `${discount.value}%` : `€${discount.value.toFixed(2)}`}
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                          <Badge variant={discount.isactive ? 'success' : 'danger'}>
                            {discount.isactive ? t.active : t.inactive}
                          </Badge>
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {discount.expiresat ? new Date(discount.expiresat).toLocaleDateString() : t.never}
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(discount)}
                              className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors touch-manipulation"
                              title={t.editDiscountCode || 'Edit discount'}
                            >
                              <Edit2 size={16} className="sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(discount)}
                              className="p-1.5 sm:p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors touch-manipulation"
                              title={'Delete discount'}
                            >
                              <Trash2 size={16} className="sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {paginatedDiscounts.map((discount) => (
                  <div key={discount.discountid} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm sm:text-base font-medium text-gray-900 font-mono">{discount.code}</h3>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                              discount.isactive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {discount.isactive ? t.active : t.inactive}
                            </span>
                          </div>
                          {discount.description && (
                            <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{discount.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditModal(discount)}
                            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded transition-colors touch-manipulation"
                            title={t.editDiscountCode || 'Edit'}
                          >
                            <Edit2 size={18} className="sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(discount)}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 active:bg-red-100 rounded transition-colors touch-manipulation"
                            title={'Delete'}
                          >
                            <Trash2 size={18} className="sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">{t.typeHeader}</p>
                          <p className="text-sm font-medium text-gray-900">
                            {discount.type === 'percentage' ? t.percentage : t.fixedAmount}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t.valueHeader}</p>
                          <p className="text-sm font-medium text-gray-900">
                            {discount.type === 'percentage' ? `${discount.value}%` : `€${discount.value.toFixed(2)}`}
                          </p>
                        </div>
                        {discount.expiresat && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">{t.expiresHeader}</p>
                            <p className="text-sm text-gray-700">{new Date(discount.expiresat).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {discounts.length === 0 && !loading && (
            <div className="text-center py-8 sm:py-12 px-4 text-gray-500">
              <p className="text-sm sm:text-base">{t.noDiscountsFoundEmpty}</p>
            </div>
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
                    {t.showingTransactions || 'Showing'} <span className="font-medium">{startIndex + 1}</span> {'to'} <span className="font-medium">{Math.min(endIndex, discounts.length)}</span> {'of'} <span className="font-medium">{discounts.length}</span> {'discounts'}
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
        </div>

        {/* Discount Modal */}
        <AdminModal
          isOpen={showModal}
          onClose={closeModal}
          title={editingDiscount ? t.editDiscountCode : t.createDiscountCode}
          subheader={editingDiscount
            ? ('Edit the discount code information')
            : ('Create a new discount code for your customers')
          }
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={500}
        >
          <div className="relative">
            <form onSubmit={handleSubmit} className={`space-y-4 transition-all duration-300 ${showCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
                {/* Form Errors */}
                {formErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <ul className="text-xs sm:text-sm text-red-600 space-y-1">
                      {formErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Code */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t.discountCodeRequired}
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder={t.discountCodePlaceholder}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t.discountCodeHelp}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t.discountDescription}
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t.discountDescriptionPlaceholder}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t.discountTypeRequired}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="percentage">{t.percentage}</option>
                    <option value="fixed">{t.fixedAmount}</option>
                  </select>
                </div>

                {/* Value */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t.discountValueRequired}
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={formData.type === 'percentage' ? '10' : '5.00'}
                      min="0"
                      step={formData.type === 'percentage' ? '1' : '0.01'}
                      required
                    />
                    <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-xs sm:text-sm rounded-r-md">
                      {formData.type === 'percentage' ? '%' : '€'}
                    </span>
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t.expiryDateOptional}
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiresat}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresat: e.target.value }))}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="isactive"
                    checked={formData.isactive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isactive: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isactive" className="block text-xs sm:text-sm text-gray-700 cursor-pointer">
                    {t.activeStatus}
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
                    disabled={submitting}
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:opacity-90 active:opacity-80 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-opacity touch-manipulation"
                  >
                    {submitting ? t.saving : (editingDiscount ? t.updateDiscount : t.createDiscountBtn)}
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
      </div>
    </AdminLayout>
  );
}