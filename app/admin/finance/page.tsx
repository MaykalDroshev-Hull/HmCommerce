'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { Badge } from '../components/layout';
import { getAdminSession } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { getOrderStatusVariant } from '@/lib/admin-status-utils';

interface Transaction {
  orderid: string;
  date: string;
  customer: string;
  amount: number;
  status: string;
  type: string;
}

interface FinancialData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  totalDeliveryCost: number;
  netRevenue: number;
  revenueChange: number;
  ordersChange: number;
  transactions: Transaction[];
}

export default function FinancePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language || 'en'];
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    document.title = t.finance || ('Finance');
  }, [language, t]);
  const [isLoading, setIsLoading] = useState(true);
  const [financeData, setFinanceData] = useState<FinancialData | null>(null);
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
      loadFinanceData();
    }
  }, [isAuthenticated]);

  // Reset to first page when transactions change
  useEffect(() => {
    if (financeData?.transactions) {
      setCurrentPage(1);
    }
  }, [financeData?.transactions?.length]);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/finance');
      const result = await response.json();
      if (result.success) {
        setFinanceData(result.data);
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

  return (
    <AdminLayout currentPath="/admin/finance">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t.finance}</h1>
          <p className="text-gray-600 mt-2">{t.financialOverviewAndRevenueTracking}</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-500">{t.loadingFinancialData}</p>
          </div>
        ) : financeData ? (
          <div className="space-y-6">
            {/* Key Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">{t.totalRevenue}</h3>
                <p className="text-3xl font-bold text-success mt-2">
                  €{financeData.totalRevenue.toFixed(2)}
                </p>
                {financeData.revenueChange !== 0 && (
                  <p className={`text-sm mt-1 ${financeData.revenueChange > 0 ? 'text-success' : 'text-danger'}`}>
                    {financeData.revenueChange > 0 ? '+' : ''}{financeData.revenueChange.toFixed(1)}% {t.fromLastPeriod}
                  </p>
                )}
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">{t.netRevenue}</h3>
                <p className="text-3xl font-bold text-primary mt-2">
                  €{financeData.netRevenue.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {t.afterDeliveryCostsText} €{financeData.totalDeliveryCost.toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">{t.totalOrders}</h3>
                <p className="text-3xl font-bold text-primary mt-2">
                  {financeData.totalOrders}
                </p>
                {financeData.ordersChange !== 0 && (
                  <p className={`text-sm mt-1 ${financeData.ordersChange > 0 ? 'text-success' : 'text-danger'}`}>
                    {financeData.ordersChange > 0 ? '+' : ''}{financeData.ordersChange.toFixed(1)}% {t.fromLastPeriod}
                  </p>
                )}
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">{t.averageOrderValue}</h3>
                <p className="text-3xl font-bold text-primary mt-2">
                  €{financeData.averageOrderValue.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{t.perOrder}</p>
              </div>
            </div>

            {/* Recent Transactions */}
            {financeData.transactions && financeData.transactions.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.recentTransactions}</h3>
                
                {/* Pagination calculations */}
                {(() => {
                  const totalPages = Math.ceil(financeData.transactions.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const currentTransactions = financeData.transactions.slice(startIndex, endIndex);
                  
                  return (
                    <>
                      <div className="space-y-3">
                        {currentTransactions.map((transaction, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {transaction.customer && transaction.customer !== 'Unknown Customer'
                              ? transaction.customer.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : '??'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.customer || 'Unknown Customer'}</p>
                          <p className="text-sm text-gray-500">
                            {t.orderNumber}{transaction.orderid} • {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-success">€{transaction.amount.toFixed(2)}</p>
                        <Badge variant={getOrderStatusVariant(transaction.status)} className="mt-1">
                          {transaction.status === 'delivered' ? t.delivered :
                           transaction.status === 'shipped' ? t.shipped :
                           transaction.status === 'confirmed' ? t.confirmed :
                           transaction.status === 'pending' ? t.pending :
                           transaction.status}
                        </Badge>
                      </div>
                    </div>
                        ))}
                      </div>
                      
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            {t.showingTransactions} {startIndex + 1}-{Math.min(endIndex, financeData.transactions.length)} {t.ofTransactions} {financeData.transactions.length}
                          </div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 sm:px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                            >
                              <span className="sr-only">{t.previous || 'Previous'}</span>
                              <ChevronDown className="h-4 w-4 sm:w-5 sm:h-5 rotate-90" />
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
                              <ChevronDown className="h-4 w-4 sm:w-5 sm:h-5 -rotate-90" />
                            </button>
                          </nav>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <h3 className="text-lg font-semibold text-gray-900">{t.deliveryCosts}</h3>
                <p className="text-3xl font-bold text-danger mt-2">
                  €{financeData.totalDeliveryCost.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{t.totalShippingExpenses}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <h3 className="text-lg font-semibold text-gray-900">{t.pendingPayments}</h3>
                <p className="text-3xl font-bold text-warning mt-2">
                  €{financeData.pendingPayments.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{t.awaitingProcessing}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <h3 className="text-lg font-semibold text-gray-900">{t.profitMargin}</h3>
                <p className="text-3xl font-bold text-primary mt-2">
                  {financeData.totalRevenue > 0
                    ? ((financeData.netRevenue / financeData.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">{t.revenueAfterCosts}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">{t.unableToLoadFinancialData}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}