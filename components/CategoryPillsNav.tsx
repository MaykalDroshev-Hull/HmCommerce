'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function CategoryPillsNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentProductTypeId = searchParams.get('producttypeid') || '';
  const currentPet = searchParams.get('pet') || '';

  const pills = [
    { id: 'all', label: 'All Products', href: '/products' },
    { id: 'dogs', label: 'Dogs', href: '/products?pet=dogs' },
    { id: 'cats', label: 'Cats', href: '/products?pet=cats' },
    { id: 'unipet', label: 'Unipet (All Pets)', href: '/products?pet=unipet' },
    { id: 'collars', label: 'Collars', href: '/for-him' },
    { id: 'harnesses', label: 'Harnesses', href: '/for-her' },
    { id: 'accessories', label: 'Accessories', href: '/accessories' },
  ];

  const getIsActive = (pillId: string) => {
    if (pillId === 'dogs' && currentPet === 'dogs') return true;
    if (pillId === 'cats' && currentPet === 'cats') return true;
    if (pillId === 'unipet' && currentPet === 'unipet') return true;
    if (pillId === 'collars' && pathname === '/for-him') return true;
    if (pillId === 'harnesses' && pathname === '/for-her') return true;
    if (pillId === 'accessories' && pathname === '/accessories') return true;
    if (
      pillId === 'all' &&
      (pathname === '/products' || pathname === '/') &&
      !currentPet &&
      !currentProductTypeId
    ) {
      return true;
    }
    return false;
  };

  return (
    <div className="flex-1 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
      <div className="flex items-center gap-2 min-w-max">
        {pills.map((pill) => {
          const isActive = getIsActive(pill.id);
          return (
            <Link
              key={pill.id}
              href={pill.href}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                  : 'bg-neutral-100/90 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-950 border border-neutral-200/80'
              }`}
            >
              {pill.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

