'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import AdminModal from './AdminModal';
import {
  getVariantOptionLabel,
  sortVariantsForPicker,
  stockWarningBg,
  uid,
  type OrderFormLine,
  type StockVariant,
} from '@/lib/admin-order-form';

export interface OrderEditSource {
  orderid: string;
  customerfirstname?: string;
  customerlastname?: string;
  customeremail?: string;
  customertelephone?: string;
  customercity?: string;
  customercountry?: string;
  deliverytype?: string;
  econtoffice?: string;
  deliverynotes?: string | null;
  delivery_region?: string | null;
  customer_order_note?: string | null;
  internal_note?: string | null;
  deliverycost?: number;
  subtotal?: number;
  total?: number;
  return_stock_applied?: boolean;
  order_items?: Array<{
    productvariantid?: string;
    quantity: number;
    price: number;
    product: {
      name: string;
      allProperties?: Record<string, string>;
    };
  }>;
}

interface OrderEditModalProps {
  isOpen: boolean;
  order: OrderEditSource | null;
  language: string;
  adminUserId?: string | null;
  onClose: () => void;
  onSaved: (orderId: string) => void;
}

function lineLabelFromItem(item: NonNullable<OrderEditSource['order_items']>[number]): string {
  const props = item.product.allProperties
    ? Object.values(item.product.allProperties).filter(Boolean).join(', ')
    : '';
  return `${item.product.name}${props ? ` (${props})` : ''}`;
}

