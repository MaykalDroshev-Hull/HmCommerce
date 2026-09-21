export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';

// Helper to calculate exact start and end of "Today" in Europe/London timezone
function getUkDayRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';

  // Determine timezone offset for London on this date
  const testIso = `${year}-${month}-${day}T12:00:00Z`;
  const tzParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(testIso));
  const offsetStr = tzParts.find(p => p.type === 'timeZoneName')?.value || 'GMT';

  let offset = '+00:00';
  if (offsetStr.includes('+')) {
    const hours = offsetStr.split('+')[1];
    offset = `+${hours.padStart(2, '0')}:00`;
  } else if (offsetStr.includes('-')) {
    const hours = offsetStr.split('-')[1];
    offset = `-${hours.padStart(2, '0')}:00`;
  }

  const startIso = new Date(`${year}-${month}-${day}T00:00:00${offset}`).toISOString();
  const endIso = new Date(`${year}-${month}-${day}T23:59:59.999${offset}`).toISOString();

  return {
    startIso,
    endIso,
    dateString: `${year}-${month}-${day}`,
    year,
    month,
    day,
    offset,
  };
}

export async function GET(request: NextRequest) {
  try {
    const dayRange = getUkDayRange();

    // 1. Fetch store settings for overrides and target
    const { data: storeSettings, error: settingsError } = await supabaseAdmin
      .from('store_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      logger.error('Error fetching store settings for sales today:', settingsError);
    }

    // 2. Fetch today's orders (excluding cancelled)
    const { data: rawOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        orderid,
        total,
        subtotal,
        deliverycost,
        status,
        createdat,
        paymentmethod,
        discountamount,
        customerid,
        customers (
          firstname,
          lastname,
          email
        ),
        order_items (
          orderitemid,
          quantity,
          price
        )
      `)
      .gte('createdat', dayRange.startIso)
      .lte('createdat', dayRange.endIso)
      .neq('status', 'cancelled')
      .order('createdat', { ascending: false });

    if (ordersError) {
      logger.error('Error fetching today orders:', ordersError);
    }

    const ordersList = (rawOrders as any[]) || [];

    // 3. Compute Real Metrics
    const realSales = ordersList.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    const realOrders = ordersList.length;
    const realItems = ordersList.reduce((sum, order) => {
      const itemsCount = (order.order_items || []).reduce(
        (iSum: number, item: any) => iSum + (parseInt(item.quantity, 10) || 1),
        0
      );
      return sum + itemsCount;
    }, 0);
    const realAov = realOrders > 0 ? realSales / realOrders : 0;

    // 4. Override configuration
    const isOverrideActive = Boolean(storeSettings?.sales_today_override_enabled);
    const overrideAmount = storeSettings?.sales_today_override_amount !== null && storeSettings?.sales_today_override_amount !== undefined
      ? parseFloat(String(storeSettings.sales_today_override_amount))
      : null;
    const overrideOrders = storeSettings?.sales_today_override_orders !== null && storeSettings?.sales_today_override_orders !== undefined
      ? parseInt(String(storeSettings.sales_today_override_orders), 10)
      : null;
    const overrideItems = storeSettings?.sales_today_override_items !== null && storeSettings?.sales_today_override_items !== undefined
      ? parseInt(String(storeSettings.sales_today_override_items), 10)
      : null;
    const overrideMode = storeSettings?.sales_today_override_mode || 'replace';
    const targetAmount = storeSettings?.sales_today_target_amount !== null && storeSettings?.sales_today_target_amount !== undefined
      ? parseFloat(String(storeSettings.sales_today_target_amount))
      : 1000;

    // 5. Compute Effective Display Metrics
    let effectiveSales = realSales;
    let effectiveOrders = realOrders;
    let effectiveItems = realItems;

    if (isOverrideActive) {
      if (overrideMode === 'add') {
        effectiveSales = realSales + (overrideAmount || 0);
        effectiveOrders = realOrders + (overrideOrders || 0);
        effectiveItems = realItems + (overrideItems || 0);
      } else {
        // replace mode
        effectiveSales = overrideAmount !== null ? overrideAmount : realSales;
        effectiveOrders = overrideOrders !== null ? overrideOrders : realOrders;
        effectiveItems = overrideItems !== null ? overrideItems : realItems;
      }
    }

    const effectiveAov = effectiveOrders > 0 ? effectiveSales / effectiveOrders : 0;
    const targetProgressPct = targetAmount > 0
      ? Math.min(100, Math.round((effectiveSales / targetAmount) * 100))
      : 0;

    // 6. Build Hourly Breakdown (00:00 to 23:00 UK time)
    const hourlyData: { hour: string; label: string; sales: number; orders: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = h.toString().padStart(2, '0');
      hourlyData.push({
        hour: hourStr,
        label: `${hourStr}:00`,
        sales: 0,
        orders: 0,
      });
    }

    // Populate with real orders
    ordersList.forEach((order) => {
      const orderDate = new Date(order.createdat);
      const ukHour = parseInt(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          hour12: false,
        }).format(orderDate),
        10
      );
      if (hourlyData[ukHour]) {
        hourlyData[ukHour].sales += parseFloat(order.total) || 0;
        hourlyData[ukHour].orders += 1;
      }
    });

    // If override is active and real sales are 0 or less than override in replace mode,
    // distribute the difference across active business hours (08:00 - 21:00) so wallboard displays realistic curves
    if (isOverrideActive && effectiveSales > realSales) {
      const diffSales = effectiveSales - realSales;
      const diffOrders = Math.max(0, effectiveOrders - realOrders);

      // Typical e-commerce daytime curve distribution weights
      const weights: Record<number, number> = {
        8: 3, 9: 6, 10: 8, 11: 10, 12: 12, 13: 11, 14: 9, 15: 8, 16: 9, 17: 10, 18: 12, 19: 14, 20: 12, 21: 8,
      };
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

      // Determine current UK hour
      const currentUkHour = parseInt(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          hour12: false,
        }).format(new Date()),
        10
      );

      // Distribute only up to current hour (or full daytime if viewing past hours)
      const eligibleHours = Object.keys(weights)
        .map(Number)
        .filter((h) => h <= Math.max(currentUkHour, 12));
      const eligibleWeight = eligibleHours.reduce((sum, h) => sum + (weights[h] || 0), 0) || totalWeight;

      eligibleHours.forEach((h) => {
        const share = (weights[h] || 1) / eligibleWeight;
        hourlyData[h].sales += Math.round(diffSales * share * 100) / 100;
      });

      // Distribute orders
      let remainingOrders = diffOrders;
      eligibleHours.forEach((h, idx) => {
        if (remainingOrders <= 0) return;
        const portion = idx === eligibleHours.length - 1 ? remainingOrders : Math.round(diffOrders * ((weights[h] || 1) / eligibleWeight));
        hourlyData[h].orders += portion;
        remainingOrders -= portion;
      });
    }

    // 7. Format Recent Orders Feed
    const formattedOrders = ordersList.map((order) => {
      const orderDate = new Date(order.createdat);
      const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
      }).format(orderDate);

      const customerName = order.customers
        ? `${order.customers.firstname || ''} ${order.customers.lastname || ''}`.trim() || order.customers.email || 'Guest Customer'
        : 'Customer';

      const itemsCount = (order.order_items || []).reduce(
        (sum: number, item: any) => sum + (parseInt(item.quantity, 10) || 1),
        0
      );

      return {
        orderId: order.orderid,
        time: timeStr,
        fullTimestamp: order.createdat,
        customerName,
        total: parseFloat(order.total) || 0,
        status: order.status,
        paymentMethod: order.paymentmethod || 'Card',
        itemsCount,
      };
    });

    // 8. Return response
    return NextResponse.json({
      success: true,
      data: {
        dateInfo: {
          ukDate: dayRange.dateString,
          timezone: 'Europe/London',
          offset: dayRange.offset,
          currentTimestamp: new Date().toISOString(),
        },
        metrics: {
          totalSales: effectiveSales,
          totalOrders: effectiveOrders,
          totalItems: effectiveItems,
          averageOrderValue: effectiveAov,
          targetAmount,
          targetProgressPct,
          targetRemaining: Math.max(0, targetAmount - effectiveSales),
        },
        realMetrics: {
          totalSales: realSales,
          totalOrders: realOrders,
          totalItems: realItems,
          averageOrderValue: realAov,
        },
        override: {
          isActive: isOverrideActive,
          amount: overrideAmount,
          orders: overrideOrders,
          items: overrideItems,
          mode: overrideMode,
        },
        hourly: hourlyData,
        recentOrders: formattedOrders,
      },
    });
  } catch (error) {
    logger.error('Failed to get sales today data:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}

// PUT /api/admin/sales/today - Quick override updates directly from the sales today dashboard
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      overrideEnabled,
      overrideAmount,
      overrideOrders,
      overrideItems,
      targetAmount,
      overrideMode,
    } = body;

    const { data: existingSettings } = await supabaseAdmin
      .from('store_settings')
      .select('storesettingsid')
      .limit(1)
      .single();

    if (!existingSettings) {
      return NextResponse.json(
        { success: false, error: 'Store settings not found' },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, any> = {
      updatedat: new Date().toISOString(),
    };

    if (overrideEnabled !== undefined) {
      updatePayload.sales_today_override_enabled = Boolean(overrideEnabled);
    }
    if (overrideAmount !== undefined) {
      updatePayload.sales_today_override_amount = overrideAmount !== null && overrideAmount !== '' ? Number(overrideAmount) : null;
    }
    if (overrideOrders !== undefined) {
      updatePayload.sales_today_override_orders = overrideOrders !== null && overrideOrders !== '' ? parseInt(String(overrideOrders), 10) : null;
    }
    if (overrideItems !== undefined) {
      updatePayload.sales_today_override_items = overrideItems !== null && overrideItems !== '' ? parseInt(String(overrideItems), 10) : null;
    }
    if (targetAmount !== undefined) {
      updatePayload.sales_today_target_amount = targetAmount !== null && targetAmount !== '' ? Number(targetAmount) : 1000;
    }
    if (overrideMode !== undefined) {
      updatePayload.sales_today_override_mode = overrideMode || 'replace';
    }

    const { data: updated, error } = await supabaseAdmin
      .from('store_settings')
      .update(updatePayload)
      .eq('storesettingsid', existingSettings.storesettingsid)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update sales today override settings:', error);
      return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
    }

    return NextResponse.json({
      success: true,
      message: 'Sales today settings updated successfully',
      settings: updated,
    });
  } catch (error) {
    logger.error('Error updating sales today settings:', error);
    return apiErrorResponse({ code: 'INTERNAL_ERROR', status: 500, error });
  }
}
