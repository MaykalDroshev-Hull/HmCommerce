'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import PublicPageLayout from '@/components/PublicPageLayout';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [isAdmin, setIsAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetData, setResetData] = useState({ email: '' });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/user/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // Check admin state
  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const validateEmail = (email: string) => {
    const errors: string[] = [];
    if (!email) {
      return { isValid: true, errors: [] };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleResetChange = (field: string, value: string) => {
    setResetData((prev) => ({ ...prev, [field]: value }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetData.email) {
      setError('Please enter your email address');
      return;
    }

    const emailValidation = validateEmail(resetData.email);
    if (!emailValidation.isValid) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || 'Error sending request';
        if (errorMessage === 'User not found' || errorMessage === 'Email not found') {
          errorMessage = 'User with this email address not found';
        } else if (errorMessage === 'Internal server error') {
          errorMessage = 'Internal server error. Please try again.';
        } else if (errorMessage.includes('Invalid') || errorMessage.includes('invalid')) {
          errorMessage = 'Invalid email address';
        }
        throw new Error(errorMessage);
      }

      setSuccess(data.message || t.passwordResetSent || 'Password reset link sent to your email!');
      setResetData({ email: '' });
    } catch (err: any) {
      let errorMessage = err.message || 'Error sending request';
      if (errorMessage === 'Internal server error' || errorMessage.includes('fetch')) {
        errorMessage = 'An error occurred. Please try again.';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="flex-1 w-full py-12 sm:py-16 px-4 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto">
          {/* Centered Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight">
              {t.forgotPasswordTitle || 'Forgot Password?'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2 font-light leading-relaxed max-w-xs mx-auto">
              {t.forgotPasswordMessage ||
                "Enter your registered email address and we'll send you a link to reset your password."}
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                {t.email || 'Email Address'}
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={resetData.email}
                  onChange={(e) => handleResetChange('email', e.target.value)}
                  placeholder="yourname@domain.co.uk"
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-950 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-900 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Sending Link...' : (t.sendResetLink || 'Send Reset Link')}
            </button>

            <div className="pt-3 text-center">
              <Link
                href="/user"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-950 transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </PublicPageLayout>
  );
}
