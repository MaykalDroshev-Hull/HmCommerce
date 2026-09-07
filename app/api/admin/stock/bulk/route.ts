export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adjustVariantQuantityByDelta } from '@/lib/admin-order-stock';
import { roundMoney } from '@/lib/product-promo';
import { logger } from '@/lib/logger';


type BulkUpdateItem = {
  productvariantid: string;
  action: 'set' | 'add' | 'remove';
  quantity: number;
};

type VariantFieldUpdate = {
  productvariantid: string;
  quantity?: number;
  price?: number;
  promotional_price?: number | null;
};

type BulkRequestBody = {
  updates?: BulkUpdateItem[];
  variantUpdates?: VariantFieldUpdate[];
  variantIds?: string[];
  quantity?: number;
  action?: 'add' | 'remove';
};

const LARGE_REDUCTION_THRESHOLD = 10;

function normalizePrice(value: number): number {
  return roundMoney(value);
}

function validatePromoPrice(price: number, promotionalPrice: number | null): string | null {
  if (promotionalPrice == null) return null;
  if (promotionalPrice < 0) return 'Promotional price cannot be negative';
  if (price > 0 && promotionalPrice >= price) {
    return 'Promotional price must be lower than regular price';
  }
  return null;
}

async function handleStockAdjustments(updates: BulkUpdateItem[]) {
  const variantIds = [...new Set(updates.map((u) => u.productvariantid))];
  const { data: existingVariants, error: fetchError } = await supabaseAdmin
    .from('product_variants')
    .select('productvariantid, quantity, trackquantity')
    .in('productvariantid', variantIds);

  if (fetchError) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch variants for update' },
      { status: 500 }
    );
  }

  const variantMap = new Map(
    (existingVariants || []).map((v) => [v.productvariantid, v])
  );

  for (const id of variantIds) {
    if (!variantMap.has(id)) {
      return NextResponse.json(
        { success: false, error: `Variant not found: ${id}` },
        { status: 404 }
      );
    }
  }

  const results: Array<{
    productvariantid: string;
    quantity: number;
    previousQuantity: number;
  }> = [];

  for (const item of updates) {
    const variant = variantMap.get(item.productvariantid)!;
    const current = Number(variant.quantity) || 0;
    let newQuantity = current;

    if (item.action === 'add') {
      newQuantity = current + item.quantity;
    } else if (item.action === 'remove') {
      newQuantity = current - item.quantity;
    } else {
      newQuantity = item.quantity;
    }

    if (variant.trackquantity !== false && newQuantity < 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Stock cannot become negative (variant ${item.productvariantid})`,
        },
        { status: 400 }
      );
    }

    const delta = newQuantity - current;
    if (delta === 0) {
      results.push({
        productvariantid: item.productvariantid,
        quantity: newQuantity,
        previousQuantity: current,
      });
      continue;
    }

    const movementType = item.action === 'add' ? 'stock_in' : 'manual_adjustment';
    const res = await adjustVariantQuantityByDelta({
      productvariantid: item.productvariantid,
      delta,
      movement_type: movementType,
      allowNegative: false,
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: res.error || 'Failed to update variant quantity',
          partialResults: results,
        },
        { status: 400 }
      );
    }

    results.push({
      productvariantid: item.productvariantid,
      quantity: res.newQuantity ?? newQuantity,
      previousQuantity: current,
    });
  }

  return NextResponse.json({
    success: true,
    updated: results,
    largeReductionThreshold: LARGE_REDUCTION_THRESHOLD,
  });
}

async function handleVariantFieldUpdates(variantUpdates: VariantFieldUpdate[]) {
  if (variantUpdates.length === 0) {
    return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
  }

  for (const item of variantUpdates) {
    if (!item.productvariantid) {
      return NextResponse.json(
        { success: false, error: 'Each update requires productvariantid' },
        { status: 400 }
      );
    }
    if (
      item.quantity !== undefined &&
      (typeof item.quantity !== 'number' || item.quantity < 0 || !Number.isFinite(item.quantity))
    ) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a non-negative number' },
        { status: 400 }
      );
    }
    if (
      item.price !== undefined &&
      (typeof item.price !== 'number' || item.price < 0 || !Number.isFinite(item.price))
    ) {
      return NextResponse.json(
        { success: false, error: 'Price must be a non-negative number' },
        { status: 400 }
      );
    }
    if (
      item.promotional_price !== undefined &&
      item.promotional_price !== null &&
      (typeof item.promotional_price !== 'number' ||
        item.promotional_price < 0 ||
        !Number.isFinite(item.promotional_price))
    ) {
      return NextResponse.json(
        { success: false, error: 'Promotional price must be a non-negative number or null' },
        { status: 400 }
      );
    }
  }

  const variantIds = [...new Set(variantUpdates.map((u) => u.productvariantid))];
  const { data: existingVariants, error: fetchError } = await supabaseAdmin
    .from('product_variants')
    .select('productvariantid, quantity, trackquantity, price, promotional_price')
    .in('productvariantid', variantIds);

  if (fetchError) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch variants for update' },
      { status: 500 }
    );
  }

  const variantMap = new Map(
    (existingVariants || []).map((v) => [v.productvariantid, v])
  );

  for (const id of variantIds) {
    if (!variantMap.has(id)) {
      return NextResponse.json(
        { success: false, error: `Variant not found: ${id}` },
        { status: 404 }
      );
    }
  }

  const results: Array<{
    productvariantid: string;
    quantity?: number;
    price?: number;
    promotional_price?: number | null;
  }> = [];

  for (const item of variantUpdates) {
    const existing = variantMap.get(item.productvariantid)!;
    const nextPrice =
      item.price !== undefined ? normalizePrice(item.price) : normalizePrice(Number(existing.price) || 0);
    const nextPromo =
      item.promotional_price !== undefined
        ? item.promotional_price == null
          ? null
          : normalizePrice(item.promotional_price)
        : existing.promotional_price != null
          ? normalizePrice(Number(existing.promotional_price))
          : null;

    const promoError = validatePromoPrice(nextPrice, nextPromo);
    if (promoError) {
      return NextResponse.json({ success: false, error: promoError }, { status: 400 });
    }

    if (item.quantity !== undefined) {
      const current = Number(existing.quantity) || 0;
      const newQuantity = item.quantity;
      if (existing.trackquantity !== false && newQuantity < 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock cannot become negative (variant ${item.productvariantid})`,
          },
          { status: 400 }
        );
      }

      const delta = newQuantity - current;
      if (delta !== 0) {
        const res = await adjustVariantQuantityByDelta({
          productvariantid: item.productvariantid,
          delta,
          movement_type: 'manual_adjustment',
          allowNegative: false,
        });
        if (!res.ok) {
          return NextResponse.json(
            { success: false, error: res.error || 'Failed to update quantity', partialResults: results },
            { status: 400 }
          );
        }
      }
    }

    const patch: Record<string, unknown> = { updatedat: new Date().toISOString() };
    if (item.price !== undefined) patch.price = nextPrice;
    if (item.promotional_price !== undefined) patch.promotional_price = nextPromo;

    if (item.price !== undefined || item.promotional_price !== undefined) {
      const { error: updateError } = await supabaseAdmin
        .from('product_variants')
        .update(patch)
        .eq('productvariantid', item.productvariantid);

      if (updateError) {
        const missingColumn =
          updateError.message?.includes('promotional_price') ||
          updateError.code === '42703';
        return NextResponse.json(
          {
            success: false,
            error: missingColumn
              ? 'Column promotional_price is missing. Run migration-add-variant-promotional-price.sql'
              : updateError.message || 'Failed to update variant',
            partialResults: results,
          },
          { status: 400 }
        );
      }
    }

    const { data: refreshed } = await supabaseAdmin
      .from('product_variants')
      .select('productvariantid, quantity, price, promotional_price')
      .eq('productvariantid', item.productvariantid)
      .single();

    results.push({
      productvariantid: item.productvariantid,
      quantity: refreshed?.quantity != null ? Number(refreshed.quantity) : item.quantity,
      price: refreshed?.price != null ? Number(refreshed.price) : nextPrice,
      promotional_price:
        refreshed?.promotional_price != null
          ? Number(refreshed.promotional_price)
          : nextPromo,
    });
  }

  return NextResponse.json({ success: true, updated: results });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkRequestBody;

    if (body.variantUpdates && Array.isArray(body.variantUpdates)) {
      return handleVariantFieldUpdates(body.variantUpdates);
    }

    let updates: BulkUpdateItem[] = [];

    if (body.updates && Array.isArray(body.updates)) {
      updates = body.updates;
    } else if (
      body.variantIds &&
      Array.isArray(body.variantIds) &&
      body.variantIds.length > 0 &&
      body.action &&
      (body.action === 'add' || body.action === 'remove') &&
      typeof body.quantity === 'number'
    ) {
      updates = body.variantIds.map((productvariantid) => ({
        productvariantid,
        action: body.action as 'add' | 'remove',
        quantity: body.quantity as number,
      }));
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid bulk update payload' },
        { status: 400 }
      );
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
    }

    for (const item of updates) {
      if (!item.productvariantid || !item.action) {
        return NextResponse.json(
          { success: false, error: 'Each update requires productvariantid and action' },
          { status: 400 }
        );
      }
      if (typeof item.quantity !== 'number' || item.quantity < 0 || !Number.isFinite(item.quantity)) {
        return NextResponse.json(
          { success: false, error: 'Quantity must be a non-negative number' },
          { status: 400 }
        );
      }
      if ((item.action === 'add' || item.action === 'remove') && item.quantity === 0) {
        return NextResponse.json(
          { success: false, error: 'Adjustment quantity must be greater than zero' },
          { status: 400 }
        );
      }
    }

    return handleStockAdjustments(updates);
  } catch (error) {
    logger.error('Bulk stock API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
