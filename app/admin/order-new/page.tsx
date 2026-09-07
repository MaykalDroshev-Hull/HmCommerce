'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Plus, Trash2, X } from 'lucide-react';

interface StockVariant {
  productvariantid: string;
  productid: string;
  product_name: string;
  sku: string | null;
  price: number;
  quantity: number;
  primary_image?: string | null;
  characteristics: Array<{ property_name: string; value: string }>;
}

type Line = {
  id: string;
  productVariantId: string;
  label: string;
  image: string | null;
  available: number;
  quantity: number;
  unitPrice: number;
};

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function isSizeProperty(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('size');
}

function getVariantOptionLabel(v: StockVariant): string {
  const sizeChar = v.characteristics.find((c) => isSizeProperty(c.property_name));
  const otherChars = v.characteristics.filter((c) => !isSizeProperty(c.property_name));

  const parts: string[] = [];
  if (sizeChar?.value) {
    parts.push(sizeChar.value);
  }
  if (otherChars.length) {
    parts.push(...otherChars.map((c) => c.value));
  }
  if (!parts.length) {
    const all = v.characteristics.map((c) => c.value).filter(Boolean);
    if (all.length) parts.push(...all);
    else if (v.sku) parts.push(v.sku);
    else parts.push(v.productvariantid.slice(0, 8));
  }

  return `${parts.join(' · ')} · Q:${v.quantity}`;
}

function sortVariantsForPicker(list: StockVariant[]): StockVariant[] {
  return [...list].sort((a, b) => {
    const sizeA = a.characteristics.find((c) => isSizeProperty(c.property_name))?.value ?? '';
    const sizeB = b.characteristics.find((c) => isSizeProperty(c.property_name))?.value ?? '';
    const numA = parseFloat(sizeA);
    const numB = parseFloat(sizeB);
    if (!Number.isNaN(numA) && !Number.isNaN(numB) && sizeA !== '' && sizeB !== '') {
      return numA - numB;
    }
    return getVariantOptionLabel(a).localeCompare(getVariantOptionLabel(b), 'bg', { numeric: true });
  });
}

function stockWarningBg(language: string, available: number, lineQty: number): string | null {
  if (available < 0) {
    return 'Warning: no stock. You can continue if delivery is expected.';
  }
  if (available < lineQty) {
    return 'Warning: insufficient stock. You can continue if delivery is expected.';
  }
  const after = available - lineQty;
  if (after === 1) {
    return 'Warning: only 1 piece will remain after this order.';
  }
  return null;
}

