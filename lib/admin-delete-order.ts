import { supabaseAdmin } from '@/lib/supabase/admin';
import { adjustVariantQuantityByDelta, isReturnedStatus, normalizeOrderStatus } from '@/lib/admin-order-stock';
import { logger } from '@/lib/logger';

type OrderItemRow = {
  productvariantid?: string | null;
  quantity?: number | null;
};

/**
 * When an order is deleted: put variant quantities back unless the order was
 * marked returned with stock already credited (return_stock_applied).
 */
async function restoreStockForDeletion(orderId: string, items: OrderItemRow[], skipRestore: boolean) {
  if (skipRestore) return { ok: true as const };
  for (const item of items) {
    const vid = item.productvariantid;
    const qty = Number(item.quantity) || 0;
    if (!vid || qty <= 0) continue;
    const res = await adjustVariantQuantityByDelta({
      productvariantid: vid,
      delta: qty,
      movement_type: 'order_deleted',
      related_order_id: orderId,
      note: 'Order deleted',
      allowNegative: true,
    });
    if (!res.ok) return res;
  }
  return { ok: true as const };
}

/**
 * Deletes one order: optional stock restore, history/movement rows, order_items, orders.
 */
export async function deleteOrderByOrderId(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select(
      `
      orderid,
      status,
      return_stock_applied,
      order_items (
        orderitemid,
        quantity,
        productvariantid
      )
    `
    )
    .eq('orderid', orderId)
    .single();

  if (fetchError || !order) {
    return { ok: false, error: fetchError?.message || 'Order not found' };
  }

  const status = normalizeOrderStatus((order as { status?: string }).status || '');
  const returnApplied = Boolean((order as { return_stock_applied?: boolean }).return_stock_applied);
  const wasFullyReturned = isReturnedStatus(status) && returnApplied;
  const items = ((order as { order_items?: OrderItemRow[] }).order_items || []) as OrderItemRow[];

  const stockRes = await restoreStockForDeletion(orderId, items, wasFullyReturned);
  if (!stockRes.ok) return stockRes;

  const { error: histErr } = await supabaseAdmin.from('order_status_history').delete().eq('order_id', orderId);
  if (histErr && histErr.code !== '42P01') {
    logger.warn('order_status_history delete failed');
  }
  const { error: movErr } = await supabaseAdmin.from('stock_movements').delete().eq('related_order_id', orderId);
  if (movErr && movErr.code !== '42P01') {
    logger.warn('stock_movements delete failed');
  }

  const { error: itemsErr } = await supabaseAdmin.from('order_items').delete().eq('orderid', orderId);
  if (itemsErr) {
    return { ok: false, error: itemsErr.message || 'Failed to delete order items' };
  }

  const { error: orderErr } = await supabaseAdmin.from('orders').delete().eq('orderid', orderId);
  if (orderErr) {
    return { ok: false, error: orderErr.message || 'Failed to delete order' };
  }

  return { ok: true };
}
