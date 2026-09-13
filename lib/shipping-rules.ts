export const DEFAULT_FREE_SHIPPING_THRESHOLD = 50.00;
export const DEFAULT_STANDARD_SHIPPING_FEE = 3.99;
export const FREE_SHIPPING_CLOSE_MARGIN = 0.25; // User is within 25% of unlocking free delivery (e.g. >= 75% of threshold)

export interface ShippingSettingsSource {
  free_delivery_threshold?: number | string | null;
  delivery_standard_price?: number | string | null;
}

export function parseShippingSettings(settings?: ShippingSettingsSource | null): {
  threshold: number;
  standardFee: number;
} {
  const thresholdRaw = settings?.free_delivery_threshold;
  const standardFeeRaw = settings?.delivery_standard_price;

  const threshold =
    thresholdRaw != null && !isNaN(Number(thresholdRaw)) && Number(thresholdRaw) >= 0
      ? Number(thresholdRaw)
      : DEFAULT_FREE_SHIPPING_THRESHOLD;

  const standardFee =
    standardFeeRaw != null && !isNaN(Number(standardFeeRaw)) && Number(standardFeeRaw) >= 0
      ? Number(standardFeeRaw)
      : DEFAULT_STANDARD_SHIPPING_FEE;

  return { threshold, standardFee };
}

export function calculateDeliveryCost(
  subtotal: number,
  settings?: ShippingSettingsSource | null
): number {
  const { threshold, standardFee } = parseShippingSettings(settings);
  if (subtotal >= threshold) {
    return 0.0;
  }
  return standardFee;
}

export interface FreeDeliveryProgress {
  threshold: number;
  standardFee: number;
  isFree: boolean;
  isClose: boolean;
  amountNeeded: number;
  progressPercent: number;
}

export function getFreeDeliveryProgress(
  subtotal: number,
  settings?: ShippingSettingsSource | null
): FreeDeliveryProgress {
  const { threshold, standardFee } = parseShippingSettings(settings);
  const currentSubtotal = Math.max(0, Number(subtotal) || 0);

  if (currentSubtotal >= threshold) {
    return {
      threshold,
      standardFee,
      isFree: true,
      isClose: false,
      amountNeeded: 0,
      progressPercent: 100,
    };
  }

  const amountNeeded = Math.max(0, threshold - currentSubtotal);
  const progressPercent =
    threshold > 0 ? Math.min(100, Math.max(0, (currentSubtotal / threshold) * 100)) : 100;
  
  // Prompt user to spend more if they are within 25% of getting it (subtotal >= 75% of threshold)
  const isClose = currentSubtotal > 0 && currentSubtotal >= threshold * (1 - FREE_SHIPPING_CLOSE_MARGIN);

  return {
    threshold,
    standardFee,
    isFree: false,
    isClose,
    amountNeeded,
    progressPercent: Math.round(progressPercent),
  };
}
