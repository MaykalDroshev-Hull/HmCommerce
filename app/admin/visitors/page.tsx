'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface VisitorAnalytics {
  summary: {
    totalVisitors: number;
    totalSessions: number;
    totalPageViews: number;
    bounceRate: number;
    avgSessionDuration: number;
  };
  topCountries: Array<{ country: string; sessions: number }>;
  deviceTypes: Array<{ device: string; sessions: number }>;
  browsers: Array<{ browser: string; sessions: number }>;
  operatingSystems: Array<{ os: string; sessions: number }>;
  referrerSources: Array<{ referrer: string; sessions: number }>;
}

export default function VisitorsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language || 'en'];
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    document.title = t.visitors || ('Visitors');
  }, [language, t]);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<VisitorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('last7days');

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
      loadAnalytics();
    }
  }, [isAuthenticated, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/visitors?timeRange=${timeRange}`);
      const result = await response.json();
      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}${t.minutes.charAt(0)} ${secs}${t.seconds.charAt(0)}`;
    }
    return `${secs}${t.seconds.charAt(0)}`;
  };

  const getDeviceLabel = (device: string): string => {
    const map: Record<string, string> = {
      'ios': t.ios,
      'android': t.android,
      'windows': t.windows,
      'macos': t.macos,
      'linux': t.linux,
      'other': t.other,
    };
    return map[device.toLowerCase()] || device;
  };

  const getReferrerLabel = (referrer: string): string => {
    const map: Record<string, string> = {
      'direct': t.direct,
      'google': t.google,
      'facebook': t.facebook,
      'other': t.other,
    };
    return map[referrer.toLowerCase()] || referrer;
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
    <AdminLayout currentPath="/admin/visitors">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t.visitors}</h1>
          <p className="text-gray-600 mt-2">{t.viewVisitorAnalytics}</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.today}
          </button>
          <button
            onClick={() => setTimeRange('last7days')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === 'last7days'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.last7Days}
          </button>
          <button
            onClick={() => setTimeRange('last30days')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === 'last30days'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.last30Days}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-500">{t.loadingVisitorData}</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">{t.totalVisitors}</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {analytics.summary.totalVisitors}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">{t.sessions}</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {analytics.summary.totalSessions}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">{t.pageViews}</h3>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {analytics.summary.totalPageViews}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">{t.bounceRate}</h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {analytics.summary.bounceRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">{t.avgSessionDuration}</h3>
                <p className="text-3xl font-bold text-indigo-600 mt-2">
                  {formatDuration(analytics.summary.avgSessionDuration)}
                </p>
              </div>
            </div>

            {/* Top Countries */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.topCountries}</h3>
              <div className="space-y-2">
                {analytics.topCountries.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{item.country}</span>
                    <span className="text-gray-600">{item.sessions} {t.sessions.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Types */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.deviceTypes}</h3>
                <div className="space-y-2">
                  {analytics.deviceTypes.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{getDeviceLabel(item.device)}</span>
                      <span className="text-gray-600">{item.sessions}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Browsers */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.browsers}</h3>
                <div className="space-y-2">
                  {analytics.browsers.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{item.browser}</span>
                      <span className="text-gray-600">{item.sessions}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operating Systems */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.operatingSystems}</h3>
                <div className="space-y-2">
                  {analytics.operatingSystems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{item.os}</span>
                      <span className="text-gray-600">{item.sessions}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referrer Sources */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.referrerSources}</h3>
                <div className="space-y-2">
                  {analytics.referrerSources.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium capitalize">{getReferrerLabel(item.referrer)}</span>
                      <span className="text-gray-600">{item.sessions}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">{t.noVisitorData}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}







