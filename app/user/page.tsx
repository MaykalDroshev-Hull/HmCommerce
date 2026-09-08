'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, Phone, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import PublicPageLayout from '@/components/PublicPageLayout';

export default function UserPage() {
  const router = useRouter();
  const { login, user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [isAdmin, setIsAdmin] = useState(false);

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [success, setSuccess] = useState('');
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  // Get return URL from query parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrlParam = urlParams.get('returnUrl');
      if (returnUrlParam) {
        setReturnUrl(decodeURIComponent(returnUrlParam));
      }
    }
  }, []);

  // Check admin state
  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        router.push('/user/dashboard');
      }
    }
  }, [isAuthenticated, user, returnUrl, router]);

  // Form state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  // Email validation state
  const [emailValidation, setEmailValidation] = useState({
    isValid: true,
    errors: [] as string[],
    showTooltip: false,
  });

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

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setLoginError('');
    setRegisterError('');
    setSuccess('');
    setEmailValidation({ isValid: true, errors: [], showTooltip: false });
  };

  const handleLoginChange = (field: string, value: string) => {
    if (field === 'password' && value.includes(' ')) return;
    setLoginData((prev) => ({ ...prev, [field]: value }));
    if (field === 'email') {
      const validation = validateEmail(value);
      setEmailValidation({ ...validation, showTooltip: false });
    }
  };

  const handleRegisterChange = (field: string, value: string) => {
    if (field === 'password' && value.includes(' ')) return;
    setRegisterData((prev) => ({ ...prev, [field]: value }));
    if (field === 'email') {
      const validation = validateEmail(value);
      setEmailValidation({ ...validation, showTooltip: false });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retryMinutes = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 15;
        setLoginError(`Too many attempts. Please wait ${retryMinutes} minutes.`);
        return;
      }

      if (!response.ok) {
        let errorMessage = data.error || t.invalidCredentials;
        if (
          errorMessage === 'Invalid email or password' ||
          errorMessage === 'Invalid email or password format'
        ) {
          errorMessage = t.invalidCredentials;
        } else if (errorMessage === 'Internal server error') {
          errorMessage = 'Internal server error. Please try again.';
        }
        setLoginError(errorMessage);
        return;
      }

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

      if (returnUrl) {
        router.push(returnUrl);
      } else {
        router.push('/user/dashboard');
      }
    } catch (err: any) {
      let errorMessage = err.message || t.invalidCredentials;
      if (
        errorMessage === 'Invalid email or password' ||
        errorMessage === 'Invalid email or password format'
      ) {
        errorMessage = t.invalidCredentials;
      } else if (errorMessage === 'Internal server error' || errorMessage.includes('fetch')) {
        errorMessage = 'An error occurred. Please try again.';
      }
      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.email) {
      const emailVal = validateEmail(registerData.email);
      if (!emailVal.isValid) {
        setRegisterError('Please enter a valid email address');
        return;
      }
    }

    if (!registerData.phone) {
      setRegisterError('Phone number is required');
      return;
    }

    const cleanedPhone = registerData.phone.replace(/[\s\-()]/g, '').replace(/^\+440/, '+44');
    const phoneRegex = /^(\+44\d{9,11}|07\d{9}|0[1-9]\d{8,10})$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setRegisterError('Please enter a valid UK phone number starting with 07 or +44 (e.g. 07123 456789 or +44 7123 456789)');
      return;
    }

    if (!registerData.password) {
      setRegisterError('Password is required');
      return;
    }

    if (registerData.password.length < 8) {
      setRegisterError(t.passwordTooShort || 'Password must be at least 8 characters');
      return;
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(registerData.password)) {
      setRegisterError(t.passwordMustContain || 'Password must contain both letters and numbers');
      return;
    }

    setIsLoading(true);
    setRegisterError('');
    setSuccess('');

    try {
      const dataToSend = {
        ...registerData,
        phone: cleanedPhone,
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = '';
        if (data && typeof data === 'object' && data.details) {
          const errorKeys = Object.keys(data.details).filter(
            (key) => key.startsWith('error_') || ['name', 'email', 'phone', 'password'].includes(key)
          );
          if (errorKeys.length > 0) {
            errorMessage = data.details[errorKeys[0]];
          }
        }
        if (!errorMessage && data.error) {
          errorMessage = data.error;
        }
        if (!errorMessage) {
          errorMessage = 'Registration failed';
        }
        if (errorMessage === 'Email is already taken' || errorMessage === 'Email already exists') {
          errorMessage = 'This email address is already registered';
        } else if (errorMessage === 'Invalid email or password format' || errorMessage.includes('Invalid')) {
          errorMessage = 'Invalid data format';
        } else if (errorMessage === 'Internal server error') {
          errorMessage = 'Internal server error. Please try again.';
        }
        setRegisterError(errorMessage);
        return;
      }

      setSuccess('Account created successfully! Switching to sign in...');
      setLoginData({
        email: registerData.email,
        password: registerData.password,
      });
      setRegisterData({ name: '', email: '', phone: '', password: '' });
      setTimeout(() => setIsLogin(true), 1500);
    } catch (err: any) {
      let errorMessage = err.message || 'Registration failed';
      if (errorMessage === 'Internal server error' || errorMessage.includes('fetch')) {
        errorMessage = 'An error occurred. Please try again.';
      }
      setRegisterError(errorMessage);
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
          {/* Switcher: Sign In / Create Account */}
          <div className="flex items-center justify-center gap-8 mb-8 border-b border-neutral-200/60 pb-3">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setLoginError('');
                setRegisterError('');
                setSuccess('');
              }}
              className={`text-sm sm:text-base font-semibold tracking-wide transition-colors relative pb-3 -mb-3 ${
                isLogin
                  ? 'text-neutral-950 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {t.login || 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setLoginError('');
                setRegisterError('');
                setSuccess('');
              }}
              className={`text-sm sm:text-base font-semibold tracking-wide transition-colors relative pb-3 -mb-3 ${
                !isLogin
                  ? 'text-neutral-950 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {t.register || 'Create Account'}
            </button>
          </div>

          {/* Header Message */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight">
              {isLogin ? (t.login || 'Sign In') : (t.createAccount || 'Create an Account')}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2 font-light leading-relaxed max-w-xs mx-auto">
              {isLogin
                ? 'Sign in to access your orders, track dispatch, and manage favourites.'
                : 'Enjoy faster checkout, saved delivery preferences, and order tracking.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {loginError && isLogin && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
              <span>{loginError}</span>
            </div>
          )}

          {registerError && !isLogin && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
              <span>{registerError}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  {t.email || 'Email Address'}
                </label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={loginData.email}
                    onChange={(e) => handleLoginChange('email', e.target.value)}
                    placeholder="yourname@domain.co.uk"
                    autoComplete="email"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-950 transition-all"
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
                    className="text-xs text-neutral-600 hover:text-neutral-950 transition-colors"
                  >
                    {t.forgotPassword || 'Forgot password?'}
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginData.password}
                    onChange={(e) => handleLoginChange('password', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-950 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-700 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-900 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Signing In...' : (t.loginButton || 'Sign In')}
              </button>

              <div className="pt-3 text-center">
                <p className="text-xs text-neutral-600">
                  {t.dontHaveAccount || "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={toggleForm}
                    className="font-semibold text-neutral-950 hover:underline ml-1"
                  >
                    {t.register || 'Create one now'}
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  {t.name || 'Full Name'}
                </label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={registerData.name}
                    onChange={(e) => handleRegisterChange('name', e.target.value)}
                    placeholder="e.g. Alex Smith"
                    autoComplete="name"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-950 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  {t.email || 'Email Address'}
                </label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={registerData.email}
                    onChange={(e) => handleRegisterChange('email', e.target.value)}
                    placeholder="yourname@domain.co.uk"
                    autoComplete="email"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  {t.phone || 'Phone Number'}
                </label>
                <div className="relative flex items-center">
                  <Phone size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={registerData.phone}
                    onChange={(e) => handleRegisterChange('phone', e.target.value)}
                    placeholder="07123 456789 or +44 7123 456789"
                    autoComplete="tel"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  {t.password || 'Password (8+ chars, letters & numbers)'}
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={registerData.password}
                    onChange={(e) => handleRegisterChange('password', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-700 p-1"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-900 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Creating Account...' : (t.registerButton || 'Create Account')}
              </button>

              <div className="pt-3 text-center">
                <p className="text-xs text-neutral-600">
                  {t.alreadyHaveAccount || 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={toggleForm}
                    className="font-semibold text-neutral-950 hover:underline ml-1"
                  >
                    {t.login || 'Sign In'}
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </PublicPageLayout>
  );
}