export default function AdminNewOrderPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [variants, setVariants] = useState<StockVariant[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [econtOffice, setEcontOffice] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [deliveryCost, setDeliveryCost] = useState(0);

  const [pickProductId, setPickProductId] = useState('');
  const [pickVariant, setPickVariant] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  const variantMap = useMemo(() => {
    const m = new Map<string, StockVariant>();
    variants.forEach((v) => m.set(v.productvariantid, v));
    return m;
  }, [variants]);

  const productsGrouped = useMemo(() => {
    const map = new Map<string, { productid: string; product_name: string; variants: StockVariant[] }>();
    variants.forEach((v) => {
      let group = map.get(v.productid);
      if (!group) {
        group = { productid: v.productid, product_name: v.product_name, variants: [] };
        map.set(v.productid, group);
      }
      group.variants.push(v);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name, 'bg', { sensitivity: 'base' })
    );
  }, [variants]);

  const variantsForProduct = useMemo(() => {
    if (!pickProductId) return [];
    const group = productsGrouped.find((p) => p.productid === pickProductId);
    return sortVariantsForPicker(group?.variants ?? []);
  }, [pickProductId, productsGrouped]);

  const addLine = () => {
    if (!pickVariant) return;
    const v = variantMap.get(pickVariant);
    if (!v) return;
    const label = `${v.product_name} (${v.characteristics.map((c) => `${c.value}`).join(', ') || v.sku || ''})`;
    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        productVariantId: v.productvariantid,
        label,
        image: v.primary_image || null,
        available: v.quantity,
        quantity: 1,
        unitPrice: v.price || 0,
      },
    ]);
    setPickProductId('');
    setPickVariant('');
  };

  const selectStyle = {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBg,
    color: theme.colors.text,
  };

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = subtotal + (Number(deliveryCost) || 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!fullName.trim() || !phone.trim() || !city.trim()) {
      setMsg('Fill name, phone and city.');
      return;
    }
    if (!lines.length) {
      setMsg('Add at least one line.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            city: city.trim(),
            region: region.trim() || undefined,
            econtOfficeId: econtOffice.trim() || undefined,
            customerNote: customerNote.trim() || undefined,
          },
          internalNote: internalNote.trim() || undefined,
          deliveryType: 'office',
          subtotal,
          deliveryCost: Number(deliveryCost) || 0,
          total,
          items: lines.map((l) => ({
            productVariantId: l.productVariantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`Order created: ${data.orderId}`);
        setLines([]);
        setFullName('');
        setPhone('');
        setEmail('');
        setCity('');
        setRegion('');
        setEcontOffice('');
        setCustomerNote('');
        setInternalNote('');
        const stockRes = await fetch('/api/admin/stock');
        const stockJson = await stockRes.json();
        if (stockJson.success) setVariants(stockJson.variants || []);
      } else {
        setMsg(data.error || 'Error');
      }
    } catch {
      setMsg('Network error');
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
    <AdminLayout currentPath="/admin/order-new">
      <div className="p-3 sm:p-4 lg:p-6 max-w-3xl mx-auto space-y-6 pb-24">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.text }}>
            {'New order'}
          </h1>
          <p className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
            {'Stock is decreased on save (server-side).'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-8">
          <section className="rounded-xl border p-4 space-y-3" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
            <h2 className="font-semibold" style={{ color: theme.colors.text }}>
              {'Customer'}
            </h2>
            <input
              required
              className="w-full py-3 px-3 rounded-lg border min-h-[44px]"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBg, color: theme.colors.text }}
              placeholder={'Full name'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              required
              className="w-full py-3 px-3 rounded-lg border min-h-[44px]"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBg, color: theme.colors.text }}
              placeholder={'Phone'}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="w-full py-3 px-3 rounded-lg border min-h-[44px]"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBg, color: theme.colors.text }}
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              required
              className="w-full py-3 px-3 rounded-lg border min-h-[44px]"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBg, color: theme.colors.text }}
              placeholder={'City'}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              className="w-full py-3 px-3 rounded-lg border min-h-[44px]"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBg, color: theme.colors.text }}
              placeholder={'Region (optional)'}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
            <input
              className="w-full py-3 px-3 rounded-lg border min-h-[44px]"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBg, color: theme.colors.text }}
              placeholder={'Econt office ID'}
              value={econtOffice}
              onChange={(e) => setEcontOffice(e.target.value)}
            />
            <textarea
              className="w-full py-3 px-3 rounded-lg border min-h-[72px]"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBg, color: theme.colors.text }}
              placeholder={'Customer note'}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
            />
            <textarea
              className="w-full py-3 px-3 rounded-lg border min-h-[72px]"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBg, color: theme.colors.text }}
              placeholder={'Internal note'}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
            />
          </section>

          <section className="rounded-xl border p-4 space-y-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
            <h2 className="font-semibold" style={{ color: theme.colors.text }}>
              {'Items'}
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <select
                className="flex-1 min-w-[140px] py-3 px-3 rounded-lg border min-h-[44px]"
                style={selectStyle}
                value={pickProductId}
                onChange={(e) => {
                  setPickProductId(e.target.value);
                  setPickVariant('');
                }}
              >
                <option value="">{'— Pick product —'}</option>
                {productsGrouped.map((p) => (
                  <option key={p.productid} value={p.productid}>
                    {p.product_name}
                  </option>
                ))}
              </select>
              <select
                className="flex-1 min-w-[140px] py-3 px-3 rounded-lg border min-h-[44px] disabled:opacity-50"
                style={selectStyle}
                value={pickVariant}
                disabled={!pickProductId}
                onChange={(e) => setPickVariant(e.target.value)}
              >
                <option value="">{'— Pick size —'}</option>
                {variantsForProduct.map((v) => (
                  <option key={v.productvariantid} value={v.productvariantid}>
                    {getVariantOptionLabel(v)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addLine}
                disabled={!pickVariant}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-white min-h-[44px] disabled:opacity-50 sm:flex-shrink-0"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <Plus className="w-4 h-4" />
                {'Add'}
              </button>
            </div>

            <div className="space-y-4">
              {lines.map((line) => {
                const w = stockWarningBg(language, line.available, line.quantity);
                const wKey = line.id;
                const showW = w && !dismissed[wKey];
                return (
                  <div key={line.id} className="border rounded-lg p-3 space-y-2" style={{ borderColor: theme.colors.border }}>
                    {showW && (
                      <div className="flex items-start justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3">
                        <span>{w}</span>
                        <button type="button" className="p-1 shrink-0" aria-label="Close" onClick={() => setDismissed((d) => ({ ...d, [wKey]: true }))}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-3">
                      {line.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={line.image} alt="" className="w-16 h-16 object-cover rounded-md border flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-gray-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                          {line.label}
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <label className="text-xs" style={{ color: theme.colors.textSecondary }}>
                            {'Qty'}
                            <input
                              type="number"
                              min={1}
                              className="ml-1 w-20 py-2 px-2 rounded border"
                              style={{ borderColor: theme.colors.border }}
                              value={line.quantity}
                              onChange={(e) => {
                                const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, quantity: q } : l)));
                              }}
                            />
                          </label>
                          <label className="text-xs" style={{ color: theme.colors.textSecondary }}>
                            {'Price'}
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className="ml-1 w-24 py-2 px-2 rounded border"
                              style={{ borderColor: theme.colors.border }}
                              value={line.unitPrice}
                              onChange={(e) => {
                                const p = Math.max(0, parseFloat(e.target.value) || 0);
                                setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, unitPrice: p } : l)));
                              }}
                            />
                          </label>
                          <span className="text-sm font-semibold ml-auto" style={{ color: theme.colors.text }}>
                            {(line.unitPrice * line.quantity).toFixed(2)} €
                          </span>
                          <button
                            type="button"
                            className="p-2 text-red-600"
                            onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                            aria-label="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <label className="text-sm flex items-center gap-2" style={{ color: theme.colors.text }}>
                {'Delivery (€)'}
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-28 py-2 px-2 rounded border"
                  style={{ borderColor: theme.colors.border }}
                  value={deliveryCost}
                  onChange={(e) => setDeliveryCost(parseFloat(e.target.value) || 0)}
                />
              </label>
              <div className="sm:ml-auto text-right space-y-1">
                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  {'Subtotal'}: {subtotal.toFixed(2)} €
                </p>
                <p className="text-lg font-bold" style={{ color: theme.colors.text }}>
                  {'Total'}: {total.toFixed(2)} €
                </p>
              </div>
            </div>
          </section>

          {msg && <p className="text-sm text-center text-gray-700">{msg}</p>}

          <button
            type="submit"
            disabled={saving}
            className="fixed bottom-4 left-4 right-4 sm:static sm:w-full py-4 rounded-xl font-semibold text-white shadow-lg min-h-[52px] z-30 max-w-3xl mx-auto sm:mx-0"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {saving ? '…' : 'Save order'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
