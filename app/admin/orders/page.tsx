'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { translations } from '@/lib/translations';
import { Package, Check, Truck, X, Eye, ArrowUpDown } from 'lucide-react';

interface OrderItem {
  OrderItemID: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
    brand?: string;
    model?: string;
    color?: string;
    size?: string;
  };
}

interface Order {
  orderid: string;
  customerfirstname?: string;
  customerlastname?: string;
  customeremail?: string;
  customertelephone?: string;
  customercity?: string;
  customercountry?: string;
  deliverytype: string;
  subtotal: number;
  deliverycost: number;
  total: number;
  status: string;
  createdat: string;
  updatedat: string;
  order_items?: OrderItem[];
}

export default function OrdersPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const t = translations[language || 'en'];
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

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
      loadOrders();
    }
  }, [isAuthenticated, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      const result = await response.json();
      if (result.success) {
        let filteredOrders = result.orders || [];
        if (statusFilter !== 'all') {
          filteredOrders = filteredOrders.filter((order: Order) => order.status === statusFilter);
        }
        setOrders(filteredOrders);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(orderId);
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (result.success) {
        // Reload orders to get updated data
        await loadOrders();
        if (selectedOrder && selectedOrder.orderid === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      } else {
        alert(result.error || 'Failed to update order status');
      }
    } catch (error) {
      alert('Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <Check size={16} />;
      case 'shipped':
        return <Truck size={16} />;
      case 'cancelled':
        return <X size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  return (
    <AdminLayout currentPath="/admin/orders">
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: theme.colors.text }}
          >
            {'Orders'}
          </h1>
          <p
            className="mt-1 sm:mt-2 text-sm sm:text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            {'Manage and view all orders'}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div
            className="p-4 sm:p-5 lg:p-6 rounded-lg shadow-sm border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
            <p className="text-xs sm:text-sm font-medium opacity-75" style={{ color: theme.colors.textSecondary }}>
              {'Total Orders'}
            </p>
            <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2">{orders.length}</p>
          </div>
          <div
            className="p-4 sm:p-5 lg:p-6 rounded-lg shadow-sm border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
            <p className="text-xs sm:text-sm font-medium opacity-75" style={{ color: theme.colors.textSecondary }}>
              {'Pending'}
            </p>
            <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2">{pendingOrders}</p>
          </div>
          <div
            className="p-4 sm:p-5 lg:p-6 rounded-lg shadow-sm border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
            <p className="text-xs sm:text-sm font-medium opacity-75" style={{ color: theme.colors.textSecondary }}>
              {'Shipped'}
            </p>
            <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2">{shippedOrders}</p>
          </div>
          <div
            className="p-4 sm:p-5 lg:p-6 rounded-lg shadow-sm border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
            <p className="text-xs sm:text-sm font-medium opacity-75" style={{ color: theme.colors.textSecondary }}>
              {'Total Revenue'}
            </p>
            <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2">€{totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: statusFilter === 'all' ? theme.colors.primary : theme.colors.surface,
              color: statusFilter === 'all' ? '#ffffff' : theme.colors.text,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            {'All'}
          </button>
          {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: statusFilter === status ? theme.colors.primary : theme.colors.surface,
                color: statusFilter === status ? '#ffffff' : theme.colors.text,
                border: `1px solid ${theme.colors.border}`
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div
          className="rounded-lg shadow-sm border overflow-x-auto"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }}
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.colors.textSecondary }}>
              {'No orders found'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: theme.colors.border }}
                >
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: theme.colors.textSecondary }}>
                    {'Order ID'}
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: theme.colors.textSecondary }}>
                    {'Customer'}
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: theme.colors.textSecondary }}>
                    {'Status'}
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: theme.colors.textSecondary }}>
                    {'Total'}
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: theme.colors.textSecondary }}>
                    {'Date'}
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: theme.colors.textSecondary }}>
                    {'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.orderid}
                    className="border-b hover:bg-opacity-50 transition-colors"
                    style={{
                      borderColor: theme.colors.border,
                      backgroundColor: selectedOrder?.orderid === order.orderid ? theme.colors.secondary : 'transparent'
                    }}
                  >
                    <td className="px-4 lg:px-6 py-4 text-sm font-medium" style={{ color: theme.colors.text }}>
                      {order.orderid}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm" style={{ color: theme.colors.text }}>
                      <div>
                        <div className="font-medium">
                          {order.customerfirstname} {order.customerlastname}
                        </div>
                        <div className="text-xs opacity-75" style={{ color: theme.colors.textSecondary }}>
                          {order.customeremail}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                        {updatingStatus === order.orderid && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm font-medium" style={{ color: theme.colors.text }}>
                      €{order.total.toFixed(2)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm" style={{ color: theme.colors.textSecondary }}>
                      {formatDate(order.createdat)}
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedOrder(selectedOrder?.orderid === order.orderid ? null : order)}
                          className="p-2 rounded transition-colors"
                          style={{
                            color: theme.colors.primary,
                            backgroundColor: selectedOrder?.orderid === order.orderid ? theme.colors.secondary : 'transparent'
                          }}
                          title={'View details'}
                        >
                          <Eye size={16} />
                        </button>
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.orderid, e.target.value)}
                          disabled={updatingStatus === order.orderid}
                          className="px-2 py-1 rounded text-xs border"
                          style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            color: theme.colors.text
                          }}
                        >
                          <option value="pending">{'Pending'}</option>
                          <option value="confirmed">{'Confirmed'}</option>
                          <option value="shipped">{'Shipped'}</option>
                          <option value="delivered">{'Delivered'}</option>
                          <option value="cancelled">{'Cancelled'}</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text
              }}
            >
              <div className="p-4 sm:p-6 border-b flex items-center justify-between" style={{ borderColor: theme.colors.border }}>
                <h2 className="text-xl font-bold">
                  {'Order Details'} - {selectedOrder.orderid}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded transition-colors"
                  style={{ color: theme.colors.textSecondary }}
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: theme.colors.text }}>
                    {'Customer Information'}
                  </h3>
                  <div className="space-y-1 text-sm" style={{ color: theme.colors.textSecondary }}>
                    <p><strong>{'Name:'}</strong> {selectedOrder.customerfirstname} {selectedOrder.customerlastname}</p>
                    <p><strong>{'Email:'}</strong> {selectedOrder.customeremail}</p>
                    <p><strong>{'Phone:'}</strong> {selectedOrder.customertelephone}</p>
                    <p><strong>{'City:'}</strong> {selectedOrder.customercity}</p>
                    <p><strong>{'Country:'}</strong> {selectedOrder.customercountry}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: theme.colors.text }}>
                    {'Order Items'}
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.order_items?.map((item) => (
                      <div
                        key={item.OrderItemID}
                        className="p-3 rounded border"
                        style={{
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
                            {item.product?.brand && (
                              <p className="text-sm opacity-75">
                                {item.product.brand} {item.product.model}
                                {item.product.color && ` • ${item.product.color}`}
                                {item.product.size && ` • ${item.product.size}`}
                              </p>
                            )}
                            <p className="text-sm opacity-75">
                              {'Quantity:'} {item.quantity}
                            </p>
                          </div>
                          <p className="font-medium">€{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div
                  className="p-4 rounded border"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: theme.colors.textSecondary }}>
                        {'Subtotal:'}
                      </span>
                      <span style={{ color: theme.colors.text }}>€{selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: theme.colors.textSecondary }}>
                        {'Delivery:'}
                      </span>
                      <span style={{ color: theme.colors.text }}>€{selectedOrder.deliverycost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ borderColor: theme.colors.border }}>
                      <span style={{ color: theme.colors.text }}>
                        {'Total:'}
                      </span>
                      <span style={{ color: theme.colors.primary }}>€{selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
