'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { PackagePlus, Search, ArrowRight } from 'lucide-react';

interface StockVariant {
  productvariantid: string;
  productid: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  primary_image?: string | null;
  characteristics: Array<{ property_name: string; value: string }>;
}

export default function StockInPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [variants, setVariants] = useState<StockVariant[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await getAdminSession();
        if (!session) {
          router.push('/admin/login');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const res = await fetch('/api/admin/stock');
      const data = await res.json();
      if (data.success) setVariants(data.variants || []);
    })();
  }, [isAuthenticated]);

  const filtered = variants.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.product_name.toLowerCase().includes(q) ||
      v.sku?.toLowerCase().includes(q) ||
      v.characteristics.some((c) => c.value.toLowerCase().includes(q) || c.property_name.toLowerCase().includes(q))
    );
  });

  const selected = variants.find((v) => v.productvariantid === selectedId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!selectedId || qty < 1) {
      setMessage({ type: 'err', text: 'Select variant and quantity.' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/stock/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productVariantId: selectedId,
          quantity: qty,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'ok',
          text:
            `Received. New quantity: ${data.newQuantity ?? ''}`,
        });
        setVariants((prev) =>
          prev.map((v) =>
            v.productvariantid === selectedId ? { ...v, quantity: data.newQuantity ?? v.quantity + qty } : v
          )
        );
        setQty(1);
        setNote('');
      } else {
        setMessage({ type: 'err', text: data.error || 'Error' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <AdminLayout currentPath="/admin/stock-in">
      <div className="p-3 sm:p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.text }}>
            {'Receive stock'}
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: theme.colors.textSecondary }}>
            {'Add quantity to an existing variant. For a new product with images use Items.'}
          </p>
        </div>

        <Link
          href="/admin/products"
          className="flex items-center gap-2 text-sm font-medium touch-manipulation min-h-[44px]"
          style={{ color: theme.colors.primary }}
        >
          {'Open Items for new product'}
          <ArrowRight className="w-4 h-4" />
        </Link>

        <form onSubmit={submit} className="space-y-4 rounded-xl border p-4 sm:p-6" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
              {'Search'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.textSecondary }} />
              <input
                className="w-full pl-10 pr-3 py-3 rounded-lg border text-base min-h-[44px]"
                style={{ borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.cardBg }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={'Product, SKU, color…'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
              {'Variant'}
            </label>
            <select
              required
              className="w-full py-3 px-3 rounded-lg border text-base min-h-[44px]"
              style={{ borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.cardBg }}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">{'— choose —'}</option>
              {filtered.map((v) => (
                <option key={v.productvariantid} value={v.productvariantid}>
                  {v.product_name} · {v.characteristics.map((c) => `${c.property_name}: ${c.value}`).join(', ') || v.sku || v.productvariantid.slice(0, 8)} · Q:{v.quantity}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="flex gap-4 items-start">
              {selected.primary_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.primary_image} alt="" className="w-24 h-24 object-cover rounded-lg border flex-shrink-0" style={{ borderColor: theme.colors.border }} />
              ) : (
                <div
                  className="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0 border"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.secondary }}
                >
                  <PackagePlus className="w-8 h-8 opacity-40" />
                </div>
              )}
              <div className="text-sm space-y-1" style={{ color: theme.colors.textSecondary }}>
                <p className="font-medium" style={{ color: theme.colors.text }}>
                  {selected.product_name}
                </p>
                <p>
                  {'Current stock'}: <strong>{selected.quantity}</strong>
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
              {'Quantity'}
            </label>
            <input
              type="number"
              min={1}
              className="w-full py-3 px-3 rounded-lg border text-base min-h-[44px]"
              style={{ borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.cardBg }}
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
              {'Note (optional)'}
            </label>
            <textarea
              className="w-full py-3 px-3 rounded-lg border text-base min-h-[88px]"
              style={{ borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.cardBg }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-lg font-semibold text-white min-h-[48px] touch-manipulation disabled:opacity-60"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {saving ? '…' : 'Receive stock'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
