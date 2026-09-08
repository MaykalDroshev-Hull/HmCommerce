'use client';

import Banner from '@/components/Banner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useTheme } from '@/context/ThemeContext';

interface PublicPageLayoutProps {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  children: React.ReactNode;
}

export default function PublicPageLayout({
  isAdmin,
  setIsAdmin,
  children,
}: PublicPageLayoutProps) {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.colors.background }}>
      <Banner />
      <Header isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      <div className="flex-1 flex flex-col">{children}</div>
      <Footer />
      <CartDrawer />
    </div>
  );
}
