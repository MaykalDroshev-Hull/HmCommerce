'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, LayoutDashboard, Package, Settings, Users, BarChart3, Tag, DollarSign, Percent, Image as ImageIcon, Eye, TrendingUp, ShoppingCart } from 'lucide-react';
import { useAdminSearch } from '../lib/useAdminSearch';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { SearchableItem } from '../lib/adminSearchIndex';

interface AdminSearchBarProps {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
}

const iconMap: Record<string, any> = {
  dashboard: LayoutDashboard,
  properties: Settings,
  'product-types': Tag,
  products: Package,
  sales: ShoppingCart,
  customers: Users,
  analytics: TrendingUp,
  visitors: Eye,
  finance: DollarSign,
  discounts: Percent,
  media: ImageIcon,
  settings: Settings,
  orders: ShoppingCart,
};

export default function AdminSearchBar({ sidebarCollapsed, sidebarWidth }: AdminSearchBarProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const {
    searchTerm,
    setSearchTerm,
    results,
    groupedResults,
    recentSearchItems,
    isOpen,
    setIsOpen,
    handleSelect,
    clearRecentSearches,
  } = useAdminSearch();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false); // Track if user is actively typing

  // Track window size for responsive behavior
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Calculate search bar position and width
  // On mobile (< 1024px), sidebar is hidden, so search bar spans full width
  // Offset left on mobile to make space for burger menu button (left-4 = 16px, button ~56px total)
  const searchBarLeft = sidebarCollapsed ? 64 : 256;
  const searchBarWidth = `calc(100% - ${searchBarLeft}px)`;
  const mobileLeftOffset = '64px'; // Space for burger menu button (16px left + ~48px button width)

  // Handle input focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsOpen(true);
    e.currentTarget.style.borderColor = theme.colors.primary;
    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
  };

  // Handle input blur (with delay to allow clicks)
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = theme.colors.border;
    e.currentTarget.style.boxShadow = 'none';
    // Don't close if user is actively typing or there's a search term
    if (isTypingRef.current || searchTerm.trim()) {
      return;
    }
    setTimeout(() => {
      // Don't close if user started typing during the delay
      if (isTypingRef.current || searchTerm.trim()) {
        return;
      }
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setSelectedIndex(0);
      }
    }, 200);
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const totalItems = results.length;
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.length > 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleSelect]);

  // Reset selected index when search term changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  // Keep dropdown open when there's a search term
  useEffect(() => {
    if (searchTerm.trim() && !isOpen) {
      setIsOpen(true);
    }
  }, [searchTerm, isOpen]);


  // Get icon for item
  const getIcon = (item: SearchableItem) => {
    const pageId = item.path.split('/')[2] || item.path.split('/')[1] || 'dashboard';
    return iconMap[pageId] || Search;
  };

  // Translate type to Bulgarian
  const getTypeLabel = (type: SearchableItem['type']): string => {
    const typeMap: Record<SearchableItem['type'], string> = {
      page: 'Page',
      section: 'Section',
      header: 'Header',
      field: 'Field',
      action: 'Action',
    };
    return typeMap[type] || type;
  };

  // Render result item
  const renderResultItem = (item: SearchableItem, index: number) => {
    const Icon = getIcon(item);
    const isSelected = index === selectedIndex;
    const displayTitle = item.title;

    // Light greyish background for hover/selected
    const getBackgroundColor = () => {
      if (isSelected) {
        // Light grey with low opacity
        return 'rgba(128, 128, 128, 0.1)';
      }
      return 'transparent';
    };

    return (
      <button
        key={item.id}
        onClick={() => handleSelect(item)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
        style={{
          backgroundColor: getBackgroundColor(),
          color: theme.colors.text,
        }}
        onMouseEnter={(e) => {
          setSelectedIndex(index);
          // Show hover effect
          e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.08)';
        }}
        onMouseLeave={(e) => {
          // Reset based on current selected state
          const currentlySelected = selectedIndex === index;
          e.currentTarget.style.backgroundColor = currentlySelected 
            ? 'rgba(128, 128, 128, 0.1)' 
            : 'transparent';
        }}
      >
        <Icon size={18} style={{ color: theme.colors.primary }} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{displayTitle}</div>
          {item.description && (
            <div
              className="text-xs truncate mt-0.5"
              style={{ color: theme.colors.textSecondary }}
            >
              {item.description}
            </div>
          )}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            backgroundColor: theme.colors.secondary,
            color: theme.colors.textSecondary,
          }}
        >
          {getTypeLabel(item.type)}
        </span>
      </button>
    );
  };

  // Render grouped results
  const renderGroupedResults = () => {
    const hasResults = Object.values(groupedResults).some((group) => group.length > 0);

    if (!hasResults) {
      return (
        <div
          className="px-4 py-8 text-center"
          style={{ color: theme.colors.textSecondary }}
        >
          <p className="text-sm">
            {'No results found'}
          </p>
        </div>
      );
    }

    return (
      <div className="max-h-96 overflow-y-auto">
        {groupedResults.pages.length > 0 && (
          <div>
            <div
              className="px-4 py-2 text-xs font-semibold uppercase sticky top-0"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.textSecondary,
              }}
            >
              Pages
            </div>
            {groupedResults.pages.map((item, idx) => {
              const globalIndex = results.indexOf(item);
              return renderResultItem(item, globalIndex);
            })}
          </div>
        )}

        {groupedResults.sections.length > 0 && (
          <div>
            <div
              className="px-4 py-2 text-xs font-semibold uppercase sticky top-0"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.textSecondary,
              }}
            >
              Sections
            </div>
            {groupedResults.sections.map((item, idx) => {
              const globalIndex = results.indexOf(item);
              return renderResultItem(item, globalIndex);
            })}
          </div>
        )}

        {groupedResults.fields.length > 0 && (
          <div>
            <div
              className="px-4 py-2 text-xs font-semibold uppercase sticky top-0"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.textSecondary,
              }}
            >
              Fields
            </div>
            {groupedResults.fields.map((item, idx) => {
              const globalIndex = results.indexOf(item);
              return renderResultItem(item, globalIndex);
            })}
          </div>
        )}

        {groupedResults.actions.length > 0 && (
          <div>
            <div
              className="px-4 py-2 text-xs font-semibold uppercase sticky top-0"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.textSecondary,
              }}
            >
              Actions
            </div>
            {groupedResults.actions.map((item, idx) => {
              const globalIndex = results.indexOf(item);
              return renderResultItem(item, globalIndex);
            })}
          </div>
        )}
      </div>
    );
  };

  // Render recent searches
  const renderRecentSearches = () => {
    if (recentSearchItems.length === 0) {
      return (
        <div
          className="px-4 py-8 text-center"
          style={{ color: theme.colors.textSecondary }}
        >
          <p className="text-sm">
            {'No recent searches'}
          </p>
        </div>
      );
    }

    return (
      <div className="max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-2 sticky top-0" style={{ backgroundColor: theme.colors.surface }}>
          <div
            className="text-xs font-semibold uppercase"
            style={{ color: theme.colors.textSecondary }}
          >
            <Clock size={14} className="inline mr-2" />
            {'Recent Searches'}
          </div>
          <button
            onClick={clearRecentSearches}
            className="text-xs hover:underline"
            style={{ color: theme.colors.primary }}
          >
            {'Clear'}
          </button>
        </div>
        {recentSearchItems.map((item) => {
          const Icon = getIcon(item);
          const displayTitle = item.title;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: theme.colors.text,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={18} style={{ color: theme.colors.primary }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{displayTitle}</div>
                {item.description && (
                  <div
                    className="text-xs truncate mt-0.5"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {item.description}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="hidden lg:block fixed top-0 z-50"
      style={{
        left: isDesktop ? `${searchBarLeft}px` : mobileLeftOffset,
        width: isDesktop ? searchBarWidth : `calc(100% - ${mobileLeftOffset})`,
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
        borderLeft: isDesktop ? `1px solid ${theme.colors.border}` : 'none',
        borderRadius: isDesktop ? '0 0.5rem 0 0' : '0',
        overflow: isOpen ? 'visible' : 'hidden',
      }}
    >
      <div className="relative">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3">
          <Search
            size={20}
            className="absolute left-6 pointer-events-none"
            style={{ color: theme.colors.textSecondary }}
          />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              isTypingRef.current = true;
              setSearchTerm(e.target.value);
              // Force isOpen to true when typing
              // Also ensure input stays focused
              if (inputRef.current && document.activeElement !== inputRef.current) {
                inputRef.current.focus();
              }
              setIsOpen(true);
              // Clear typing flag after a delay
              setTimeout(() => {
                isTypingRef.current = false;
              }, 500);
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={
              'Search or go to...'
            }
            className="w-full pl-10 pr-10 py-2 rounded-md text-sm focus:outline-none transition-all"
            style={{
              backgroundColor: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text,
            }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="absolute right-6 p-1 rounded hover:bg-opacity-10 transition-colors"
              style={{ color: theme.colors.textSecondary }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {(isOpen || searchTerm.trim()) && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg border overflow-hidden"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              maxHeight: '500px',
              zIndex: 9999,
            }}
          >
            {searchTerm.trim() ? renderGroupedResults() : renderRecentSearches()}
          </div>
        )}
      </div>
    </div>
  );
}
