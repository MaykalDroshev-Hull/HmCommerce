'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload, Settings as SettingsIcon, Image as ImageIcon, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import RichTextEditor from '@/components/RichTextEditor';
import { useTheme } from '@/context/ThemeContext';
import { translations } from '@/lib/translations';
import LanguageToggle from '@/components/LanguageToggle';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import AdminLayout from '../components/AdminLayout';
import { uploadFile, getStorageUrl } from '@/lib/supabaseStorage';
import { getAdminSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase-browser';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import HeroImageFocusEditor from '@/components/HeroImageFocusEditor';

interface StoreSettings {
  storesettingsid: string;
  storename: string;
  logourl: string | null;
  themeid: string;
  language: 'en' | 'bg';
  bannertext: string | null;
  bannerduration: number | null;
  heroimageurl: string | null;
  heroimagefocusx: number | null;
  heroimagefocusy: number | null;
  discordurl: string | null;
  facebookurl: string | null;
  pinteresturl: string | null;
  youtubeurl: string | null;
  instagramurl: string | null;
  xurl: string | null;
  tiktokurl: string | null;
  email: string | null;
  yearofcreation: number | null;
  telephonenumber: string | null;
  closingremarks: string | null;
  aboutusphoto: string | null;
  aboutustext: string | null;
  createdat: string;
  updatedat: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { refreshSettings } = useStoreSettings();
  const t = translations[language || 'en'];

  useEffect(() => {
    document.title = t.settings || ('Settings');
  }, [language, t]);

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [testimonials, setTestimonials] = useState<Array<{
    testimonialid: string;
    imageurl: string;
    sortorder: number;
    isactive: boolean;
  }>>([]);
  const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(true);
  const [isUploadingTestimonial, setIsUploadingTestimonial] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === 'undefined') {
        setIsAuthLoading(false);
        return;
      }

      try {
        const session = await getAdminSession();

        if (!session) {
          localStorage.removeItem('admin_authenticated');
          localStorage.removeItem('admin_access_token');
          localStorage.removeItem('admin_refresh_token');
          router.push('/admin/login');
          return;
        }

        setIsAuthenticated(true);
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('admin_user_email', session.user.email || '');
      } catch (error) {
        router.push('/admin/login');
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        localStorage.removeItem('admin_authenticated');
        router.push('/admin/login');
      } else if (event === 'SIGNED_IN' && session) {
        const canAccess = session.user.user_metadata?.can_access || ['admin'];
        if (!canAccess.includes('admin')) {
          supabase.auth.signOut();
          router.push('/admin/login');
        } else {
          setIsAuthenticated(true);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Load settings from API
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/store-settings');
        const result = await response.json();

        if (!response.ok) {
          return;
        }

        if (result.settings) {
          setSettings(result.settings);
          // Apply language and theme from settings for admin panel context
          // Note: User preferences in localStorage take priority over store settings
          if (!localStorage.getItem('theme')) {
            setTheme(result.settings.themeid);
          }
          if (!localStorage.getItem('language')) {
            setLanguage(result.settings.language);
          }
        } else {
          // Create default settings if none exist
          const defaultSettings = {
            storename: 'MB-Paws',
            logourl: null,
            themeid: 'default',
            language: 'en',
            bannertext: null,
            bannerduration: 5,
            heroimageurl: null,
            heroimagefocusx: 50,
            heroimagefocusy: 50,
            discordurl: null,
            facebookurl: null,
            pinteresturl: null,
            youtubeurl: null,
            instagramurl: null,
            xurl: null,
            tiktokurl: null,
            email: null,
            yearofcreation: null,
            telephonenumber: null,
            closingremarks: null,
            aboutusphoto: null,
            aboutustext: null
          };

          const createResponse = await fetch('/api/store-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(defaultSettings)
          });

          const createResult = await createResponse.json();

          if (!createResponse.ok || !createResult.success) {
            return;
          }

          setSettings(createResult.settings);
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [setLanguage, setTheme, isAuthenticated]);

  // Load testimonials
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadTestimonials = async () => {
      try {
        setIsLoadingTestimonials(true);
        const response = await fetch('/api/testimonials');
        const result = await response.json();
        if (result.success) {
          setTestimonials(result.testimonials || []);
        }
      } catch (error) {
      } finally {
        setIsLoadingTestimonials(false);
      }
    };

    loadTestimonials();
  }, [isAuthenticated]);

  // Sync local settings with global theme changes
  useEffect(() => {
    if (settings && theme.id !== settings.themeid) {
      setSettings(prev => prev ? { ...prev, themeid: theme.id } : null);
      setHasChanges(true);
    }
  }, [theme.id, settings]);

  // Sync local settings with global language changes
  useEffect(() => {
    if (settings && language !== settings.language) {
      setSettings(prev => prev ? { ...prev, language: language } : null);
      setHasChanges(true);
    }
  }, [language, settings]);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/store-settings/${settings.storesettingsid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storename: settings.storename,
          logourl: settings.logourl,
          themeid: settings.themeid,
          language: settings.language,
          bannertext: settings.bannertext,
          bannerduration: settings.bannerduration,
          heroimageurl: settings.heroimageurl,
          heroimagefocusx: settings.heroimagefocusx ?? 50,
          heroimagefocusy: settings.heroimagefocusy ?? 50,
          discordurl: settings.discordurl,
          facebookurl: settings.facebookurl,
          pinteresturl: settings.pinteresturl,
          youtubeurl: settings.youtubeurl,
          instagramurl: settings.instagramurl,
          xurl: settings.xurl,
          tiktokurl: settings.tiktokurl,
          email: settings.email,
          yearofcreation: settings.yearofcreation,
          telephonenumber: settings.telephonenumber,
          closingremarks: settings.closingremarks,
          aboutusphoto: settings.aboutusphoto,
          aboutustext: settings.aboutustext
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(t.errorSavingSettings);
        return;
      }

      setHasChanges(false);
      // Refresh global store settings to update the application
      await refreshSettings();
      alert(t.settingsSaved);
    } catch (error) {
      alert('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !settings) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t.pleaseSelectImage);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t.fileTooLarge);
      return;
    }

    try {
      // Upload to Supabase Storage
      const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      const result = await uploadFile('logos', fileName, file);

      if (result.success && result.url) {
        setSettings(prev => prev ? { ...prev, logourl: result.url ?? null } : null);
        setHasChanges(true);
      } else {
        alert(t.errorUploadingLogo);
      }
    } catch (error) {
      alert(t.errorUploadingLogo);
    }

    // Clear input
    event.target.value = '';
  };

  const handleHeroImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !settings) return;

    // Validate file type - allow images including GIFs
    if (!file.type.startsWith('image/')) {
      alert(t.pleaseSelectImage);
      return;
    }

    // Validate file size (max 5MB for hero images including GIFs)
    if (file.size > 5 * 1024 * 1024) {
      alert(t.fileTooLarge);
      return;
    }

    try {
      // Upload to Supabase Storage
      const fileName = `hero-${Date.now()}.${file.name.split('.').pop()}`;
      const result = await uploadFile('hero-images', fileName, file);

      if (result.success && result.url) {
        setSettings(prev => prev ? { 
          ...prev, 
          heroimageurl: result.url ?? null,
          heroimagefocusx: 50,
          heroimagefocusy: 50
        } : null);
        setHasChanges(true);
      } else {
        alert('Error uploading hero image');
      }
    } catch (error) {
      alert('Error uploading hero image');
    }

    // Clear input
    event.target.value = '';
  };

  const handleAboutUsPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !settings) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t.pleaseSelectImage);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t.fileTooLarge);
      return;
    }

    try {
      // Upload to Supabase Storage
      const fileName = `about-us-${Date.now()}.${file.name.split('.').pop()}`;
      const result = await uploadFile('images', fileName, file);

      if (result.success && result.url) {
        setSettings(prev => prev ? { ...prev, aboutusphoto: result.url ?? null } : null);
        setHasChanges(true);
      } else {
        alert('Error uploading image');
      }
    } catch (error) {
      alert('Error uploading image');
    }

    // Clear input
    event.target.value = '';
  };

  const handleTestimonialUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate all files
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name}: ${t.pleaseSelectImage || 'Please select an image file'}`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: ${t.fileTooLarge || 'File is too large (max 5MB)'}`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      event.target.value = '';
      return;
    }

    try {
      setIsUploadingTestimonial(true);
      const uploadedTestimonials: Array<{
        testimonialid: string;
        imageurl: string;
        sortorder: number;
        isactive: boolean;
      }> = [];

      // Upload files sequentially to avoid overwhelming the server
      for (const file of validFiles) {
        try {
          // Upload to Supabase Storage
          const fileName = `testimonial-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
          const result = await uploadFile('testimonials', fileName, file);

          if (result.success && result.url) {
            // Create testimonial via API
            const createResponse = await fetch('/api/testimonials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageurl: result.url })
            });

            const createResult = await createResponse.json();
            if (createResult.success) {
              uploadedTestimonials.push(createResult.testimonial);
            } else {
            }
          } else {
          }
        } catch (error) {
        }
      }

      if (uploadedTestimonials.length > 0) {
        setTestimonials(prev => [...prev, ...uploadedTestimonials].sort((a, b) => a.sortorder - b.sortorder));
        if (uploadedTestimonials.length < validFiles.length) {
          alert(`Uploaded ${uploadedTestimonials.length} of ${validFiles.length} images`);
        }
      } else {
        alert('Error uploading images');
      }
    } catch (error) {
      alert('Error uploading testimonials');
    } finally {
      setIsUploadingTestimonial(false);
      event.target.value = '';
    }
  };

  const handleTestimonialDelete = async (testimonialId: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) {
      return;
    }

    try {
      const response = await fetch(`/api/testimonials/${testimonialId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        setTestimonials(prev => prev.filter(t => t.testimonialid !== testimonialId));
      } else {
        alert('Error deleting testimonial');
      }
    } catch (error) {
      alert('Error deleting testimonial');
    }
  };

  const handleTestimonialReorder = async (testimonialId: string, direction: 'up' | 'down') => {
    const currentIndex = testimonials.findIndex(t => t.testimonialid === testimonialId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= testimonials.length) return;

    const updatedTestimonials = [...testimonials];
    const [moved] = updatedTestimonials.splice(currentIndex, 1);
    updatedTestimonials.splice(newIndex, 0, moved);

    // Update sortorder for all affected testimonials
    const updates = updatedTestimonials.map((t, index) => ({
      ...t,
      sortorder: index
    }));

    try {
      // Update all affected testimonials
      await Promise.all(
        updates.map(t => 
          fetch(`/api/testimonials/${t.testimonialid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortorder: t.sortorder })
          })
        )
      );

      setTestimonials(updates);
    } catch (error) {
      alert('Error reordering testimonials');
    }
  };

  const handleSettingChange = (field: keyof StoreSettings, value: any) => {
    if (!settings) return;

    setSettings(prev => prev ? { ...prev, [field]: value } : null);

    // Update global contexts immediately for theme and language changes
    if (field === 'themeid') {
      setTheme(value);
    } else if (field === 'language') {
      setLanguage(value);
    }

    setHasChanges(true);
  };

  const handleFocusChange = (x: number, y: number) => {
    if (!settings) return;
    setSettings(prev => prev ? { 
      ...prev, 
      heroimagefocusx: x,
      heroimagefocusy: y
    } : null);
    setHasChanges(true);
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <AdminLayout currentPath="/admin/settings">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout currentPath="/admin/settings">
        <div className="text-center py-12">
          <p style={{ color: theme.colors.textSecondary }}>
            {'Error loading settings'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPath="/admin/settings">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon size={24} style={{ color: theme.colors.primary }} />
            <h1
              className="text-3xl font-bold"
              style={{ color: theme.colors.text }}
            >
              {t.storeSettings}
            </h1>
          </div>
          <p
            className="text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            {t.manageStoreSettings}
          </p>
        </div>

        <div className="space-y-8">
          {/* Store Information */}
          <div
            className="p-6 rounded-lg"
            style={{
              backgroundColor: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <h2
              className="text-xl font-semibold mb-6"
              style={{ color: theme.colors.text }}
            >
              {t.storeInformation}
            </h2>

            <div className="space-y-6">
              {/* Store Name */}
              <div id="settings-store-information">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {t.storeName}
                </label>
                <input
                  id="settings-store-name"
                  type="text"
                  value={settings.storename}
                  maxLength={25}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 25) {
                      handleSettingChange('storename', value);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: settings.storename.length > 25 ? '#ef4444' : theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder={'Enter store name'}
                />
                <div className="mt-1 flex justify-between items-center">
                  <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {'Limit: 25 characters (to fit on 2 lines on mobile devices)'}
                  </p>
                  <span 
                    className="text-xs font-medium"
                    style={{ 
                      color: settings.storename.length > 35 
                        ? '#ef4444' 
                        : settings.storename.length > 30 
                        ? '#f59e0b'
                        : theme.colors.textSecondary 
                    }}
                  >
                    {settings.storename.length}/35
                  </span>
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {'Email'}
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => handleSettingChange('email', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder={'example@store.com'}
                />
              </div>

              {/* Telephone Number */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {'Telephone Number'}
                </label>
                <input
                  id="settings-telephone"
                  type="tel"
                  value={settings.telephonenumber || ''}
                  onChange={(e) => handleSettingChange('telephonenumber', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder={'07123 456789 or +44 7123 456789'}
                />
              </div>

              {/* Year of Creation */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {'Year of Creation'}
                </label>
                <input
                  id="settings-year-creation"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={settings.yearofcreation || ''}
                  onChange={(e) => handleSettingChange('yearofcreation', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder={new Date().getFullYear().toString()}
                />
              </div>

              {/* Closing Remarks */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {'Closing Remarks'}
                </label>
                <textarea
                  id="settings-closing-remarks"
                  value={settings.closingremarks || ''}
                  onChange={(e) => handleSettingChange('closingremarks', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    minHeight: '120px'
                  }}
                  placeholder={'Enter closing remarks or message for the store'}
                />
                <p
                  className="text-sm mt-1"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {'Optional message that will be displayed on the store'}
                </p>
              </div>

              {/* About Us Section */}
              <div id="settings-about-us" className="border-t pt-6 mt-6" style={{ borderColor: theme.colors.border }}>
                <h3
                  className="text-lg font-semibold mb-4"
                  style={{ color: theme.colors.text }}
                >
                  {'About Us Page'}
                </h3>

                {/* About Us Photo */}
                <div id="settings-about-us-photo" className="mb-6">
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.colors.text }}
                  >
                    {'About Us Photo'}
                  </label>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: settings.aboutusphoto ? 'transparent' : theme.colors.secondary
                      }}
                    >
                      {settings.aboutusphoto ? (
                        <img
                          src={settings.aboutusphoto}
                          alt="About Us"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon
                          size={32}
                          style={{ color: theme.colors.textSecondary }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        className="px-4 py-2 rounded-md cursor-pointer transition-colors duration-300 inline-flex items-center gap-2"
                        style={{
                          backgroundColor: theme.colors.primary,
                          color: '#fff'
                        }}
                      >
                        <Upload size={16} />
                        {'Upload Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAboutUsPhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {settings.aboutusphoto && (
                        <button
                          onClick={() => {
                            setSettings(prev => prev ? { ...prev, aboutusphoto: null } : null);
                            setHasChanges(true);
                          }}
                          className="px-4 py-2 rounded-md transition-colors duration-300 text-sm"
                          style={{
                            backgroundColor: '#ef4444',
                            color: '#fff'
                          }}
                        >
                          {'Remove Photo'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p
                    className="text-sm mt-2"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {'Max size: 5MB'}
                  </p>
                </div>

                {/* About Us Text (Rich Text Editor) */}
                <div id="settings-about-us-text">
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.colors.text }}
                  >
                    {'About Us Text'}
                  </label>
                  <RichTextEditor
                    value={settings.aboutustext || ''}
                    onChange={(value) => handleSettingChange('aboutustext', value || null)}
                    theme={theme}
                    language={language}
                  />
                  <p
                    className="text-sm mt-2"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {'Use the editor to format text with bold, italic, lists, and more'}
                  </p>
                </div>
              </div>

              {/* Logo */}
              <div id="settings-logo">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {t.logo}
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center"
                    style={{
                      borderColor: theme.colors.border,
                      backgroundColor: settings.logourl ? 'transparent' : theme.colors.secondary
                    }}
                  >
                    {settings.logourl ? (
                      <img
                        src={settings.logourl}
                        alt="Store Logo"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <Upload size={24} style={{ color: theme.colors.textSecondary }} />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-colors duration-300"
                      style={{
                        backgroundColor: theme.colors.primary,
                        color: '#ffffff'
                      }}
                    >
                      <Upload size={16} />
                      {t.uploadLogo}
                    </label>
                    <p
                      className="text-sm mt-1"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {t.logoRequirements}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hero Image */}
              <div id="settings-hero-image">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {'Hero Image'}
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden"
                    style={{
                      borderColor: theme.colors.border,
                      backgroundColor: settings.heroimageurl ? 'transparent' : theme.colors.secondary
                    }}
                  >
                    {settings.heroimageurl ? (
                      <img
                        src={settings.heroimageurl}
                        alt="Hero Image"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Upload size={24} style={{ color: theme.colors.textSecondary }} />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageUpload}
                      className="hidden"
                      id="hero-image-upload"
                    />
                    <label
                      htmlFor="hero-image-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-colors duration-300"
                      style={{
                        backgroundColor: theme.colors.primary,
                        color: '#ffffff'
                      }}
                    >
                      <Upload size={16} />
                      {'Upload Hero Image'}
                    </label>
                    {settings.heroimageurl && (
                      <button
                        onClick={() => handleSettingChange('heroimageurl', null)}
                        className="block mt-2 text-sm text-red-600 hover:text-red-700 transition-colors"
                      >
                        {'Remove Image'}
                      </button>
                    )}
                    <p
                      className="text-sm mt-1"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {'Image or GIF for the home page (recommended: 1920x1080px, max 5MB)'}
                    </p>
                  </div>
                </div>
                
                {/* Focus Point Editor */}
                {settings.heroimageurl && (
                  <div className="mt-6">
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      {'Focus Point'}
                    </label>
                    <p
                      className="text-sm mb-4"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {'Click on the image to set the focus point. The important area will remain visible on all screen sizes.'}
                    </p>
                    <HeroImageFocusEditor
                      imageUrl={settings.heroimageurl}
                      focusX={settings.heroimagefocusx ?? 50}
                      focusY={settings.heroimagefocusy ?? 50}
                      onFocusChange={handleFocusChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div
            id="settings-appearance"
            className="p-6 rounded-lg"
            style={{
              backgroundColor: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <h2
              className="text-xl font-semibold mb-6"
              style={{ color: theme.colors.text }}
            >
              {t.appearance}
            </h2>

            <div className="space-y-6">
              {/* Color Theme */}
              <div id="settings-color-palette">
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: theme.colors.text }}
                >
                  {t.colorPalette}
                </label>
                <ThemeSwitcher />
              </div>

              {/* Language */}
              <div id="settings-language">
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: theme.colors.text }}
                >
                  {t.language}
                </label>
                <LanguageToggle />
              </div>
            </div>
          </div>

          {/* Banner Settings */}
          <div
            id="settings-banner"
            className="p-6 rounded-lg"
            style={{
              backgroundColor: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <h2
              className="text-xl font-semibold mb-6"
              style={{ color: theme.colors.text }}
            >
              {'Banner'}
            </h2>

            <div className="space-y-6">
              {/* Banner Text */}
              <div id="settings-banner-text">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {'Banner Text (one line per row)'}
                </label>
                <textarea
                  value={settings.bannertext || ''}
                  onChange={(e) => handleSettingChange('bannertext', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    minHeight: '120px',
                    fontFamily: 'monospace'
                  }}
                  placeholder={'Enter banner text\nEach line will be displayed separately'}
                />
                <p
                  className="text-sm mt-1"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {'Each line will rotate automatically'}
                </p>
              </div>

              {/* Banner Duration */}
              <div id="settings-banner-duration">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {'Rotation Duration (seconds)'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.bannerduration || 5}
                  onChange={(e) => handleSettingChange('bannerduration', parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                />
                <p
                  className="text-sm mt-1"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {'Time between line changes'}
                </p>
              </div>
            </div>
          </div>

          {/* Social Media Settings */}
          <div
            id="settings-social-media"
            className="p-6 rounded-lg"
            style={{
              backgroundColor: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <h2
              className="text-xl font-semibold mb-6"
              style={{ color: theme.colors.text }}
            >
              {'Social Media (Leave empty if you do not want to display a link)'}
            </h2>

            <div className="space-y-4">
              {/* Discord */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  Discord URL
                </label>
                <input
                  id="settings-discord"
                  type="url"
                  value={settings.discordurl || ''}
                  onChange={(e) => handleSettingChange('discordurl', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder="https://discord.gg/..."
                />
              </div>

              {/* Facebook */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  Facebook URL
                </label>
                <input
                  id="settings-facebook"
                  type="url"
                  value={settings.facebookurl || ''}
                  onChange={(e) => handleSettingChange('facebookurl', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder="https://facebook.com/..."
                />
              </div>

              {/* Pinterest */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  Pinterest URL
                </label>
                <input
                  id="settings-pinterest"
                  type="url"
                  value={settings.pinteresturl || ''}
                  onChange={(e) => handleSettingChange('pinteresturl', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder="https://pinterest.com/..."
                />
              </div>

              {/* YouTube */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  YouTube URL
                </label>
                <input
                  id="settings-youtube"
                  type="url"
                  value={settings.youtubeurl || ''}
                  onChange={(e) => handleSettingChange('youtubeurl', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder="https://youtube.com/..."
                />
              </div>

              {/* Instagram */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  Instagram URL
                </label>
                <input
                  id="settings-instagram"
                  type="url"
                  value={settings.instagramurl || ''}
                  onChange={(e) => handleSettingChange('instagramurl', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder="https://instagram.com/..."
                />
              </div>

              {/* X (Twitter) */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  X (Twitter) URL
                </label>
                <input
                  id="settings-x"
                  type="url"
                  value={settings.xurl || ''}
                  onChange={(e) => handleSettingChange('xurl', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder="https://x.com/..."
                />
              </div>

              {/* TikTok */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  TikTok URL
                </label>
                <input
                  id="settings-tiktok"
                  type="url"
                  value={settings.tiktokurl || ''}
                  onChange={(e) => handleSettingChange('tiktokurl', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md border transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                  placeholder="https://tiktok.com/@..."
                />
              </div>
            </div>
          </div>

          {/* Testimonials Settings */}
          <div
            id="settings-testimonials"
            className="p-6 rounded-lg"
            style={{
              backgroundColor: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <h2
              className="text-xl font-semibold mb-6"
              style={{ color: theme.colors.text }}
            >
              {'Customer Testimonials'}
            </h2>

            <div className="space-y-6">
              {/* Upload New Testimonial */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text }}
                >
                  {'Add New Testimonial'}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTestimonialUpload}
                    className="hidden"
                    id="testimonial-upload"
                    disabled={isUploadingTestimonial}
                    multiple
                  />
                  <label
                    htmlFor="testimonial-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-colors duration-300 disabled:opacity-50"
                    style={{
                      backgroundColor: isUploadingTestimonial ? theme.colors.secondary : theme.colors.primary,
                      color: '#ffffff'
                    }}
                  >
                    {isUploadingTestimonial ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        {'Upload Image'}
                      </>
                    )}
                  </label>
                  <p
                    className="text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {'You can upload multiple images. Max size: 5MB per file'}
                  </p>
                </div>
              </div>

              {/* Testimonials List */}
              {isLoadingTestimonials ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.primary }}></div>
                </div>
              ) : testimonials.length === 0 ? (
                <div
                  className="text-center py-8 rounded-lg"
                  style={{
                    backgroundColor: theme.colors.secondary,
                    border: `1px dashed ${theme.colors.border}`
                  }}
                >
                  <p style={{ color: theme.colors.textSecondary }}>
                    {'No testimonials added yet'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {testimonials.map((testimonial, index) => (
                    <div
                      key={testimonial.testimonialid}
                      className="relative rounded-lg overflow-hidden"
                      style={{
                        backgroundColor: theme.colors.background,
                        border: `1px solid ${theme.colors.border}`,
                        boxShadow: theme.effects.shadow
                      }}
                    >
                      {/* Testimonial Image */}
                      <div className="relative aspect-[4/5] bg-gray-100">
                        <img
                          src={testimonial.imageurl}
                          alt={`Testimonial ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Controls */}
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTestimonialReorder(testimonial.testimonialid, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: index === 0 ? 'transparent' : theme.colors.secondary,
                              color: theme.colors.text
                            }}
                            title={'Move up'}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => handleTestimonialReorder(testimonial.testimonialid, 'down')}
                            disabled={index === testimonials.length - 1}
                            className="p-1.5 rounded transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: index === testimonials.length - 1 ? 'transparent' : theme.colors.secondary,
                              color: theme.colors.text
                            }}
                            title={'Move down'}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleTestimonialDelete(testimonial.testimonialid)}
                          className="p-1.5 rounded transition-colors duration-300"
                          style={{
                            backgroundColor: '#ef4444',
                            color: '#ffffff'
                          }}
                          title={'Delete'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              id="settings-save"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 disabled:opacity-50"
              style={{
                backgroundColor: hasChanges ? theme.colors.primary : theme.colors.secondary,
                color: '#ffffff',
                boxShadow: theme.effects.shadow,
                opacity: isSaving ? 0.5 : 1
              }}
            >
              <Save size={20} />
              {isSaving
                ? t.saving
                : t.saveSettings
              }
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}