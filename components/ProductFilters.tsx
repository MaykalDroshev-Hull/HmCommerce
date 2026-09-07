'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

interface ProductFiltersProps {
  selectedFilters: Record<string, any>;
  onToggleVisibility: () => void;
  layout?: 'default' | 'bar';
  placement?: 'both' | 'desktop' | 'mobile';
}

export default function ProductFilters({
  selectedFilters,
  onToggleVisibility,
  layout = 'bar',
  placement = 'both',
}: ProductFiltersProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();

  const filterCount = Object.keys(selectedFilters).length;
  const label = 'Filters';

  const buttonStyle = {
    backgroundColor: theme.colors.secondary,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
  };

  if (layout === 'bar') {
    return (
      <>
        {(placement === 'both' || placement === 'desktop') && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shrink-0 transition-colors duration-200"
            style={buttonStyle}
          >
            <SlidersHorizontal size={16} />
            {label}
            {filterCount > 0 && (
              <span
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {filterCount}
              </span>
            )}
          </button>
        )}

        {(placement === 'both' || placement === 'mobile') && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="md:hidden flex items-center justify-center gap-2 w-full mt-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200"
            style={buttonStyle}
          >
            <SlidersHorizontal size={16} />
            {label}
            {filterCount > 0 && (
              <span
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {filterCount}
              </span>
            )}
          </button>
        )}
      </>
    );
  }

  return (
    <div className="mb-6 px-2">
      <button
        type="button"
        onClick={onToggleVisibility}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all duration-300"
        style={buttonStyle}
      >
        <SlidersHorizontal size={16} />
        {label}
        {filterCount > 0 && (
          <span
            className="px-2 py-1 text-xs rounded-full text-white"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {filterCount}
          </span>
        )}
      </button>
    </div>
  );
}
