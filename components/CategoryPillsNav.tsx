'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export default function CategoryPillsNav() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const { theme } = useTheme();

  const pills = [
    { id: 'all', label: 'All', href: '/' },
    { id: 'for-him', label: 'Collars', href: '/for-him' },
    { id: 'for-her', label: 'Harnesses', href: '/for-her' },
    { id: 'accessories', label: 'Accessories', href: '/accessories' },
  ];

  const activeId =
    pathname === '/' || pathname === '/products'
      ? 'all'
      : pathname === '/for-him'
        ? 'for-him'
        : pathname === '/for-her'
          ? 'for-her'
          : pathname === '/accessories'
            ? 'accessories'
            : '';

  return (
    <div className="flex-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
      <div className="flex items-center gap-2 min-w-max pb-1">
        {pills.map(pill => {
          const isActive = pill.id === activeId;
          return (
            <Link
              key={pill.id}
              href={pill.href}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors duration-200"
              style={{
                backgroundColor: isActive ? theme.colors.buttonPrimary : theme.colors.secondary,
                color: isActive ? '#ffffff' : theme.colors.text,
                border: isActive ? 'none' : `1px solid ${theme.colors.border}`,
              }}
            >
              {pill.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
