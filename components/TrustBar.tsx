'use client';

import { Headphones, Lock, RotateCcw, Truck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export default function TrustBar() {
  const { language } = useLanguage();
  const { theme } = useTheme();

  const trustItems = [
    {
      icon: Truck,
      title: 'Fast Delivery',
      subtitle: 'Free on orders over £50',
    },
    {
      icon: RotateCcw,
      title: 'Easy Returns',
      subtitle: '30-day return policy',
    },
    {
      icon: Lock,
      title: 'Secure Payment',
      subtitle: '100% encrypted checkout',
    },
    {
      icon: Headphones,
      title: 'Customer Care',
      subtitle: 'Dedicated support team',
    },
  ];

  return (
    <section
      className="border-y"
      style={{
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.border,
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-5">
        <div className="grid grid-cols-4 gap-2 sm:gap-6">
          {trustItems.map(item => (
            <div key={item.title} className="flex flex-col items-center text-center gap-1.5 sm:gap-2">
              <item.icon
                size={18}
                className="sm:hidden"
                style={{ color: theme.colors.text }}
                strokeWidth={1.5}
              />
              <item.icon
                size={22}
                className="hidden sm:block"
                style={{ color: theme.colors.text }}
                strokeWidth={1.5}
              />
              <div>
                <p
                  className="text-[10px] sm:text-sm font-medium leading-tight"
                  style={{ color: theme.colors.text }}
                >
                  {item.title}
                </p>
                <p
                  className="hidden sm:block text-xs mt-0.5"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
