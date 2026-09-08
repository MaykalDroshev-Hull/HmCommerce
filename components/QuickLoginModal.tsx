'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface QuickLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  productId?: string;
}

export default function QuickLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  productId,
}: QuickLoginModalProps) {
  const { login } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retryMinutes = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 15;
        setError(`Too many attempts. Please wait ${retryMinutes} minutes.`);
        return;
      }

      if (!response.ok) {
        let errorMessage = data.error || t.invalidCredentials;
        if (
          errorMessage === 'Invalid email or password' ||
          errorMessage === 'Invalid email or password format'
        ) {
          errorMessage = t.invalidCredentials;
        }
        setError(errorMessage);
        return;
      }

      // Login user with context
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone || '',
        locationText: data.user.locationText || '',
        locationCoordinates: data.user.locationCoordinates || '',
        addressInstructions: data.user.addressInstructions || '',
        created_at: data.user.created_at,
        preferredDeliveryType: data.user.preferredDeliveryType || undefined,
        preferredEcontOfficeId: data.user.preferredEcontOfficeId || undefined,
        preferredCity: data.user.preferredCity || undefined,
        preferredStreet: data.user.preferredStreet || undefined,
        preferredStreetNumber: data.user.preferredStreetNumber || undefined,
        preferredEntrance: data.user.preferredEntrance || undefined,
        preferredFloor: data.user.preferredFloor || undefined,
        preferredApartment: data.user.preferredApartment || undefined,
      });

      // If productId is provided, add it to favorites after login
      if (productId) {
        try {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              productId: productId,
            }),
          });
        } catch {
          // Favorite add is best-effort after login
        }
      }

      // Close modal and call success callback
      onClose();
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.reload();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 mb-1">
            ACCOUNT ACCESS
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-950 tracking-tight">
            {t.loginTitle || 'Sign In'}
          </h2>
          <p className="text-xs text-neutral-600 mt-1 font-light leading-relaxed">
            {t.pleaseLoginToFavorite || 'Sign in to your account to save favourites and track orders.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
              {t.email || 'Email Address'}
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="yourname@domain.co.uk"
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
                {t.password || 'Password'}
              </label>
              <Link
                href="/user/forgot-password"
                onClick={onClose}
                className="text-[11px] text-neutral-500 hover:text-neutral-950 font-medium transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-900 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-2xs disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? 'Signing In...' : (t.loginButton || 'Sign In')}
          </button>
        </form>

        {/* Link to full login / register page */}
        <div className="mt-4 pt-3 border-t border-neutral-100 text-center">
          <Link
            href="/user"
            onClick={onClose}
            className="text-xs text-neutral-600 hover:text-neutral-950 font-semibold transition-colors"
          >
            Don't have an account? Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
