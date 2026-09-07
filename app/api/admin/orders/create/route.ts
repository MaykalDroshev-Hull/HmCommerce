export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decreaseStockForOrderItems, normalizeOrderStatus } from '@/lib/admin-order-stock';
import { generateUniqueOrderId } from '@/lib/order-id';
import { logger } from '@/lib/logger';


interface CreateAdminOrderBody {
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    city: string;
    region?: string;
    econtOfficeId?: string;
    customerNote?: string;
  };
  internalNote?: string;
  deliveryType?: string;
  deliveryNotes?: string;
  subtotal: number;
  deliveryCost: number;
  total: number;
  items: Array<{
    productVariantId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

function splitName(fullName: string): { first: string; last: string } {
  const t = fullName.trim();
  if (!t) return { first: 'Customer', last: '' };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

async function getOrCreateCustomerForAdmin(c: CreateAdminOrderBody['customer']): Promise<string> {
  const phone = c.phone?.trim();
  const emailInput = c.email?.trim();
  const syntheticEmail =
    emailInput ||
    (phone ? `phone-${phone.replace(/\W/g, '')}@admin-orders.local` : `guest-${Date.now()}@admin-orders.local`);

  const { data: byEmail } = await supabaseAdmin
    .from('customers')
    .select('customerid')
    .eq('email', syntheticEmail)
    .maybeSingle();

  if (byEmail?.customerid) {
    const { first, last } = splitName(c.fullName);
    await supabaseAdmin
      .from('customers')
      .update({
        firstname: first,
        lastname: last,
        telephone: phone || null,
        city: c.city,
        updatedat: new Date().toISOString(),
      })
      .eq('customerid', byEmail.customerid);
    return byEmail.customerid;
  }

  if (phone) {
    const { data: byPhone } = await supabaseAdmin
      .from('customers')
      .select('customerid, email')
      .eq('telephone', phone)
      .maybeSingle();
    if (byPhone?.customerid) {
      const { first, last } = splitName(c.fullName);
      await supabaseAdmin
        .from('customers')
        .update({
          firstname: first,
          lastname: last,
          email: emailInput || byPhone.email,
          city: c.city,
          updatedat: new Date().toISOString(),
        })
        .eq('customerid', byPhone.customerid);
      return byPhone.customerid;
    }
  }

  const { first, last } = splitName(c.fullName);
  const { data: created, error } = await supabaseAdmin
    .from('customers')
    .insert({
      firstname: first,
      lastname: last,
      email: syntheticEmail,
      telephone: phone || '',
      country: 'Bulgaria',
      city: c.city,
    })
    .select('customerid')
    .single();

  if (error || !created) {
    throw new Error(error?.message || 'Failed to create customer');
  }
  return created.customerid;
}

async function insertStatusHistory(params: {
  orderId: string;
  oldStatus: string | null;
  newStatus: string;
  note?: string | null;
  changedBy?: string | null;
}) {
  const { error } = await supabaseAdmin.from('order_status_history').insert({
    order_id: params.orderId,
    old_status: params.oldStatus,
    new_status: params.newStatus,
    note: params.note ?? null,
    changed_by: params.changedBy ?? null,
  });
  if (error && error.code !== '42P01') {
    logger.warn('order_status_history insert skipped:');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAdminOrderBody;
    if (!body.customer?.fullName || !body.customer?.phone || !body.customer?.city) {
      return NextResponse.json(
        { success: false, error: 'Missing required customer fields (name, phone, city).' },
        { status: 400 }
      );
    }
    if (!body.items?.length) {
      return NextResponse.json({ success: false, error: 'Please add at least one item.' }, { status: 400 });
    }

    const customerId = await getOrCreateCustomerForAdmin(body.customer);
    const orderId = await generateUniqueOrderId(supabaseAdmin);
    const now = new Date().toISOString();

    const orderRecord: Record<string, unknown> = {
      orderid: orderId,
      customerid: customerId,
      deliverytype: body.deliveryType || 'office',
      deliverynotes: body.deliveryNotes?.trim() || null,
      econtoffice: body.customer.econtOfficeId || null,
      delivery_region: body.customer.region?.trim() || null,
      customer_order_note: body.customer.customerNote?.trim() || null,
      internal_note: body.internalNote?.trim() || null,
      subtotal: body.subtotal,
      deliverycost: body.deliveryCost,
      total: body.total,
      status: 'new',
      return_stock_applied: false,
      createdat: now,
      updatedat: now,
    };

    const { error: orderErr } = await supabaseAdmin.from('orders').insert(orderRecord);
    if (orderErr) {
      logger.error('admin create order insert error:', orderErr);
      return NextResponse.json(
        { success: false, error: orderErr.message || 'Failed to create order' },
        { status: 500 }
      );
    }

    const rows = await Promise.all(
      body.items.map(async (line) => {
        const { data: variant } = await supabaseAdmin
          .from('product_variants')
          .select('productid, price')
          .eq('productvariantid', line.productVariantId)
          .single();
        const price = line.unitPrice ?? variant?.price ?? 0;
        return {
          orderid: orderId,
          productid: variant?.productid ?? null,
          productvariantid: line.productVariantId,
          quantity: line.quantity,
          price,
          createdat: now,
        };
      })
    );

    const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(rows);
    if (itemsErr) {
      await supabaseAdmin.from('orders').delete().eq('orderid', orderId);
      return NextResponse.json(
        { success: false, error: itemsErr.message || 'Failed to save order items' },
        { status: 500 }
      );
    }

    const stockRes = await decreaseStockForOrderItems({
      orderId,
      items: rows.map((r) => ({ productvariantid: r.productvariantid, quantity: r.quantity })),
      movementType: 'order_created',
    });
    if (!stockRes.ok) {
      await supabaseAdmin.from('order_items').delete().eq('orderid', orderId);
      await supabaseAdmin.from('orders').delete().eq('orderid', orderId);
      return NextResponse.json(
        { success: false, error: stockRes.error || 'Error reducing stock' },
        { status: 500 }
      );
    }

    await insertStatusHistory({
      orderId,
      oldStatus: null,
      newStatus: normalizeOrderStatus('new'),
      note: 'Created by admin (New order)',
    });

    return NextResponse.json({ success: true, orderId });
  } catch (e) {
    logger.error('admin order create:', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
