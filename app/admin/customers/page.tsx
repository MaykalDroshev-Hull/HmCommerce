'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface Customer {
  customerid: string;
  email?: string;
  name?: string;
  createdat: string;
  lastorder?: string;
  totalorders?: number;
  totalspent?: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language || 'en'];
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    document.title = t.customers || ('Customers');
  }, [language, t]);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      loadCustomers();
    }
  }, [isAuthenticated]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/customers');
      const result = await response.json();
      if (result.success) {
        setCustomers(result.customers || []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
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

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.totalorders && c.totalorders > 0).length;

  // Pagination calculations
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = customers.slice(startIndex, endIndex);

  return (
    <AdminLayout currentPath="/admin/customers">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">{t.customers}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">{t.manageAndViewCustomerBase}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">{t.totalCustomers}</h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1 sm:mt-2">{totalCustomers}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">{t.activeCustomers}</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">{activeCustomers}</p>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm sm:text-base text-gray-500">{t.loadingCustomers}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.nameHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.emailHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.totalOrdersHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.totalSpentHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.lastOrderHeader}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.joinedHeader}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedCustomers.map((customer) => (
                      <tr key={customer.customerid} className="hover:bg-gray-50">
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="truncate max-w-xs">{customer.name || t.na}</div>
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="truncate max-w-xs">{customer.email || t.na}</div>
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.totalorders || 0}
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          €{customer.totalspent?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.lastorder ? new Date(customer.lastorder).toLocaleDateString() : t.never}
                        </td>
                        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(customer.createdat).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {paginatedCustomers.map((customer) => (
                  <div key={customer.customerid} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                            {customer.name || t.na}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 truncate mt-1">
                            {customer.email || t.na}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">{t.totalOrdersHeader}</p>
                          <p className="text-sm font-medium text-gray-900">{customer.totalorders || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t.totalSpentHeader}</p>
                          <p className="text-sm font-medium text-gray-900">€{customer.totalspent?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t.lastOrderHeader}</p>
                          <p className="text-sm text-gray-700">{customer.lastorder ? new Date(customer.lastorder).toLocaleDateString() : t.never}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t.joinedHeader}</p>
                          <p className="text-sm text-gray-700">{new Date(customer.createdat).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {customers.length === 0 && !loading && (
            <div className="text-center py-8 sm:py-12 px-4 text-gray-500">
              <p className="text-sm sm:text-base">{t.noCustomersFound}</p>
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
                    {t.showingTransactions || 'Showing'} <span className="font-medium">{startIndex + 1}</span> {'to'} <span className="font-medium">{Math.min(endIndex, customers.length)}</span> {'of'} <span className="font-medium">{customers.length}</span> {'customers'}
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
      </div>
    </AdminLayout>
  );
}