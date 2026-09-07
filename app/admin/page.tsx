'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from './components/Dashboard';
import AdminLayout from './components/AdminLayout';
import { getAdminSession, isAdminAuthenticated } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    document.title = t.dashboard || ('Dashboard');
  }, [language, t]);

  useEffect(() => {
    // Check if user is authenticated with Supabase session
    const checkAuth = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      try {
        // Check Supabase session
        const session = await getAdminSession();
        
        if (!session) {
          // Clear any stale localStorage data
          localStorage.removeItem('admin_authenticated');
          localStorage.removeItem('admin_access_token');
          localStorage.removeItem('admin_refresh_token');
          router.push('/admin/login');
          return;
        }

        // User is authenticated
        setIsAuthenticated(true);
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('admin_user_email', session.user.email || '');
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        localStorage.removeItem('admin_authenticated');
        router.push('/admin/login');
      } else if (event === 'SIGNED_IN' && session) {
        // Verify admin access
        const canAccess = session.user.user_metadata?.can_access || ['admin'];
        if (!canAccess.includes('admin')) {
          supabase.auth.signOut();
          router.push('/admin/login');
        } else {
          setIsAuthenticated(true);
          localStorage.setItem('admin_authenticated', 'true');
        }
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

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
    <AdminLayout currentPath="/admin">
      <Dashboard />
    </AdminLayout>
  );
}

