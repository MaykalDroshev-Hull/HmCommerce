'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Download, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  RefreshCw, 
  ShoppingBag, 
  Globe, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';

interface Subscriber {
  id: string;
  email: string;
  source: string;
  status: 'active' | 'unsubscribed';
  discount_code_sent: string | null;
  created_at: string;
  updated_at: string;
}

interface NewsletterStats {
  total: number;
  active: number;
  unsubscribed: number;
  footerSource: number;
  checkoutSource: number;
}

export default function AdminNewsletterPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<NewsletterStats>({
    total: 0,
    active: 0,
    unsubscribed: 0,
    footerSource: 0,
    checkoutSource: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    document.title = 'Newsletter Subscribers | Admin Panel';
  }, []);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getAdminSession();
        if (!session) {
          router.push('/admin/login');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const loadSubscribers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/newsletter?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSubscribers(data.subscribers || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Failed to load subscribers' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error loading subscribers' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscribers();
    }
  }, [isAuthenticated, loadSubscribers]);

  // Status toggle handler
  const handleToggleStatus = async (subscriber: Subscriber) => {
    const newStatus = subscriber.status === 'active' ? 'unsubscribed' : 'active';
    setActionLoadingId(subscriber.id);
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subscriber.id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribers(prev =>
          prev.map(sub => (sub.id === subscriber.id ? { ...sub, status: newStatus } : sub))
        );
        // Refresh stats
        loadSubscribers();
        setFeedbackMessage({
          type: 'success',
          text: `Subscriber ${subscriber.email} marked as ${newStatus}.`,
        });
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Could not update status' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error updating status' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete handler
  const handleDelete = async (subscriber: Subscriber) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${subscriber.email} from the newsletter list?`)) {
      return;
    }
    setActionLoadingId(subscriber.id);
    try {
      const res = await fetch(`/api/admin/newsletter?id=${subscriber.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSubscribers(prev => prev.filter(sub => sub.id !== subscriber.id));
        loadSubscribers();
        setFeedbackMessage({
          type: 'success',
          text: `Subscriber ${subscriber.email} has been deleted.`,
        });
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Could not delete subscriber' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error deleting subscriber' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      alert('No subscribers to export.');
      return;
    }

    const headers = ['Email', 'Source', 'Status', 'Discount Code', 'Date Subscribed', 'Last Updated'];
    const rows = subscribers.map(sub => [
      `"${sub.email.replace(/"/g, '""')}"`,
      `"${sub.source || 'footer'}"`,
      `"${sub.status}"`,
      `"${sub.discount_code_sent || 'WELCOME10'}"`,
      `"${new Date(sub.created_at).toISOString()}"`,
      `"${new Date(sub.updated_at).toISOString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Pagination slice
  const totalPages = Math.ceil(subscribers.length / itemsPerPage) || 1;
  const paginatedSubscribers = subscribers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AdminLayout currentPath="/admin/newsletter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Mail className="w-7 h-7 text-neutral-900" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                Newsletter Subscribers
              </h1>
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              Manage email subscribers, track signup sources, and export mailing lists for marketing campaigns.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadSubscribers()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-neutral-950 rounded-lg hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-3.5 rounded-lg flex items-center justify-between text-xs font-medium ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-neutral-400 hover:text-neutral-700 font-bold ml-4"
            >
              &times;
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Signups</span>
              <Mail className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-950">{stats.total}</div>
            <p className="text-[11px] text-neutral-400 mt-1">All-time email subscribers</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Audience</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{stats.active}</div>
            <p className="text-[11px] text-neutral-400 mt-1">
              {stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% of total subscribers` : 'No subscribers yet'}
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Checkout Signups</span>
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-950">{stats.checkoutSource}</div>
            <p className="text-[11px] text-neutral-400 mt-1">Acquired from checkout prompt</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Footer Signups</span>
              <Globe className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-950">{stats.footerSource}</div>
            <p className="text-[11px] text-neutral-400 mt-1">Acquired via storefront footer</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search subscribers by email..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-950 focus:bg-white transition-colors"
            />
          </div>

          {/* Status Tabs */}
          <div className="inline-flex rounded-lg bg-neutral-100 p-1 border border-neutral-200 self-start sm:self-auto">
            <button
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => {
                setStatusFilter('active');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'active'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => {
                setStatusFilter('unsubscribed');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'unsubscribed'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Unsubscribed ({stats.unsubscribed})
            </button>
          </div>
        </div>

        {/* Table & Mobile Cards */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto" />
              <p className="mt-3 text-xs text-neutral-500">Loading subscribers...</p>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Mail className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-neutral-900">No subscribers found</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'No results match your current search or filter criteria.'
                  : 'When customers join via the footer or checkout promo, they will be listed here.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-left">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Email Address
                      </th>
                      <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Source
                      </th>
                      <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Promo Code
                      </th>
                      <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Subscribed On
                      </th>
                      <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {paginatedSubscribers.map(subscriber => (
                      <tr key={subscriber.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <Mail className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                            <span className="font-semibold text-neutral-900 text-xs sm:text-sm">
                              {subscriber.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              subscriber.source === 'checkout'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            {subscriber.source === 'checkout' ? (
                              <ShoppingBag className="w-3 h-3" />
                            ) : (
                              <Globe className="w-3 h-3" />
                            )}
                            {subscriber.source === 'checkout' ? 'Checkout' : 'Footer'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                              subscriber.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                            }`}
                          >
                            {subscriber.status === 'active' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-neutral-400" />
                            )}
                            {subscriber.status === 'active' ? 'Active' : 'Unsubscribed'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block font-mono text-xs font-bold px-2 py-0.5 bg-neutral-100 text-neutral-800 rounded border border-neutral-200">
                            {subscriber.discount_code_sent || 'WELCOME10'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-neutral-500">
                          {new Date(subscriber.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStatus(subscriber)}
                              disabled={actionLoadingId === subscriber.id}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                                subscriber.status === 'active'
                                  ? 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              } disabled:opacity-50`}
                              title={subscriber.status === 'active' ? 'Mark as unsubscribed' : 'Reactivate'}
                            >
                              {subscriber.status === 'active' ? 'Unsubscribe' : 'Reactivate'}
                            </button>
                            <button
                              onClick={() => handleDelete(subscriber)}
                              disabled={actionLoadingId === subscriber.id}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 rounded transition-colors disabled:opacity-50"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-neutral-100">
                {paginatedSubscribers.map(subscriber => (
                  <div key={subscriber.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                          <span className="font-bold text-xs text-neutral-900 truncate">
                            {subscriber.email}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Joined {new Date(subscriber.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          subscriber.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        }`}
                      >
                        {subscriber.status === 'active' ? 'Active' : 'Unsub'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400">Source:</span>
                        <span className="text-[11px] font-semibold text-neutral-800 capitalize">
                          {subscriber.source}
                        </span>
                        <span className="text-neutral-300">•</span>
                        <span className="font-mono text-[11px] font-bold text-neutral-700">
                          {subscriber.discount_code_sent || 'WELCOME10'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(subscriber)}
                          disabled={actionLoadingId === subscriber.id}
                          className="text-[11px] font-semibold text-neutral-700 underline"
                        >
                          {subscriber.status === 'active' ? 'Unsub' : 'Active'}
                        </button>
                        <button
                          onClick={() => handleDelete(subscriber)}
                          disabled={actionLoadingId === subscriber.id}
                          className="text-neutral-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs">
                  <span className="text-neutral-500">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, subscribers.length)} of {subscribers.length}{' '}
                    subscribers
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 bg-white border border-neutral-200 rounded font-semibold text-neutral-700 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-medium text-neutral-600">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 bg-white border border-neutral-200 rounded font-semibold text-neutral-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
