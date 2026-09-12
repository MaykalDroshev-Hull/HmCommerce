'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Package, 
  Tag, 
  Settings, 
  Users, 
  BarChart3, 
  DollarSign, 
  Percent, 
  Image as ImageIcon,
  Eye,
  ArrowLeft,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Boxes,
  ClipboardList,
  ShoppingCart,
  Mail,
  MailCheck
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface AdminSidebarProps {
  currentPath: string;
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export default function AdminSidebar({ currentPath, collapsed: externalCollapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const t = translations[language || 'en'];
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Internal collapsed state (used if not controlled externally)
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  
  // Use external collapsed state if provided, otherwise use internal
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  
  // Tooltip state
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // Persist collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin-sidebar-collapsed', String(isCollapsed));
    }
  }, [isCollapsed]);

  // Handle toggle
  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    if (onToggle) {
      onToggle(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  };

  // Tooltip positioning
  useEffect(() => {
    if (hoveredItem && tooltipRef.current && isCollapsed) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      // Position tooltip to the right of sidebar
      tooltip.style.left = `${rect.width + 8}px`;
    }
  }, [hoveredItem, isCollapsed]);


  const menuItems = [
    {
      id: 'dashboard',
      label: t.dashboard || 'Dashboard',
      path: '/admin',
      icon: LayoutDashboard
    },
    {
      id: 'product-types',
      label: 'Categories',
      path: '/admin/product-types',
      icon: Tag
    },
    {
      id: 'properties',
      label: 'Characteristics',
      path: '/admin/properties',
      icon: Settings
    },
    {
      id: 'products',
      label: 'Items',
      path: '/admin/products',
      icon: Package
    },
    {
      id: 'stock',
      label: 'Stock',
      path: '/admin/stock',
      icon: Boxes
    },
    {
      id: 'stock-in',
      label: 'Receive stock',
      path: '/admin/stock-in',
      icon: ClipboardList
    },
    {
      id: 'order-new',
      label: 'New order',
      path: '/admin/order-new',
      icon: ShoppingCart
    },
    {
      id: 'sales',
      label: 'Sales',
      path: '/admin/sales',
      icon: BarChart3
    },
    {
      id: 'customers',
      label: t.customers || 'Customers',
      path: '/admin/customers',
      icon: Users
    },
    {
      id: 'newsletter',
      label: 'Newsletter',
      path: '/admin/newsletter',
      icon: Mail
    },
    {
      id: 'email-testing',
      label: 'Email Testing',
      path: '/admin/email-testing',
      icon: MailCheck
    },
    {
      id: 'analytics',
      label: 'Analytics',
      path: '/admin/analytics',
      icon: TrendingUp
    },
    {
      id: 'visitors',
      label: t.visitors || 'Visitors',
      path: '/admin/visitors',
      icon: Eye
    },
    {
      id: 'finance',
      label: 'Finance',
      path: '/admin/finance',
      icon: DollarSign
    },
    {
      id: 'discounts',
      label: 'Discounts',
      path: '/admin/discounts',
      icon: Percent
    },
    {
      id: 'super-promo',
      label: 'SUPER PROMO',
      path: '/admin/super-promo',
      icon: Percent
    },
    {
      id: 'media',
      label: 'Media',
      path: '/admin/media',
      icon: ImageIcon
    },
    {
      id: 'settings',
      label: t.storeSettings || 'Settings',
      path: '/admin/settings',
      icon: Settings
    }
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(path);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-2 z-50 p-2 rounded-lg transition-all duration-300 ease-in-out shadow-lg"
        style={{
          left: isMobileMenuOpen ? 'calc(256px - 5px - 2.5rem)' : '16px', // 256px is sidebar width (w-64), 5px gap, 2.5rem (40px) is button width (p-2 + icon)
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          border: `1px solid ${theme.colors.border}`
        }}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40
          h-screen
          transform transition-transform duration-300 ease-in-out
          lg:transform-none lg:transition-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-16 lg:w-16' : 'w-64 lg:w-64'}
          flex-shrink-0 border-r rounded-r-lg
        `}
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
        data-collapsed={isCollapsed}
      >
        <div className="h-full flex flex-col max-h-screen">
          {/* Header */}
          <div
            className={`p-3 sm:p-4 border-b flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}
            style={{ borderColor: theme.colors.border }}
          >
            {!isCollapsed && (
              <h2
                className="text-base sm:text-lg font-bold"
                style={{ color: theme.colors.text }}
              >
                {'Admin Panel'}
              </h2>
            )}
          </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 sm:p-3 min-h-0">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <li key={item.id} className="relative">
                  <Link
                    href={item.path}
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 sm:gap-3'} px-2 sm:px-3 py-2.5 sm:py-3 rounded-lg transition-colors duration-200 touch-manipulation min-h-[44px] ${
                      active ? 'font-medium' : ''
                    }`}
                    style={{
                      backgroundColor: active ? theme.colors.primary : 'transparent',
                      color: active ? '#ffffff' : theme.colors.textSecondary
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = theme.colors.secondary;
                        e.currentTarget.style.color = theme.colors.text;
                      }
                      if (isCollapsed) {
                        setHoveredItem(item.id);
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.colors.textSecondary;
                      }
                      if (isCollapsed) {
                        setHoveredItem(null);
                      }
                    }}
                    onClick={() => {
                      // Close mobile menu when link is clicked
                      if (window.innerWidth < 1024) {
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="text-xs sm:text-sm truncate">{item.label}</span>
                    )}
                    {isCollapsed && (
                      <span className="sr-only">{item.label}</span>
                    )}
                  </Link>
                  {/* Custom tooltip for collapsed state */}
                  {isCollapsed && hoveredItem === item.id && (
                    <div
                      ref={tooltipRef}
                      className="absolute left-full ml-2 px-3 py-2 rounded-lg shadow-lg z-50 pointer-events-none whitespace-nowrap"
                      style={{
                        backgroundColor: theme.colors.cardBg || theme.colors.surface,
                        color: theme.colors.text,
                        border: `1px solid ${theme.colors.border}`
                      }}
                    >
                      {item.label}
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent"
                        style={{
                          borderRightColor: theme.colors.cardBg || theme.colors.surface
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div
          className="p-3 sm:p-4 border-t flex-shrink-0 space-y-2"
          style={{ borderColor: theme.colors.border }}
        >
          {/* Collapse Toggle Button - Hidden on mobile */}
          <button
            onClick={(e) => {
              // Prevent toggle on mobile
              if (window.innerWidth < 1024) {
                return;
              }
              handleToggle();
            }}
            className={`hidden lg:flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 sm:gap-3'} px-2 sm:px-3 py-2.5 sm:py-3 rounded-lg transition-colors duration-200 w-full touch-manipulation min-h-[44px]`}
            style={{
              backgroundColor: theme.colors.secondary,
              color: theme.colors.text
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.secondary;
              e.currentTarget.style.color = theme.colors.text;
            }}
            title={isCollapsed ? ('Expand sidebar') : ('Collapse sidebar')}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
            ) : (
              <>
                <ChevronLeft size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">
                  {'Collapse sidebar'}
                </span>
              </>
            )}
            {isCollapsed && (
              <span className="sr-only">
                {'Expand sidebar'}
              </span>
            )}
          </button>

          {/* Back to Store */}
          <Link
            href="/"
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 sm:gap-3'} px-2 sm:px-3 py-2.5 sm:py-3 rounded-lg transition-colors duration-200 w-full touch-manipulation min-h-[44px]`}
            style={{
              backgroundColor: theme.colors.secondary,
              color: theme.colors.text
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.secondary;
              e.currentTarget.style.color = theme.colors.text;
            }}
            onClick={() => {
              // Close mobile menu when link is clicked
              if (window.innerWidth < 1024) {
                setIsMobileMenuOpen(false);
              }
            }}
            title={isCollapsed ? t.goToStore : undefined}
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-xs sm:text-sm font-medium truncate">{t.goToStore}</span>
            )}
            {isCollapsed && (
              <span className="sr-only">{t.goToStore}</span>
            )}
          </Link>
        </div>
      </div>
    </aside>
    </>
  );
}
