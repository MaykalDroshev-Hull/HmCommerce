'use client';

import { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

interface NewsletterSignupProps {
  source?: 'footer' | 'checkout' | 'banner';
  className?: string;
}

export default function NewsletterSignup({
  source = 'footer',
  className = '',
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg(data.message || "We've sent your 10% welcome discount straight to your inbox!");
        setEmail('');
      } else {
        setErrorMsg(data.error || 'Failed to sign up. Please try again.');
      }
    } catch {
      setErrorMsg('Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {successMsg ? (
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white text-left space-y-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 size={16} />
            <span>Welcome to the pack!</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed font-light">
            {successMsg}
          </p>
          <p className="text-[11px] text-neutral-400 font-light">
            Please check your inbox (and spam folder) to claim your code.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-neutral-500 pointer-events-none">
              <Mail size={15} />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full pl-10 pr-28 py-3 rounded-full bg-neutral-900/90 border border-neutral-800 text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-white/60 focus:bg-neutral-900 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="absolute right-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-neutral-950 hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:hover:bg-white flex items-center gap-1"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <span>Join</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
          {errorMsg && (
            <p className="text-[11px] text-red-400 text-left px-3 animate-in fade-in duration-150">
              {errorMsg}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
