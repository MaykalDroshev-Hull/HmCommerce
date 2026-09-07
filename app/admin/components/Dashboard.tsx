'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Package, ShoppingCart, Users, DollarSign, Eye, Star, EuroIcon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import AdminPage from './layout/AdminPage';
import PageHeader from './layout/PageHeader';
import Card from './layout/Card';
import Section from './layout/Section';
import SectionSurface from './layout/SectionSurface';
import { Badge } from './layout';
import { getOrderStatusVariant } from '@/lib/admin-status-utils';
import { CHART_COLORS, CHART_COLORS_EXTENDED, getCategoryColor } from '@/lib/admin-chart-colors';

type DateFilter = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear';

// Mock data for the dashboard
const mockData = {
  totalSales: 45678.90,
  totalOrders: 1247,
  totalProducts: 89,
  totalCustomers: 3421,
  salesGrowth: 12.5,
  ordersGrowth: 8.3,
  productsGrowth: 15.7,
  customersGrowth: -2.1,
  recentOrders: [
    { id: '#12345', customer: 'John Doe', amount: 299.99, status: 'completed', date: '2024-12-07' },
    { id: '#12344', customer: 'Jane Smith', amount: 149.50, status: 'processing', date: '2024-12-07' },
    { id: '#12343', customer: 'Mike Johnson', amount: 89.99, status: 'shipped', date: '2024-12-06' },
    { id: '#12342', customer: 'Sarah Wilson', amount: 199.99, status: 'completed', date: '2024-12-06' },
  ],
  topProducts: [
    { name: 'Premium Cotton T-Shirt', sales: 145, revenue: 4350.00, growth: 23.5 },
    { name: 'Designer Jeans', sales: 98, revenue: 11760.00, growth: 18.2 },
    { name: 'Running Shoes', sales: 76, revenue: 9120.00, growth: 12.8 },
    { name: 'Leather Jacket', sales: 54, revenue: 12960.00, growth: 8.9 },
    { name: 'Winter Coat', sales: 43, revenue: 7740.00, growth: -5.2 },
  ],
  weeklySales: [
    { day: 'Mon', sales: 1200 },
    { day: 'Tue', sales: 1450 },
    { day: 'Wed', sales: 1100 },
    { day: 'Thu', sales: 1800 },
    { day: 'Fri', sales: 2200 },
    { day: 'Sat', sales: 2800 },
    { day: 'Sun', sales: 1900 },
  ],
  categoryPerformance: [
    { category: 'Clothes', percentage: 45, color: CHART_COLORS.primary },
    { category: 'Shoes', percentage: 30, color: CHART_COLORS.success },
    { category: 'Accessories', percentage: 25, color: CHART_COLORS.warning },
  ]
};