export default function OrderEditModal({
  isOpen,
  order,
  language,
  adminUserId,
  onClose,
  onSaved,
}: OrderEditModalProps) {
  const [variants, setVariants] = useState<StockVariant[]>([]);
  const [lines, setLines] = useState<OrderFormLine[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('Bulgaria');
  const [econtOffice, setEcontOffice] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryCost, setDeliveryCost] = useState(0);

  const [pickProductId, setPickProductId] = useState('');
  const [pickVariant, setPickVariant] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const itemsLocked = Boolean(order?.return_stock_applied);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const res = await fetch('/api/admin/stock');
      const data = await res.json();
      if (data.success) setVariants(data.variants || []);
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !order) return;
    setMsg(null);
    setDismissed({});
    setFullName(`${order.customerfirstname || ''} ${order.customerlastname || ''}`.trim());
    setPhone(order.customertelephone || '');
    setEmail(order.customeremail || '');
    setCity(order.customercity || '');
    setRegion(order.delivery_region || '');
    setCountry(order.customercountry || 'Bulgaria');
    setEcontOffice(order.econtoffice || '');
    setCustomerNote(order.customer_order_note || '');
    setInternalNote(order.internal_note || '');
    setDeliveryNotes(order.deliverynotes || '');
    setDeliveryCost(Number(order.deliverycost) || 0);
    setPickProductId('');
    setPickVariant('');

    const initialLines: OrderFormLine[] = (order.order_items || [])
      .filter((item) => item.productvariantid)
      .map((item) => ({
        id: uid(),
        productVariantId: item.productvariantid!,
        label: lineLabelFromItem(item),
        image: null,
        available: 0,
        quantity: item.quantity,
        unitPrice: item.price,
      }));
    setLines(initialLines);
  }, [isOpen, order]);

  useEffect(() => {
    if (!variants.length || !lines.length) return;
    setLines((prev) =>
      prev.map((line) => {
        const v = variants.find((x) => x.productvariantid === line.productVariantId);
        if (!v) return line;
        return {
          ...line,
          available: v.quantity,
          image: v.primary_image || line.image,
          unitPrice: line.unitPrice || v.price,
        };
      })
    );
  }, [variants]);

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
    if (itemsLocked || !pickVariant) return;
    const v = variantMap.get(pickVariant);
    if (!v) return;
    const label = `${v.product_name} (${v.characteristics.map((c) => c.value).join(', ') || v.sku || ''})`;
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

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = subtotal + (Number(deliveryCost) || 0);

  const save = async () => {
    if (!order) return;
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
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderid)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            city: city.trim(),
            region: region.trim() || undefined,
            country: country.trim() || undefined,
            econtOfficeId: econtOffice.trim() || undefined,
            customerNote: customerNote.trim() || undefined,
          },
          internalNote: internalNote.trim() || undefined,
          deliveryType: order.deliverytype || 'office',
          deliveryNotes: deliveryNotes.trim() || undefined,
          subtotal,
          deliveryCost: Number(deliveryCost) || 0,
          total,
          changedBy: adminUserId || undefined,
          items: lines.map((l) => ({
            productVariantId: l.productVariantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(order.orderid);
        onClose();
      } else {
        setMsg(data.error || 'Error');
      }
    } catch {
      setMsg('Network error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full py-2.5 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm min-h-[44px]';
  const selectClass =
    'flex-1 min-w-[120px] py-2.5 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm min-h-[44px]';

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={'Edit order'}
      subheader={order ? `#${order.orderid}` : undefined}
      maxWidth="max-w-4xl"
      minWidth={320}
      minHeight={480}
    >
      {order && (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {itemsLocked && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-sm p-3">
              {'This order was returned — line items cannot be changed. You can still edit customer, delivery and notes.'}
            </div>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {'Customer'}
            </h3>
            <input
              className={inputClass}
              placeholder={'Full name'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder={'Phone'}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className={inputClass}
                placeholder={'City'}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder={'Region'}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
            <input
              className={inputClass}
              placeholder={'Econt office ID'}
              value={econtOffice}
              onChange={(e) => setEcontOffice(e.target.value)}
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {'Notes'}
            </h3>
            <textarea
              className={`${inputClass} min-h-[72px]`}
              placeholder={'Customer note'}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
            />
            <textarea
              className={`${inputClass} min-h-[72px]`}
              placeholder={'Internal note'}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
            />
            <textarea
              className={`${inputClass} min-h-[60px]`}
              placeholder={'Delivery notes'}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {'Items'}
            </h3>
            {!itemsLocked && (
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <select
                  className={selectClass}
                  value={pickProductId}
                  onChange={(e) => {
                    setPickProductId(e.target.value);
                    setPickVariant('');
                  }}
                >
                  <option value="">{'— Product —'}</option>
                  {productsGrouped.map((p) => (
                    <option key={p.productid} value={p.productid}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  value={pickVariant}
                  disabled={!pickProductId}
                  onChange={(e) => setPickVariant(e.target.value)}
                >
                  <option value="">{'— Size —'}</option>
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
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-blue-600 min-h-[44px] disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {'Add'}
                </button>
              </div>
            )}

            <div className="space-y-3">
              {lines.map((line) => {
                const w = stockWarningBg(language, line.available, line.quantity);
                const showW = w && !dismissed[line.id];
                return (
                  <div key={line.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    {showW && (
                      <div className="flex items-start justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs p-2">
                        <span>{w}</span>
                        <button
                          type="button"
                          className="p-1 shrink-0"
                          onClick={() => setDismissed((d) => ({ ...d, [line.id]: true }))}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-3">
                      {line.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={line.image} alt="" className="w-14 h-14 object-cover rounded border flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded bg-gray-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{line.label}</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <label className="text-xs text-gray-600">
                            {'Qty'}
                            <input
                              type="number"
                              min={1}
                              disabled={itemsLocked}
                              className="ml-1 w-16 py-1.5 px-2 rounded border border-gray-300 disabled:opacity-50"
                              value={line.quantity}
                              onChange={(e) => {
                                const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setLines((prev) =>
                                  prev.map((l) => (l.id === line.id ? { ...l, quantity: q } : l))
                                );
                              }}
                            />
                          </label>
                          <label className="text-xs text-gray-600">
                            {'Price'}
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className="ml-1 w-20 py-1.5 px-2 rounded border border-gray-300"
                              value={line.unitPrice}
                              onChange={(e) => {
                                const p = Math.max(0, parseFloat(e.target.value) || 0);
                                setLines((prev) =>
                                  prev.map((l) => (l.id === line.id ? { ...l, unitPrice: p } : l))
                                );
                              }}
                            />
                          </label>
                          <span className="text-sm font-semibold ml-auto">
                            {(line.unitPrice * line.quantity).toFixed(2)} €
                          </span>
                          {!itemsLocked && (
                            <button
                              type="button"
                              className="p-1.5 text-red-600"
                              onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-4">
            <label className="text-sm text-gray-700 flex items-center gap-2">
              {'Delivery (€)'}
              <input
                type="number"
                min={0}
                step={0.01}
                className="w-24 py-1.5 px-2 rounded border border-gray-300"
                value={deliveryCost}
                onChange={(e) => setDeliveryCost(parseFloat(e.target.value) || 0)}
              />
            </label>
            <div className="ml-auto text-right space-y-1">
              <p className="text-sm text-gray-600">
                {'Subtotal'}: {subtotal.toFixed(2)} €
              </p>
              <p className="text-base font-bold text-gray-900">
                {'Total'}: {total.toFixed(2)} €
              </p>
            </div>
          </div>

          {msg && <p className="text-sm text-center text-red-600">{msg}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-lg border border-gray-300 text-sm font-medium min-h-[44px]"
            >
              {'Cancel'}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-3 rounded-lg bg-blue-600 text-white text-sm font-medium min-h-[44px] disabled:opacity-50"
            >
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </AdminModal>
  );
}
