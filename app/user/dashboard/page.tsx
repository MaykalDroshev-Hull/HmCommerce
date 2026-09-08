'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Package,
  Lock,
  Edit3,
  LogOut,
  RefreshCw,
  Truck,
  MapPin,
  X,
  Heart,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import PublicPageLayout from '@/components/PublicPageLayout';
import ProductCard from '@/components/ProductCard';
import type { CityOption } from '@/store/checkoutStore';
import type { EcontOfficesData, EcontOffice } from '@/types/econt';
import { Product } from '@/lib/data';

// Helper for status badge styling
const getStatusBadgeClass = (status: string): string => {
  const s = status.toLowerCase();
  if (s === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'shipped') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s === 'confirmed' || s === 'processing') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-neutral-100 text-neutral-700 border-neutral-200';
};

// Favourites List Component
function FavoritesList({ userId, language }: { userId: string; language: string }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const t = translations[language as 'en' | 'bg'];

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/favorites?userId=${userId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch favourites');
        }

        if (data.success && data.productIds) {
          const productsResponse = await fetch('/api/products');
          const productsData = await productsResponse.json();

          if (productsData.success && productsData.products) {
            const favoriteProducts = productsData.products.filter((p: Product) =>
              data.productIds.includes(p.id || p.productid)
            );
            setFavorites(favoriteProducts);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error loading favourites');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchFavorites();
    }
  }, [userId, language]);

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-900 border-t-transparent mx-auto mb-3" />
        <p className="text-xs text-neutral-500">Loading your favourites...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs text-red-600">{error}</p>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-10 sm:p-14 text-center">
        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <Heart size={22} />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-neutral-950 mb-1">
          {t.favoritesEmpty || 'No favourites yet'}
        </h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6 font-light">
          {t.noFavoritesYet || "You haven't saved any items yet. Tap the heart on products you love to keep track of them here."}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold tracking-wide transition-colors shadow-2xs"
        >
          Explore Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
      {favorites.map((product) => (
        <ProductCard key={product.id || product.productid} product={product} />
      ))}
    </div>
  );
}

