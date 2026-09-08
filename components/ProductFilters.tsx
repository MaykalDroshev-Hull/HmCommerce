'use client';

import { SlidersHorizontal } from 'lucide-react';

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
  const filterCount = Object.keys(selectedFilters).length;
  const label = 'Filters';

  if (layout === 'bar') {
    return (
      <>
        {(placement === 'both' || placement === 'desktop') && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-[13px] font-semibold text-neutral-800 bg-white border border-neutral-300 hover:border-neutral-900 hover:bg-neutral-50 transition-all duration-200 shrink-0 shadow-2xs"
          >
            <SlidersHorizontal size={14} />
            <span>{label}</span>
            {filterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        )}

        {(placement === 'both' || placement === 'mobile') && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="md:hidden flex items-center justify-center gap-2 w-full mt-2.5 px-4 py-2.5 rounded-full text-xs font-semibold text-neutral-900 bg-white border border-neutral-200 shadow-2xs active:bg-neutral-100 transition-colors"
          >
            <SlidersHorizontal size={14} />
            <span>{label}</span>
            {filterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
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
        className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-full bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-800 transition-all duration-200 shadow-2xs"
      >
        <SlidersHorizontal size={14} />
        <span>{label}</span>
        {filterCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
            {filterCount}
          </span>
        )}
      </button>
    </div>
  );
}