export default function Dashboard() {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const t = translations[language || 'en'];
  const [dateFilter, setDateFilter] = useState<DateFilter>('thisMonth');
  const [dashboardData, setDashboardData] = useState<{
    totalSales: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    salesGrowth: number;
    ordersGrowth: number;
    productsGrowth: number;
    customersGrowth: number;
    weeklySales: Array<{ day: string; sales: number }>;
    productTypePerformance: Array<{ productType: string; percentage: number; orders: number; sales: number; color?: string }>;
    recentOrders: Array<{ id: string; customer: string; amount: number; status: string; date: string }>;
    topProducts: Array<{ name: string; sales: number; revenue: number; growth: number }>;
  }>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    salesGrowth: 0,
    ordersGrowth: 0,
    productsGrowth: 0,
    customersGrowth: 0,
    weeklySales: [
      { day: 'Mon', sales: 0 },
      { day: 'Tue', sales: 0 },
      { day: 'Wed', sales: 0 },
      { day: 'Thu', sales: 0 },
      { day: 'Fri', sales: 0 },
      { day: 'Sat', sales: 0 },
      { day: 'Sun', sales: 0 }
    ],
    productTypePerformance: [],
    recentOrders: [],
    topProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/dashboard?filter=${dateFilter}`);
        const result = await response.json();

        if (result.success && result.data) {
          setDashboardData({
            ...result.data,
            productTypePerformance: result.data.productTypePerformance || [],
            weeklySales: result.data.weeklySales || [
              { day: 'Mon', sales: 0 },
              { day: 'Tue', sales: 0 },
              { day: 'Wed', sales: 0 },
              { day: 'Thu', sales: 0 },
              { day: 'Fri', sales: 0 },
              { day: 'Sat', sales: 0 },
              { day: 'Sun', sales: 0 }
            ],
            recentOrders: result.data.recentOrders || [],
            topProducts: result.data.topProducts || []
          });
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateFilter]);

  const MetricCard = ({ title, value, growth, icon: Icon, prefix = '', suffix = '' }: {
    title: string;
    value: number | string;
    growth: number;
    icon: any;
    prefix?: string;
    suffix?: string;
  }) => (
    <Card
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p
            className="text-xs sm:text-sm font-medium opacity-75 truncate"
            style={{ color: theme.colors.textSecondary }}
          >
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2 truncate">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
        </div>
        <div
          className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2"
          style={{ backgroundColor: theme.colors.secondary }}
        >
          <Icon size={20} className="sm:w-6 sm:h-6" style={{ color: theme.colors.primary }} />
        </div>
      </div>
      <div className="flex items-center mt-3 sm:mt-4 flex-wrap gap-1">
        {growth >= 0 ? (
          <TrendingUp size={14} className="sm:w-4 sm:h-4 text-success" />
        ) : (
          <TrendingDown size={14} className="sm:w-4 sm:h-4 text-danger" />
        )}
        <span
          className={`text-xs sm:text-sm font-medium ${growth >= 0 ? 'text-success' : 'text-danger'}`}
        >
          {growth >= 0 ? '+' : ''}{growth}%
        </span>
        <span
          className="text-xs sm:text-sm opacity-75 ml-1 sm:ml-2"
          style={{ color: theme.colors.textSecondary }}
        >
          {t.fromLastMonth}
        </span>
      </div>
    </Card>
  );

  return (
    <AdminPage className="space-y-6">
      <PageHeader
        title={t.dashboard}
        subtitle={t.welcomeToAdmin}
        actions={
          <div className="w-full sm:w-auto">
            <label
              className="block text-xs sm:text-sm font-medium mb-2"
              style={{ color: theme.colors.text }}
            >
              {'Period'}
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-[auto]"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
            >
              <option value="thisWeek">{'This Week'}</option>
              <option value="lastWeek">{'Last Week'}</option>
              <option value="thisMonth">{'This Month'}</option>
              <option value="lastMonth">{'Last Month'}</option>
              <option value="thisYear">{'This Year'}</option>
              <option value="lastYear">{'Last Year'}</option>
            </select>
          </div>
        }
      />

      {/* Key Metrics */}
      <Section
        title={'Key Metrics'}
        description={'Overview of sales and activity'}
      >
        <SectionSurface tone="soft" padding="md">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card
                  key={i}
                  className="animate-pulse"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border
                  }}
                >
                  <div className="h-3 sm:h-4 bg-gray-300 rounded w-3/4 mb-3 sm:mb-4"></div>
                  <div className="h-6 sm:h-8 bg-gray-300 rounded w-1/2"></div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <MetricCard
            title={t.totalSales}
            value={dashboardData.totalSales}
            growth={dashboardData.salesGrowth}
            icon={EuroIcon}
            suffix="€"
          />
          <MetricCard
            title={t.totalOrders}
            value={dashboardData.totalOrders}
            growth={dashboardData.ordersGrowth}
            icon={ShoppingCart}
          />
          <MetricCard
            title={t.products}
            value={dashboardData.totalProducts}
            growth={dashboardData.productsGrowth}
            icon={Package}
          />
          <MetricCard
            title={t.customers}
            value={dashboardData.totalCustomers}
            growth={dashboardData.customersGrowth}
            icon={Users}
          />
            </div>
          )}
        </SectionSurface>
      </Section>

      {/* Charts and Analytics */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Orders Chart */}
          <Card
            className="overflow-x-auto"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
            {'Orders Last Week'}
          </h3>
          <div className="h-48 sm:h-56 lg:h-64 flex items-end justify-between gap-1 sm:gap-2 min-w-[280px]">
            {dashboardData.weeklySales.map((day, index) => {
              const maxOrders = Math.max(...dashboardData.weeklySales.map(d => d.sales), 1);
              const heightPercentage = maxOrders > 0 ? (day.sales / maxOrders) * 100 : 0;
              
              return (
                <div key={day.day} className="flex flex-col items-center flex-1 min-w-[32px] sm:min-w-[40px]">
                  <div
                    className="w-full bg-blue-500 rounded-t mb-1 sm:mb-2 transition-all hover:bg-blue-600 relative group"
                    style={{
                      height: `${heightPercentage}%`,
                      minHeight: day.sales > 0 ? '16px' : '4px'
                    }}
                    title={`${day.sales} ${'orders'}`}
                  >
                    {day.sales > 0 && (
                      <span className="absolute -top-5 sm:-top-6 left-1/2 transform -translate-x-1/2 text-[10px] sm:text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {day.sales}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[10px] sm:text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
          </Card>

          {/* Product Type Performance */}
          <Card
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
            {'Orders by Category'}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {dashboardData.productTypePerformance && dashboardData.productTypePerformance.length > 0 ? (
              dashboardData.productTypePerformance.map((productType, index) => {
                const color = productType.color || getCategoryColor(productType.productType, index);
                return (
                  <div key={productType.productType}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 mb-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="text-xs sm:text-sm font-medium">{productType.productType}</span>
                        <span
                          className="text-[10px] sm:text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          ({productType.orders} {'orders'})
                        </span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xs sm:text-sm font-medium">{productType.percentage}%</span>
                        <span
                          className="text-[10px] sm:text-xs ml-1 sm:block"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          €{productType.sales.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                      <div
                        className={`h-1.5 sm:h-2 rounded-full ${color}`}
                        style={{ width: `${productType.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className="text-center py-6 sm:py-8 text-xs sm:text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {'No product type data available'}
              </div>
            )}
          </div>
          </Card>
        </div>
      </Section>

      {/* Recent Orders and Top Products */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
            {t.recentOrders}
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                  ></div>
                ))}
              </div>
            ) : dashboardData.recentOrders.length > 0 ? (
              dashboardData.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-2.5 sm:p-3 rounded border"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{order.id}</p>
                    <p
                      className="text-xs sm:text-sm truncate"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {order.customer}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-start gap-2">
                    <p className="font-medium text-sm sm:text-base">€{order.amount.toFixed(2)}</p>
                    <Badge variant={getOrderStatusVariant(order.status)} className="text-[10px] sm:text-xs">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div
                className="text-center py-6 sm:py-8 text-xs sm:text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {'No orders yet'}
              </div>
            )}
          </div>
          </Card>

          {/* Top Products */}
          <Card
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
            {t.topProducts}
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                  ></div>
                ))}
              </div>
            ) : dashboardData.topProducts.length > 0 ? (
              dashboardData.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded border"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border
                  }}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: theme.colors.secondary }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{product.name}</p>
                      <p
                        className="text-[10px] sm:text-xs"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {product.sales} {t.sales}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-xs sm:text-sm">€{product.revenue.toFixed(2)}</p>
                    {product.growth !== 0 && (
                      <div className="flex items-center justify-end mt-0.5">
                        {product.growth >= 0 ? (
                          <TrendingUp size={10} className="sm:w-3 sm:h-3 text-green-500 mr-0.5 sm:mr-1" />
                        ) : (
                          <TrendingDown size={10} className="sm:w-3 sm:h-3 text-danger mr-0.5 sm:mr-1" />
                        )}
                        <span
                          className={`text-[10px] sm:text-xs ${product.growth >= 0 ? 'text-success' : 'text-danger'}`}
                        >
                          {product.growth >= 0 ? '+' : ''}{product.growth}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div
                className="text-center py-6 sm:py-8 text-xs sm:text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {'No sales yet'}
              </div>
            )}
          </div>
          </Card>
        </div>
      </Section>
    </AdminPage>
  );
}



