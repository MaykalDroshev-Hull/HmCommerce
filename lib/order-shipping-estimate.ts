import type { Language } from '@/lib/translations';

const SOFIA_TZ = 'Europe/Sofia';
const SAME_DAY_CUTOFF_HOUR = 13;

export interface ShippingEstimate {
  /** Order placed before 13:00 Sofia time on a weekday */
  shipsSameDay: boolean;
  /** Order was placed on Saturday or Sunday (Sofia time) */
  orderOnWeekend: boolean;
  shipDateLabel: string;
  expectedDeliveryLabel: string;
}

function getSofiaDateParts(isoDate: string): { year: number; month: number; day: number; hour: number } {
  const date = new Date(isoDate);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SOFIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
  };
}

function addCalendarDays(year: number, month: number, day: number, days: number) {
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

/** 0 = Sunday, 6 = Saturday */
function getWeekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = getWeekday(year, month, day);
  return weekday === 0 || weekday === 6;
}

function addBusinessDays(
  year: number,
  month: number,
  day: number,
  businessDays: number
): { year: number; month: number; day: number } {
  let current = { year, month, day };
  let remaining = businessDays;

  while (remaining > 0) {
    current = addCalendarDays(current.year, current.month, current.day, 1);
    if (!isWeekend(current.year, current.month, current.day)) {
      remaining -= 1;
    }
  }

  return current;
}

function nextBusinessDayAfter(year: number, month: number, day: number) {
  return addBusinessDays(year, month, day, 1);
}

function formatCalendarDate(year: number, month: number, day: number, language: Language): string {
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return utc.toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Econt-style estimate (weekdays only):
 * - Mon–Thu before 13:00 Sofia → ship same day
 * - Mon–Thu after 13:00 → next business day
 * - Fri before 13:00 → ship Friday; after 13:00 → Monday
 * - Sat/Sun → ship Monday
 * - Delivery is 1 business day after dispatch
 */
export function getShippingEstimate(orderDateIso: string, language: Language): ShippingEstimate {
  const { year, month, day, hour } = getSofiaDateParts(orderDateIso);
  const orderOnWeekend = isWeekend(year, month, day);

  let shipParts: { year: number; month: number; day: number };
  let shipsSameDay: boolean;

  if (orderOnWeekend) {
    shipParts = nextBusinessDayAfter(year, month, day);
    shipsSameDay = false;
  } else if (hour < SAME_DAY_CUTOFF_HOUR) {
    shipParts = { year, month, day };
    shipsSameDay = true;
  } else {
    shipParts = nextBusinessDayAfter(year, month, day);
    shipsSameDay = false;
  }

  const deliveryParts = addBusinessDays(shipParts.year, shipParts.month, shipParts.day, 1);

  return {
    shipsSameDay,
    orderOnWeekend,
    shipDateLabel: formatCalendarDate(shipParts.year, shipParts.month, shipParts.day, language),
    expectedDeliveryLabel: formatCalendarDate(
      deliveryParts.year,
      deliveryParts.month,
      deliveryParts.day,
      language
    ),
  };
}

export function getShippingEstimateMessage(orderDateIso: string, language?: Language): string {
  const estimate = getShippingEstimate(orderDateIso, 'en');

  if (estimate.orderOnWeekend) {
    return `Your order was received on a weekend and will be dispatched on ${estimate.shipDateLabel}. Expected delivery: ${estimate.expectedDeliveryLabel} (typically 1 business day after dispatch).`;
  }
  if (estimate.shipsSameDay) {
    return `Your order will be dispatched today (${estimate.shipDateLabel}) because it was placed before 13:00 on a business day. Expected delivery: ${estimate.expectedDeliveryLabel} (typically 1 business day).`;
  }
  return `Your order will be dispatched on ${estimate.shipDateLabel} (orders after 13:00 ship the next business day). Expected delivery: ${estimate.expectedDeliveryLabel} (typically 1 business day).`;
}