interface Order {
  orderId: string;
  orderDate: string;
  totalAmount: number;
  discountAmount: number;
  deliveryCost: number;
  status: string;
  deliveryType: string;
  deliveryNotes?: string;
  items: Array<{
    productId: number;
    variantId: number | null;
    name: string;
    sku: string;
    properties?: Record<string, string>;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout, updateUser } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'profile'>('orders');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Delivery preferences states
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    preferredDeliveryType: 'office' as 'office' | 'address' | 'econtomat',
    preferredEcontOfficeId: '',
    preferredCity: '',
    preferredStreet: '',
    preferredStreetNumber: '',
    preferredEntrance: '',
    preferredFloor: '',
    preferredApartment: '',
  });
  const [cities, setCities] = useState<CityOption[]>([]);
  const [econtOffices, setEcontOffices] = useState<EcontOfficesData | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<EcontOffice | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Check admin state
  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/user');
    }
  }, [isAuthenticated, authLoading, router]);

  // Check for tab query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab === 'favorites') {
        setActiveTab('favorites');
      }
    }
  }, []);

  // Initialize profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      setDeliveryData({
        preferredDeliveryType: (user.preferredDeliveryType as 'office' | 'address' | 'econtomat') || 'office',
        preferredEcontOfficeId: user.preferredEcontOfficeId || '',
        preferredCity: user.preferredCity || '',
        preferredStreet: user.preferredStreet || '',
        preferredStreetNumber: user.preferredStreetNumber || '',
        preferredEntrance: user.preferredEntrance || '',
        preferredFloor: user.preferredFloor || '',
        preferredApartment: user.preferredApartment || '',
      });
    }
  }, [user]);

  // Fetch user data on mount
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchUserData();
      loadCities();
      loadEcontOffices();
    }
  }, [user, isAuthenticated]);

  // Load cities data
  const loadCities = async () => {
    const ukCities: CityOption[] = [
      { name: 'London', postcode: 'EC1A', displayName: 'London [EC1A]' },
      { name: 'Manchester', postcode: 'M1', displayName: 'Manchester [M1]' },
      { name: 'Birmingham', postcode: 'B1', displayName: 'Birmingham [B1]' },
      { name: 'Leeds', postcode: 'LS1', displayName: 'Leeds [LS1]' },
      { name: 'Glasgow', postcode: 'G1', displayName: 'Glasgow [G1]' },
      { name: 'Liverpool', postcode: 'L1', displayName: 'Liverpool [L1]' },
      { name: 'Newcastle', postcode: 'NE1', displayName: 'Newcastle [NE1]' },
      { name: 'Sheffield', postcode: 'S1', displayName: 'Sheffield [S1]' },
      { name: 'Bristol', postcode: 'BS1', displayName: 'Bristol [BS1]' },
      { name: 'Belfast', postcode: 'BT1', displayName: 'Belfast [BT1]' },
      { name: 'Edinburgh', postcode: 'EH1', displayName: 'Edinburgh [EH1]' },
      { name: 'Cardiff', postcode: 'CF10', displayName: 'Cardiff [CF10]' },
      { name: 'Leicester', postcode: 'LE1', displayName: 'Leicester [LE1]' },
      { name: 'Coventry', postcode: 'CV1', displayName: 'Coventry [CV1]' },
      { name: 'Bradford', postcode: 'BD1', displayName: 'Bradford [BD1]' },
      { name: 'Nottingham', postcode: 'NG1', displayName: 'Nottingham [NG1]' },
      { name: 'Hull', postcode: 'HU1', displayName: 'Hull [HU1]' },
      { name: 'Stoke-on-Trent', postcode: 'ST1', displayName: 'Stoke-on-Trent [ST1]' },
      { name: 'Wolverhampton', postcode: 'WV1', displayName: 'Wolverhampton [WV1]' },
      { name: 'Plymouth', postcode: 'PL1', displayName: 'Plymouth [PL1]' },
      { name: 'Southampton', postcode: 'SO14', displayName: 'Southampton [SO14]' },
      { name: 'Reading', postcode: 'RG1', displayName: 'Reading [RG1]' },
      { name: 'Derby', postcode: 'DE1', displayName: 'Derby [DE1]' },
      { name: 'Dudley', postcode: 'DY1', displayName: 'Dudley [DY1]' },
      { name: 'Northampton', postcode: 'NN1', displayName: 'Northampton [NN1]' },
      { name: 'Portsmouth', postcode: 'PO1', displayName: 'Portsmouth [PO1]' },
      { name: 'Luton', postcode: 'LU1', displayName: 'Luton [LU1]' },
      { name: 'Preston', postcode: 'PR1', displayName: 'Preston [PR1]' },
      { name: 'Aberdeen', postcode: 'AB10', displayName: 'Aberdeen [AB10]' },
      { name: 'Milton Keynes', postcode: 'MK9', displayName: 'Milton Keynes [MK9]' },
      { name: 'Norwich', postcode: 'NR1', displayName: 'Norwich [NR1]' },
      { name: 'Bournemouth', postcode: 'BH1', displayName: 'Bournemouth [BH1]' },
    ];
    setCities(ukCities);
  };

  // Load Econt offices data
  const loadEcontOffices = async () => {
    try {
      const response = await fetch('/data/econt-offices.json');
      const data: EcontOfficesData = await response.json();
      setEcontOffices(data);
    } catch {
      // Econt offices are optional; delivery UI falls back gracefully
    }
  };

  // Update selected office when city or office ID changes
  useEffect(() => {
    if (econtOffices && deliveryData.preferredCity && deliveryData.preferredEcontOfficeId) {
      let cityName = deliveryData.preferredCity;
      const displayNameMatch = cityName.match(/^(.+?)\s*\[/);
      if (displayNameMatch) {
        cityName = displayNameMatch[1].trim();
      }

      let cityOffices = econtOffices.officesByCity[cityName] || [];

      if (cityOffices.length === 0) {
        const matchingCity = econtOffices.cities.find(
          (c) =>
            c.toLowerCase() === cityName.toLowerCase() ||
            c.toLowerCase().includes(cityName.toLowerCase()) ||
            cityName.toLowerCase().includes(c.toLowerCase())
        );
        if (matchingCity) {
          cityOffices = econtOffices.officesByCity[matchingCity] || [];
        }
      }

      const office = cityOffices.find((o) => o.id === deliveryData.preferredEcontOfficeId);
      setSelectedOffice(office || null);
    } else {
      setSelectedOffice(null);
    }
  }, [econtOffices, deliveryData.preferredCity, deliveryData.preferredEcontOfficeId]);

  const handleCityChange = (city: string) => {
    setDeliveryData((prev) => ({ ...prev, preferredCity: city, preferredEcontOfficeId: '' }));
    setSelectedOffice(null);
    setShowCityDropdown(false);
  };

  const handleOfficeSelect = (officeId: string) => {
    setDeliveryData((prev) => ({ ...prev, preferredEcontOfficeId: officeId }));
    if (econtOffices && deliveryData.preferredCity) {
      const cityOffices = econtOffices.officesByCity[deliveryData.preferredCity] || [];
      const office = cityOffices.find((o) => o.id === officeId);
      setSelectedOffice(office || null);
    }
  };

  // Close city dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUserData = async () => {
    if (!user) return;
    try {
      const ordersResponse = await fetch(`/api/user/orders?userId=${user.id}`);
      const ordersData = await ordersResponse.json();

      if (ordersResponse.ok) {
        const sortedOrders = (ordersData.orders || []).sort(
          (a: Order, b: Order) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
        );
        setOrders(sortedOrders);
      } else {
        setError(ordersData.error || 'Error loading orders');
      }
    } catch {
      setError('Error loading orders');
    }
  };

  const handleRefreshOrders = async () => {
    if (!user) return;
    try {
      setIsRefreshing(true);
      await fetchUserData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setSelectedOrder(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Logout continues locally even if API fails
    } finally {
      logout();
      router.push('/user');
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setError('');
    setSuccess('');
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error updating profile');
      }

      setSuccess('Profile updated successfully!');
      setIsEditingProfile(false);

      updateUser({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
      });
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeliveryUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          preferredDeliveryType: deliveryData.preferredDeliveryType,
          preferredEcontOfficeId: deliveryData.preferredEcontOfficeId || null,
          preferredCity: deliveryData.preferredCity || null,
          preferredStreet: deliveryData.preferredStreet || null,
          preferredStreetNumber: deliveryData.preferredStreetNumber || null,
          preferredEntrance: deliveryData.preferredEntrance || null,
          preferredFloor: deliveryData.preferredFloor || null,
          preferredApartment: deliveryData.preferredApartment || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error updating preferences');
      }

      setSuccess('Delivery preferences updated successfully!');
      setIsEditingDelivery(false);

      updateUser({
        preferredDeliveryType: deliveryData.preferredDeliveryType,
        preferredEcontOfficeId: deliveryData.preferredEcontOfficeId || undefined,
        preferredCity: deliveryData.preferredCity || undefined,
        preferredStreet: deliveryData.preferredStreet || undefined,
        preferredStreetNumber: deliveryData.preferredStreetNumber || undefined,
        preferredEntrance: deliveryData.preferredEntrance || undefined,
        preferredFloor: deliveryData.preferredFloor || undefined,
        preferredApartment: deliveryData.preferredApartment || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Error updating preferences');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsUpdating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error changing password');
      }

      setSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Error changing password');
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading) {
    return (
      <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-900 border-t-transparent mx-auto mb-3" />
            <p className="text-xs text-neutral-500">Loading your account...</p>
          </div>
        </div>
      </PublicPageLayout>
    );
  }

  if (!user || !isAuthenticated) {
    return null;
  }

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="min-h-[calc(100vh-140px)] bg-neutral-50/60 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* User Header Profile Card */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-neutral-950 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-2xs">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 mb-0.5">
                  Pet Parent Account
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-950 tracking-tight truncate">
                  Welcome back, {user.name}!
                </h1>
                <p className="text-xs text-neutral-600 font-light truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-950 border border-neutral-200/90 rounded-lg transition-colors shadow-2xs"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-neutral-200/80 flex items-center gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-neutral-950 text-neutral-950'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Package size={16} />
              <span>Orders ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-2 pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'favorites'
                  ? 'border-neutral-950 text-neutral-950'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Heart size={16} />
              <span>{t.myFavorites || 'Favourites'}</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-neutral-950 text-neutral-950'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <User size={16} />
              <span>Account & Delivery Details</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">Order History</h2>
                  <p className="text-xs text-neutral-500">Track and view previous purchases for your pets.</p>
                </div>
                <button
                  onClick={handleRefreshOrders}
                  disabled={isRefreshing}
                  className="p-2 text-neutral-500 hover:text-neutral-900 border border-neutral-200/80 rounded-lg hover:bg-neutral-50 transition-colors shadow-2xs"
                  title="Refresh orders"
                >
                  <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </div>

              {orders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orders.map((order) => (
                    <div
                      key={order.orderId}
                      onClick={() => handleOrderClick(order)}
                      className="bg-white border border-neutral-200/80 hover:border-neutral-400 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                              Order Reference
                            </span>
                            <h3 className="text-sm sm:text-base font-bold text-neutral-950 tracking-tight">
                              #{order.orderId}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {new Date(order.orderDate).toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                                order.status
                              )}`}
                            >
                              {translateStatus(order.status)}
                            </span>
                            <p className="text-base font-bold text-neutral-950 mt-1">
                              £{order.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Items preview */}
                        <div className="border-t border-neutral-100 pt-3 mt-3 space-y-1.5">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-neutral-600">
                              <span className="truncate pr-2 font-medium text-neutral-800">{item.name}</span>
                              <span className="shrink-0 text-neutral-500">
                                {item.quantity}x £{item.price.toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-[11px] font-medium text-neutral-400 pt-0.5">
                              +{order.items.length - 2} more {order.items.length - 2 === 1 ? 'item' : 'items'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-900">
                        <span>View Order Details</span>
                        <ChevronRight size={14} className="text-neutral-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-10 sm:p-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                    <Package size={22} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950 mb-1">No orders yet</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6 font-light">
                    Your furbaby's treats, harnesses, and accessories will appear here once you make your first order.
                  </p>
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold tracking-wide transition-colors shadow-2xs"
                  >
                    Browse Products
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* FAVOURITES TAB */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">Saved Favourites</h2>
                <p className="text-xs text-neutral-500">All the gear and goodies your pet has their paws on.</p>
              </div>
              <FavoritesList userId={user.id} language={language} />
            </div>
          )}

          {/* PROFILE / SETTINGS TAB */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Details */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
                      <User size={16} />
                    </div>
                    <h2 className="text-base font-bold text-neutral-950">Personal Details</h2>
                  </div>
                  {!isEditingProfile && (
                    <button
                      onClick={handleEditProfile}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-950 border border-neutral-200/80 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {!isEditingProfile ? (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                        Full Name
                      </span>
                      <p className="text-neutral-900 font-medium">{user.name}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                        Email Address
                      </span>
                      <p className="text-neutral-900 font-medium">{user.email}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                        Phone Number
                      </span>
                      <p className="text-neutral-900 font-medium">{user.phone || 'Not provided'}</p>
                    </div>
                    {user.created_at && (
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Member Since
                        </span>
                        <p className="text-neutral-900 font-medium">
                          {new Date(user.created_at).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={profileData.name}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={profileData.email}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={profileData.phone}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="07123 456789 or +44 7123 456789"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200/90 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Delivery Preferences */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
                      <Truck size={16} />
                    </div>
                    <h2 className="text-base font-bold text-neutral-950">Delivery Preferences</h2>
                  </div>
                  {!isEditingDelivery && (
                    <button
                      onClick={() => setIsEditingDelivery(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-950 border border-neutral-200/80 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {!isEditingDelivery ? (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                        Delivery Method
                      </span>
                      <p className="text-neutral-900 font-medium capitalize">
                        {deliveryData.preferredDeliveryType === 'address'
                          ? 'Courier to Door / Address'
                          : deliveryData.preferredDeliveryType === 'office'
                          ? 'Collection Office'
                          : 'Parcel Locker'}
                      </p>
                    </div>
                    {deliveryData.preferredCity && (
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Town / City
                        </span>
                        <p className="text-neutral-900 font-medium">{deliveryData.preferredCity}</p>
                      </div>
                    )}
                    {deliveryData.preferredDeliveryType === 'office' && selectedOffice && (
                      <>
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                            Office Location
                          </span>
                          <p className="text-neutral-900 font-medium">{selectedOffice.name}</p>
                          <p className="text-neutral-500 text-[11px] mt-0.5">{selectedOffice.address}</p>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                            Working Hours
                          </span>
                          <p className="text-neutral-700">{selectedOffice.workingHours}</p>
                        </div>
                      </>
                    )}
                    {deliveryData.preferredDeliveryType === 'address' && (
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Address Line
                        </span>
                        <p className="text-neutral-900 font-medium">
                          {[
                            deliveryData.preferredStreet,
                            deliveryData.preferredStreetNumber,
                            deliveryData.preferredEntrance ? `Ent ${deliveryData.preferredEntrance}` : '',
                            deliveryData.preferredFloor ? `Fl ${deliveryData.preferredFloor}` : '',
                            deliveryData.preferredApartment ? `Apt ${deliveryData.preferredApartment}` : '',
                          ]
                            .filter(Boolean)
                            .join(', ') || 'No address specified'}
                        </p>
                      </div>
                    )}
                    {!deliveryData.preferredCity && !deliveryData.preferredStreet && (
                      <p className="text-neutral-400 italic">No delivery preferences saved yet.</p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleDeliveryUpdate} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Delivery Method
                      </label>
                      <select
                        value={deliveryData.preferredDeliveryType}
                        onChange={(e) => {
                          const newType = e.target.value as 'office' | 'address' | 'econtomat';
                          setDeliveryData((prev) => ({
                            ...prev,
                            preferredDeliveryType: newType,
                            preferredEcontOfficeId: newType !== 'office' ? '' : prev.preferredEcontOfficeId,
                          }));
                        }}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                      >
                        <option value="office">Collection Office</option>
                        <option value="address">Courier to Address</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                        City / Town
                      </label>
                      <div className="relative" ref={cityDropdownRef}>
                        <input
                          type="text"
                          value={deliveryData.preferredCity}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDeliveryData((prev) => ({
                              ...prev,
                              preferredCity: value,
                              preferredEcontOfficeId: '',
                            }));
                            setShowCityDropdown(true);
                            setSelectedOffice(null);
                          }}
                          onFocus={() => setShowCityDropdown(true)}
                          placeholder="Search UK City (e.g. London, Manchester)"
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                        />
                        {showCityDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                            {deliveryData.preferredDeliveryType === 'office' && econtOffices
                              ? econtOffices.cities
                                  .filter((city) =>
                                    city.toLowerCase().includes((deliveryData.preferredCity || '').toLowerCase())
                                  )
                                  .map((city) => (
                                    <button
                                      key={city}
                                      type="button"
                                      onClick={() => handleCityChange(city)}
                                      className="w-full text-left px-3.5 py-2 text-xs hover:bg-neutral-50 focus:bg-neutral-50 transition-colors"
                                    >
                                      {city}
                                    </button>
                                  ))
                              : cities
                                  .filter(
                                    (city) =>
                                      city.name
                                        .toLowerCase()
                                        .includes((deliveryData.preferredCity || '').toLowerCase()) ||
                                      city.displayName
                                        .toLowerCase()
                                        .includes((deliveryData.preferredCity || '').toLowerCase()) ||
                                      city.postcode.includes(deliveryData.preferredCity || '')
                                  )
                                  .map((city) => (
                                    <button
                                      key={city.displayName}
                                      type="button"
                                      onClick={() => handleCityChange(city.displayName)}
                                      className="w-full text-left px-3.5 py-2 text-xs hover:bg-neutral-50 focus:bg-neutral-50 transition-colors"
                                    >
                                      {city.displayName}
                                    </button>
                                  ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {deliveryData.preferredDeliveryType === 'office' &&
                      deliveryData.preferredCity &&
                      econtOffices && (
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                            Select Office
                          </label>
                          <select
                            value={deliveryData.preferredEcontOfficeId || ''}
                            onChange={(e) => handleOfficeSelect(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                          >
                            <option value="">Select an office</option>
                            {(econtOffices.officesByCity[deliveryData.preferredCity] || []).map((office) => (
                              <option key={office.id} value={office.id}>
                                {office.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                    {deliveryData.preferredDeliveryType === 'address' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                            Street Name
                          </label>
                          <input
                            type="text"
                            value={deliveryData.preferredStreet}
                            onChange={(e) =>
                              setDeliveryData((prev) => ({ ...prev, preferredStreet: e.target.value }))
                            }
                            placeholder="e.g. Baker Street"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                            Number / House
                          </label>
                          <input
                            type="text"
                            value={deliveryData.preferredStreetNumber}
                            onChange={(e) =>
                              setDeliveryData((prev) => ({ ...prev, preferredStreetNumber: e.target.value }))
                            }
                            placeholder="e.g. 221B"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                            Flat / Apartment
                          </label>
                          <input
                            type="text"
                            value={deliveryData.preferredApartment}
                            onChange={(e) =>
                              setDeliveryData((prev) => ({ ...prev, preferredApartment: e.target.value }))
                            }
                            placeholder="e.g. Flat 3"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingDelivery(false)}
                        disabled={isUpdating}
                        className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200/90 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {isUpdating ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Password & Security */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-xs lg:col-span-2">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-neutral-950">Security & Password</h2>
                    <p className="text-xs text-neutral-500 font-light">Update your password to keep your account safe.</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="max-w-xl space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                        placeholder="At least 8 characters"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        placeholder="Re-enter new password"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors shadow-2xs disabled:opacity-60"
                    >
                      {isUpdating ? 'Updating Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-2xl bg-white border border-neutral-200/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Order Details
                </p>
                <h2 className="text-lg font-bold text-neutral-950 tracking-tight">
                  Order #{selectedOrder.orderId}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[calc(80vh-140px)] overflow-y-auto">
              {/* Order Status & Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-neutral-50/80 border border-neutral-200/60 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Date Placed
                  </span>
                  <p className="font-semibold text-neutral-900">
                    {new Date(selectedOrder.orderDate).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Order Status
                  </span>
                  <span
                    className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                      selectedOrder.status
                    )}`}
                  >
                    {translateStatus(selectedOrder.status)}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Delivery Type
                  </span>
                  <p className="font-semibold text-neutral-900 capitalize">
                    {selectedOrder.deliveryType === 'office'
                      ? 'Collection Office'
                      : selectedOrder.deliveryType === 'address'
                      ? 'Courier to Door'
                      : 'Parcel Locker'}
                  </p>
                </div>
                {selectedOrder.deliveryNotes && (
                  <div className="col-span-2 sm:col-span-3 pt-2 border-t border-neutral-200/60">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Delivery Instructions
                    </span>
                    <p className="text-neutral-700">{selectedOrder.deliveryNotes}</p>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Purchased Items ({selectedOrder.items.length})
                </h3>
                <div className="divide-y divide-neutral-100 border-y border-neutral-100">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="py-3 flex items-start justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900">{item.name}</p>
                        {item.properties && Object.keys(item.properties).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {Object.entries(item.properties).map(([propName, propValue]) => (
                              <span
                                key={propName}
                                className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-medium"
                              >
                                {propName}: {propValue}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-neutral-400 text-[11px] mt-1">
                          Qty: {item.quantity} × £{item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-neutral-950">£{item.totalPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-neutral-50/80 border border-neutral-200/60 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span>
                    £
                    {(
                      selectedOrder.totalAmount -
                      selectedOrder.deliveryCost -
                      (selectedOrder.discountAmount || 0)
                    ).toFixed(2)}
                  </span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-£{selectedOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>Delivery</span>
                  <span>£{selectedOrder.deliveryCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-950 font-bold text-sm pt-2 border-t border-neutral-200/60">
                  <span>Total Paid</span>
                  <span>£{selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-neutral-50/60 border-t border-neutral-100 flex items-center justify-end">
              <button
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicPageLayout>
  );
}
