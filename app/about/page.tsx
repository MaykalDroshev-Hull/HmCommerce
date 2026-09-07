'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import PublicPageLayout from '@/components/PublicPageLayout';
import LoadingScreen from '@/components/LoadingScreen';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { translations } from '@/lib/translations';
import { Target, Users, Award, Heart } from 'lucide-react';

export default function AboutPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { settings, isLoading: settingsLoading } = useStoreSettings();
  const t = translations[language];

  useEffect(() => {
    const pageTitle = t.aboutUs || 'About Us';
    const storeName = settings?.storename || '';
    document.title = storeName ? `${pageTitle} - ${storeName}` : pageTitle;
  }, [t, settings?.storename]);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  // Show loading screen while StoreSettings is loading (prevents showing backup content)
  if (settingsLoading) {
    return <LoadingScreen />;
  }

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  const isGradientTheme = theme.id === 'gradient';

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div
        className="flex-1 transition-colors duration-300"
        style={{
          background: isGradientTheme ? theme.colors.background : theme.colors.background
        }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="text-center mb-12 sm:mb-16">
            <h1
              className="font-serif-display text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6 transition-colors duration-300"
              style={{ color: theme.colors.text }}
            >
              {t.aboutUs || 'About Us'}
            </h1>
          </div>

          {/* About Us Content Section - Photo and Text */}
          {(settings?.aboutusphoto || settings?.aboutustext) && (
            <section className="mb-12 sm:mb-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
                {/* Text Content - Left on desktop, below on mobile */}
                {settings?.aboutustext && (
                  <div 
                    className="order-2 md:order-1 prose prose-lg max-w-none transition-colors duration-300"
                    style={{ 
                      color: theme.colors.text,
                    }}
                    dangerouslySetInnerHTML={{ __html: settings.aboutustext }}
                  />
                )}

                {/* Photo - Right on desktop, top on mobile */}
                {settings?.aboutusphoto && (
                  <div className="order-1 md:order-2">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={settings.aboutusphoto}
                        alt="About Us"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Default Content - Only show if no custom content */}
          {!settings?.aboutustext && (
            <>
              <div className="text-center mb-12 sm:mb-16">
                <p 
                  className="text-lg sm:text-xl transition-colors duration-300"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {t.ourMission || 'Our Mission'}
                </p>
              </div>

          {/* Mission Section */}
          <section className="mb-12 sm:mb-16">
            <div 
              className="p-6 sm:p-8 lg:p-10 rounded-lg mb-8 transition-colors duration-300"
              style={{
                backgroundColor: theme.colors.cardBg,
                border: `1px solid ${theme.colors.border}`
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <Target 
                  size={32} 
                  style={{ color: theme.colors.primary }}
                  className="flex-shrink-0 mt-1"
                />
                <div>
                  <h2 
                    className="text-2xl sm:text-3xl font-semibold mb-4 transition-colors duration-300"
                    style={{ color: theme.colors.text }}
                  >
                    {t.ourMission || 'Our Mission'}
                  </h2>
                  <p 
                    className="text-base sm:text-lg leading-relaxed transition-colors duration-300"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {t.missionDescription || 'Our mission is to provide high-quality fashion products that help our customers express their unique style and personality. We are committed to offering exceptional value, outstanding customer service, and a seamless shopping experience.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Values Section */}
          <section className="mb-12 sm:mb-16">
            <h2 
              className="text-2xl sm:text-3xl font-semibold mb-8 text-center transition-colors duration-300"
              style={{ color: theme.colors.text }}
            >
              {t.ourValues || 'Our Values'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div 
                className="p-6 sm:p-8 rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: theme.colors.cardBg,
                  border: `1px solid ${theme.colors.border}`
                }}
              >
                <Users 
                  size={40} 
                  className="mb-4"
                  style={{ color: theme.colors.primary }}
                />
                <h3 
                  className="text-xl font-semibold mb-3 transition-colors duration-300"
                  style={{ color: theme.colors.text }}
                >
                  {t.customerFocus || 'Customer Focus'}
                </h3>
                <p 
                  className="text-sm sm:text-base transition-colors duration-300"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {t.customerFocusDesc || 'We put our customers at the heart of everything we do, ensuring their needs and satisfaction are our top priority.'}
                </p>
              </div>

              <div 
                className="p-6 sm:p-8 rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: theme.colors.cardBg,
                  border: `1px solid ${theme.colors.border}`
                }}
              >
                <Award 
                  size={40} 
                  className="mb-4"
                  style={{ color: theme.colors.primary }}
                />
                <h3 
                  className="text-xl font-semibold mb-3 transition-colors duration-300"
                  style={{ color: theme.colors.text }}
                >
                  {t.qualityExcellence || 'Quality & Excellence'}
                </h3>
                <p 
                  className="text-sm sm:text-base transition-colors duration-300"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {t.qualityExcellenceDesc || 'We are dedicated to maintaining the highest standards of quality in all our products and services.'}
                </p>
              </div>

              <div 
                className="p-6 sm:p-8 rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: theme.colors.cardBg,
                  border: `1px solid ${theme.colors.border}`
                }}
              >
                <Heart 
                  size={40} 
                  className="mb-4"
                  style={{ color: theme.colors.primary }}
                />
                <h3 
                  className="text-xl font-semibold mb-3 transition-colors duration-300"
                  style={{ color: theme.colors.text }}
                >
                  {t.integrity || 'Integrity'}
                </h3>
                <p 
                  className="text-sm sm:text-base transition-colors duration-300"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {t.integrityDesc || 'We conduct our business with honesty, transparency, and ethical practices in all our interactions.'}
                </p>
              </div>

              <div 
                className="p-6 sm:p-8 rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: theme.colors.cardBg,
                  border: `1px solid ${theme.colors.border}`
                }}
              >
                <Target 
                  size={40} 
                  className="mb-4"
                  style={{ color: theme.colors.primary }}
                />
                <h3 
                  className="text-xl font-semibold mb-3 transition-colors duration-300"
                  style={{ color: theme.colors.text }}
                >
                  {t.innovation || 'Innovation'}
                </h3>
                <p 
                  className="text-sm sm:text-base transition-colors duration-300"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {t.innovationDesc || 'We continuously strive to improve and innovate, bringing you the latest trends and best shopping experience.'}
                </p>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section 
            className="p-6 sm:p-8 lg:p-10 rounded-lg text-center transition-colors duration-300"
            style={{
              backgroundColor: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <h2 
              className="text-2xl sm:text-3xl font-semibold mb-4 transition-colors duration-300"
              style={{ color: theme.colors.text }}
            >
              {t.getInTouch || 'Get in Touch'}
            </h2>
            <p 
              className="text-base sm:text-lg mb-6 transition-colors duration-300"
              style={{ color: theme.colors.textSecondary }}
            >
              {t.getInTouchDesc || 'We would love to hear from you. If you have any questions or feedback, please don\'t hesitate to contact us.'}
            </p>
            <p 
              className="text-sm sm:text-base transition-colors duration-300"
              style={{ color: theme.colors.textSecondary }}
            >
              {t.contact || 'Contact'}
            </p>
          </section>
            </>
          )}
        </div>
      </div>
    </PublicPageLayout>
  );
}


