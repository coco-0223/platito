export interface PlatformConfig {
  markupPercentage: number; // e.g. 20 for 20%
  fixedFee?: number;
  platformName: string;
  tagline: string;
  ownerContactPhone: string;
  deliveryNotice: string;
  currency: string;
  defaultDeliveryFee: number;
}

export interface PricingCalculationResult {
  baseCost: number;
  markupPercentage: number;
  markupAmount: number;
  finalPrice: number;
}
