'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import PublicPageLayout from '@/components/PublicPageLayout';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [isAdmin, setIsAdmin] = useState(false);

  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
  });

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

  // Check if token exists
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing security token. Please request a new password reset link.');
    }
  }, [token]);

  const handlePasswordChange = (field: string, value: string) => {
    if (value.includes(' ')) {
      return;
    }
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Invalid or missing token');
      return;
    }

    if (!passwordData.password) {
      setError('Please enter a new password');
      return;
    }

    if (passwordData.password.length < 8) {
      setError(t.passwordTooShort || 'Password must be at least 8 characters');
      return;
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(passwordData.password)) {
      setError(t.passwordMustContain || 'Password must contain both letters and numbers');
      return;
    }

    if (passwordData.password !== passwordData.confirmPassword) {
      setError(t.passwordsDoNotMatch || 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: passwordData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || 'Error resetting password';
        if (
          errorMessage === 'Invalid or expired token' ||
          errorMessage === 'Token not found' ||
          errorMessage === 'Token expired'
        ) {
          errorMessage = 'Invalid or expired token. Please request a new password reset.';
        } else if (errorMessage === 'Internal server error') {
          errorMessage = 'Internal server error. Please try again.';
        } else if (errorMessage.includes('Invalid') || errorMessage.includes('invalid')) {
          errorMessage = 'Invalid data submitted';
        }
        throw new Error(errorMessage);
      }

      setSuccess(t.passwordResetSuccess || 'Password reset successfully! Redirecting to sign in...');

      setTimeout(() => {
        router.push('/user');
      }, 2000);
    } catch (err: any) {
      let errorMessage = err.message || 'Error resetting password';
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
              {t.resetPasswordTitle || 'Set New Password'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2 font-light leading-relaxed max-w-xs mx-auto">
              {t.resetPasswordMessage ||
                'Please enter your new password below. It must be at least 8 characters long and contain both letters and numbers.'}
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
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                {t.newPassword || 'New Password'}
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={!token || isLoading}
                  value={passwordData.password}
                  onChange={(e) => handlePasswordChange('password', e.target.value)}
                  placeholder="At least 8 characters (letters & numbers)"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-950 transition-all disabled:bg-neutral-100 disabled:opacity-60"
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

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                {t.confirmPassword || 'Confirm New Password'}
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  disabled={!token || isLoading}
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-950 transition-all disabled:bg-neutral-100 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full py-3 px-4 rounded-lg bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-900 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Updating Password...' : (t.resetPasswordButton || 'Reset Password')}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-900 border-t-transparent mx-auto mb-3" />
            <p className="text-xs text-neutral-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
